/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package accountshop

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const buyerBaseURL = "https://canboso.com"

type Buyer interface {
	Products(ctx context.Context) (*Catalog, error)
	Balance(ctx context.Context) (*Balance, error)
	Purchase(ctx context.Context, idempotencyKey string, body PurchaseBody) (*PurchaseResult, error)
	Order(ctx context.Context, orderCode string) (*HistoryOrder, error)
}

type Catalog struct {
	Products []SupplierProduct
	USDRate  float64
}

type SupplierProduct struct {
	ProductID    string `json:"productId"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	ProductType  string `json:"productType"`
	Price        Price  `json:"price"`
	Availability struct {
		Available *int `json:"available"`
	} `json:"availability"`
	Requirements map[string]any `json:"purchaseRequirements"`
}

type Price struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

type Balance struct {
	BalanceUSD float64 `json:"balanceUsd"`
	USDRate    float64 `json:"usdRate"`
}

type PurchaseBody struct {
	ProductID        string   `json:"product_id"`
	Quantity         int      `json:"quantity,omitempty"`
	CustomerEmail    string   `json:"customer_email,omitempty"`
	CustomerAccounts []string `json:"customer_accounts,omitempty"`
	SlotMonths       int      `json:"slot_months,omitempty"`
}

type PurchaseResult struct {
	Success bool `json:"success"`
	Order   struct {
		OrderCode         string `json:"orderCode"`
		Status            string `json:"status"`
		ProductName       string `json:"productName"`
		ProductType       string `json:"productType"`
		FulfillmentStatus string `json:"fulfillmentStatus"`
	} `json:"order"`
	Delivery struct {
		Accounts []DeliveryAccount `json:"accounts"`
	} `json:"delivery"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

type DeliveryAccount struct {
	User        string `json:"user"`
	Password    string `json:"password"`
	VerifyEmail string `json:"verifyEmail"`
	ExpiryText  string `json:"expiryText"`
	OtherInfo   string `json:"otherInfo"`
}

type HistoryOrder struct {
	OrderCode string `json:"orderCode"`
	Status    string `json:"status"`
}

type APIError struct {
	Status     int
	Code       string
	RetryAfter time.Duration
}

func (e *APIError) Error() string {
	if e.Code != "" {
		return e.Code
	}
	return "supplier request failed"
}

func (e *APIError) Definitive() bool {
	switch e.Status {
	case http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusConflict:
		return true
	default:
		return false
	}
}

type HTTPBuyer struct {
	client *http.Client
	pace   struct {
		mu   sync.Mutex
		next map[string]time.Time
	}
}

func NewHTTPBuyer() *HTTPBuyer {
	buyer := &HTTPBuyer{client: &http.Client{Timeout: 25 * time.Second}}
	buyer.pace.next = map[string]time.Time{}
	return buyer
}

func buyerKey() string {
	return strings.TrimSpace(os.Getenv("CANBOSO_BUYER_KEY"))
}

func ShopConfigured() bool {
	return buyerKey() != ""
}

func (b *HTTPBuyer) Products(ctx context.Context) (*Catalog, error) {
	var payload struct {
		Products []SupplierProduct `json:"products"`
	}
	if err := b.get(ctx, "/api/v2/telegram-buyer/products", "catalog", 2*time.Second, &payload); err != nil {
		return nil, err
	}
	catalog := &Catalog{Products: payload.Products}
	var balance Balance
	if err := b.get(ctx, "/api/v2/telegram-buyer/balance", "catalog", 2*time.Second, &balance); err == nil {
		catalog.USDRate = balance.USDRate
	}
	return catalog, nil
}

func (b *HTTPBuyer) Balance(ctx context.Context) (*Balance, error) {
	var balance Balance
	if err := b.get(ctx, "/api/v2/telegram-buyer/balance", "catalog", 2*time.Second, &balance); err != nil {
		return nil, err
	}
	return &balance, nil
}

func (b *HTTPBuyer) Order(ctx context.Context, orderCode string) (*HistoryOrder, error) {
	var payload struct {
		Orders []HistoryOrder `json:"orders"`
	}
	path := "/api/v2/telegram-buyer/orders?orderCode=" + urlQuery(orderCode)
	if err := b.get(ctx, path, "catalog", 2*time.Second, &payload); err != nil {
		return nil, err
	}
	if len(payload.Orders) == 0 {
		return nil, &APIError{Status: http.StatusNotFound, Code: "ORDER_NOT_FOUND"}
	}
	return &payload.Orders[0], nil
}

func (b *HTTPBuyer) Purchase(ctx context.Context, idempotencyKey string, body PurchaseBody) (*PurchaseResult, error) {
	key := buyerKey()
	if key == "" {
		return nil, errors.New("shop is unavailable")
	}
	payload := struct {
		PurchaseBody
		Key string `json:"key"`
	}{PurchaseBody: body, Key: key}
	raw, err := common.Marshal(payload)
	if err != nil {
		return nil, err
	}
	if err := b.wait(ctx, "purchase", time.Second); err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, buyerBaseURL+"/api/v2/telegram-buyer/purchase", bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-buyer-key", key)
	req.Header.Set("Idempotency-Key", idempotencyKey)
	res, err := b.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode == http.StatusTooManyRequests {
		return nil, &APIError{Status: res.StatusCode, RetryAfter: retryAfter(res)}
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		apiErr := &APIError{Status: res.StatusCode}
		var parsed PurchaseResult
		if common.Unmarshal(responseBody, &parsed) == nil {
			apiErr.Code = parsed.Code
		}
		return nil, apiErr
	}
	var parsed PurchaseResult
	if err := common.Unmarshal(responseBody, &parsed); err != nil {
		return nil, err
	}
	if !parsed.Success {
		return nil, &APIError{Status: http.StatusBadRequest, Code: parsed.Code}
	}
	return &parsed, nil
}

func (b *HTTPBuyer) get(ctx context.Context, path, bucket string, gap time.Duration, dest any) error {
	key := buyerKey()
	if key == "" {
		return errors.New("shop is unavailable")
	}
	if err := b.wait(ctx, bucket, gap); err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, buyerBaseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("x-buyer-key", key)
	res, err := b.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return err
	}
	if res.StatusCode == http.StatusTooManyRequests {
		return &APIError{Status: res.StatusCode, RetryAfter: retryAfter(res)}
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return &APIError{Status: res.StatusCode}
	}
	return common.Unmarshal(body, dest)
}

func (b *HTTPBuyer) wait(ctx context.Context, bucket string, gap time.Duration) error {
	b.pace.mu.Lock()
	wait := time.Until(b.pace.next[bucket])
	b.pace.next[bucket] = time.Now().Add(gap)
	if wait > 0 {
		b.pace.next[bucket] = b.pace.next[bucket].Add(wait)
	}
	b.pace.mu.Unlock()
	if wait <= 0 {
		return nil
	}
	timer := time.NewTimer(wait)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func retryAfter(res *http.Response) time.Duration {
	seconds, err := strconv.Atoi(res.Header.Get("Retry-After"))
	if err != nil || seconds < 0 {
		return 2 * time.Second
	}
	if seconds > 30 {
		seconds = 30
	}
	return time.Duration(seconds) * time.Second
}

func urlQuery(value string) string {
	replacer := strings.NewReplacer(" ", "%20", "?", "%3F", "&", "%26", "#", "%23")
	return replacer.Replace(value)
}
