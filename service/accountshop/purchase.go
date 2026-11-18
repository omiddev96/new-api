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
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

type CheckoutInput struct {
	UserID           int
	ProductID        int
	Quantity         int
	CustomerEmail    string
	CustomerAccounts []string
	IdempotencyKey   string
	SlotMonths       int
}

type Service struct {
	Buyer Buyer
}

func (s *Service) Checkout(ctx context.Context, input CheckoutInput) (*model.AccountShopOrder, error) {
	if !ShopConfigured() {
		return nil, common.NewMessage("The account shop is unavailable.")
	}
	key := strings.TrimSpace(input.IdempotencyKey)
	if len(key) < 8 || len(key) > 128 {
		return nil, common.NewMessage("The purchase could not be started. Refresh the page and try again.")
	}
	var existing model.AccountShopOrder
	err := model.DB.Where("idempotency_key = ?", key).First(&existing).Error
	if err == nil {
		if existing.UserId != input.UserID {
			return nil, common.NewMessage("The purchase could not be started. Refresh the page and try again.")
		}
		return s.recover(ctx, &existing)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	product, err := model.GetAccountShopProduct(input.ProductID)
	if err != nil {
		return nil, common.NewMessage("That product is no longer available.")
	}
	if err := validateCheckout(product, input); err != nil {
		return nil, err
	}
	sell := SellUSD(product.Name, product.SupplierPriceUSD, product.SellPriceUSD)
	quota, err := QuotaForUSD(sell, input.Quantity)
	if err != nil {
		return nil, common.NewMessage("The price is not available.")
	}
	accounts, _ := common.Marshal(input.CustomerAccounts)
	order := &model.AccountShopOrder{
		UserId:            input.UserID,
		ProductId:         product.Id,
		SupplierProductId: product.SupplierProductId,
		ProductName:       product.Name,
		ProductType:       product.ProductType,
		IdempotencyKey:    key,
		Quantity:          input.Quantity,
		Quota:             quota,
		SellUSD:           sell * float64(input.Quantity),
		Status:            model.AccountShopStatusSubmitted,
		CustomerEmail:     strings.TrimSpace(input.CustomerEmail),
		CustomerAccounts:  string(accounts),
		CreatedAt:         time.Now().Unix(),
		UpdatedAt:         time.Now().Unix(),
	}
	if err := model.DebitAccountShopOrder(order); err != nil {
		return nil, err
	}
	return s.recover(ctx, order)
}

func validateCheckout(product *model.AccountShopProduct, input CheckoutInput) error {
	if !product.Listed || product.SupplierPriceUSD <= 0 {
		return common.NewMessage("That product is no longer available.")
	}
	if product.StockKnown && (product.Stock <= 0 || input.Quantity > product.Stock) {
		return common.NewMessage("That product is out of stock.")
	}
	if input.Quantity < 1 || input.Quantity > 5 {
		return common.NewMessage("Choose a quantity between 1 and 5.")
	}
	switch product.ProductType {
	case "slot":
		if input.Quantity != 1 || !strings.Contains(input.CustomerEmail, "@") {
			return common.NewMessage("Enter the email address that should receive the slot.")
		}
	case "upgrade_account":
		if input.Quantity != len(uniqueAccounts(input.CustomerAccounts)) {
			return common.NewMessage("Enter one account id for each upgrade.")
		}
	}
	return nil
}

func uniqueAccounts(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func debit(order *model.AccountShopOrder) error {
	return model.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&model.User{}).
			Where("id = ? AND quota >= ?", order.UserId, order.Quota).
			Update("quota", gorm.Expr("quota - ?", order.Quota))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return common.NewMessage("Your balance is not enough for this purchase.")
		}
		return tx.Create(order).Error
	})
}

func (s *Service) recover(ctx context.Context, order *model.AccountShopOrder) (*model.AccountShopOrder, error) {
	if order.Status == model.AccountShopStatusRefunded {
		if order.ErrorKey != "" {
			return nil, common.NewMessage(order.ErrorKey)
		}
		return nil, common.NewMessage("The supplier rejected the order. The charge was returned to your wallet.")
	}
	if order.Status == model.AccountShopStatusCompleted || order.Status == model.AccountShopStatusWaiting {
		return order, nil
	}
	result, err := s.purchaseWithRetry(ctx, order)
	if err != nil {
		var apiErr *APIError
		if errors.As(err, &apiErr) && apiErr.Definitive() {
			_ = model.RefundAccountShopOrder(order, "The supplier rejected the order. The charge was returned to your wallet.")
			return nil, common.NewMessage("The supplier rejected the order. The charge was returned to your wallet.")
		}
		return order, common.NewMessage("The purchase is still being confirmed. Check your orders in a moment.")
	}
	if err := savePurchase(order, result); err != nil {
		return order, common.NewMessage("The purchase is still being confirmed. Check your orders in a moment.")
	}
	return order, nil
}

func (s *Service) purchaseWithRetry(ctx context.Context, order *model.AccountShopOrder) (*PurchaseResult, error) {
	var accounts []string
	_ = common.Unmarshal([]byte(order.CustomerAccounts), &accounts)
	body := PurchaseBody{
		ProductID:        order.SupplierProductId,
		Quantity:         order.Quantity,
		CustomerEmail:    order.CustomerEmail,
		CustomerAccounts: accounts,
	}
	var last error
	for attempt := 0; attempt < 2; attempt++ {
		result, err := s.Buyer.Purchase(ctx, order.IdempotencyKey, body)
		if err == nil {
			return result, nil
		}
		last = err
		var apiErr *APIError
		if errors.As(err, &apiErr) && apiErr.Status == http.StatusTooManyRequests {
			timer := time.NewTimer(apiErr.RetryAfter)
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-timer.C:
			}
			continue
		}
		if errors.As(err, &apiErr) && apiErr.Definitive() {
			return nil, err
		}
	}
	return nil, last
}

func savePurchase(order *model.AccountShopOrder, result *PurchaseResult) error {
	raw, err := common.Marshal(result.Delivery.Accounts)
	if err != nil {
		return err
	}
	cipherText := ""
	if len(result.Delivery.Accounts) > 0 {
		cipherText, err = encryptCredentials(raw)
		if err != nil {
			return err
		}
	}
	status := model.AccountShopStatusWaiting
	supplierStatus := result.Order.Status
	if result.Order.FulfillmentStatus != "" {
		supplierStatus = result.Order.FulfillmentStatus
	}
	if result.Order.Status == "completed" && (result.Order.FulfillmentStatus == "" || result.Order.FulfillmentStatus == "completed" || result.Order.FulfillmentStatus == "invited") {
		status = model.AccountShopStatusCompleted
	}
	if result.Order.Status == "paid" || result.Order.FulfillmentStatus == "waiting_seller" {
		status = model.AccountShopStatusWaiting
	}
	order.Status = status
	order.SupplierStatus = supplierStatus
	order.SupplierOrderCode = result.Order.OrderCode
	order.DeliveryCiphertext = cipherText
	order.UpdatedAt = time.Now().Unix()
	return model.DB.Model(order).Updates(map[string]any{
		"status":              order.Status,
		"supplier_status":     order.SupplierStatus,
		"supplier_order_code": order.SupplierOrderCode,
		"delivery_ciphertext": order.DeliveryCiphertext,
		"updated_at":          order.UpdatedAt,
	}).Error
}

func RefundOrder(orderID int) error {
	var order model.AccountShopOrder
	if err := model.DB.First(&order, orderID).Error; err != nil {
		return err
	}
	return model.RefundAccountShopOrder(&order, "An administrator returned this purchase to your wallet.")
}

func (s *Service) Refresh(ctx context.Context, order *model.AccountShopOrder) (*model.AccountShopOrder, error) {
	if order.Status == model.AccountShopStatusSubmitted {
		return s.recover(ctx, order)
	}
	if order.Status != model.AccountShopStatusWaiting || order.SupplierOrderCode == "" || s.Buyer == nil {
		return order, nil
	}
	history, err := s.Buyer.Order(ctx, order.SupplierOrderCode)
	if err != nil || history.Status == "" {
		return order, nil
	}
	order.SupplierStatus = history.Status
	if history.Status == "completed" || history.Status == "invited" {
		order.Status = model.AccountShopStatusCompleted
	}
	order.UpdatedAt = time.Now().Unix()
	_ = model.DB.Model(order).Updates(map[string]any{
		"supplier_status": order.SupplierStatus,
		"status":          order.Status,
		"updated_at":      order.UpdatedAt,
	}).Error
	return order, nil
}

func DecodeDelivery(order *model.AccountShopOrder) ([]DeliveryAccount, error) {
	plain, err := decryptCredentials(order.DeliveryCiphertext)
	if err != nil || len(plain) == 0 {
		return nil, err
	}
	var accounts []DeliveryAccount
	if err := common.Unmarshal(plain, &accounts); err != nil {
		return nil, err
	}
	return accounts, nil
}
