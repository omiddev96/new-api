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
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type fakeBuyer struct {
	purchase func(key string) (*PurchaseResult, error)
	calls    int
	lastKey  string
}

func (f *fakeBuyer) Products(context.Context) (*Catalog, error) { return &Catalog{}, nil }
func (f *fakeBuyer) Balance(context.Context) (*Balance, error)  { return &Balance{}, nil }
func (f *fakeBuyer) Order(context.Context, string) (*HistoryOrder, error) {
	return &HistoryOrder{}, nil
}
func (f *fakeBuyer) Purchase(_ context.Context, key string, _ PurchaseBody) (*PurchaseResult, error) {
	f.calls++
	f.lastKey = key
	return f.purchase(key)
}

func TestMain(m *testing.M) {
	db, err := gorm.Open(sqlite.Open("file:accountshop?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		panic(err)
	}
	sqlDB.SetMaxOpenConns(1)
	model.DB = db
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled = false
	common.BatchUpdateEnabled = false
	common.QuotaPerUnit = 500000
	common.CryptoSecret = "account-shop-test-secret"
	if err := db.AutoMigrate(&model.User{}, &model.AccountShopProduct{}, &model.AccountShopOrder{}); err != nil {
		panic(err)
	}
	m.Run()
}

func TestSellPriceMarkup(t *testing.T) {
	require.Equal(t, 20.0, SellUSD("ChatGPT Plus 1 month", 10, 0))
	require.Equal(t, 40.0, SellUSD("Claude API $10", 10, 0))
	require.Equal(t, 15.0, SellUSD("Claude API $10", 10, 15))
	require.True(t, matchesSeed("ChatGPT Plus Gpay 1 month full warranty"))
	require.False(t, matchesSeed("Random gift card"))
}

func TestPurchaseSuccessDebitsOnceAndStoresCredentials(t *testing.T) {
	t.Setenv("CANBOSO_BUYER_KEY", "test-key")
	user := newShopUser(t, 2_000_000)
	product := newShopProduct(t, "account", "ChatGPT Plus", 1)
	buyer := &fakeBuyer{purchase: func(string) (*PurchaseResult, error) {
		return &PurchaseResult{
			Success: true,
			Order: struct {
				OrderCode         string `json:"orderCode"`
				Status            string `json:"status"`
				ProductName       string `json:"productName"`
				ProductType       string `json:"productType"`
				FulfillmentStatus string `json:"fulfillmentStatus"`
			}{OrderCode: "ORDER1", Status: "completed", ProductType: "account"},
			Delivery: struct {
				Accounts []DeliveryAccount `json:"accounts"`
			}{Accounts: []DeliveryAccount{{User: "a@example.com", Password: "secret-pass"}}},
		}, nil
	}}
	service := &Service{Buyer: buyer}
	order, err := service.Checkout(context.Background(), CheckoutInput{
		UserID: user.Id, ProductID: product.Id, Quantity: 1, IdempotencyKey: "idem-success-01",
	})
	require.NoError(t, err)
	require.Equal(t, model.AccountShopStatusCompleted, order.Status)
	require.Equal(t, 1, buyer.calls)
	var stored model.User
	require.NoError(t, model.DB.First(&stored, user.Id).Error)
	require.Equal(t, 1_000_000, stored.Quota)
	accounts, err := DecodeDelivery(order)
	require.NoError(t, err)
	require.Equal(t, "secret-pass", accounts[0].Password)

	again, err := service.Checkout(context.Background(), CheckoutInput{
		UserID: user.Id, ProductID: product.Id, Quantity: 1, IdempotencyKey: "idem-success-01",
	})
	require.NoError(t, err)
	require.Equal(t, order.Id, again.Id)
	require.Equal(t, 1, buyer.calls)
	require.NoError(t, model.DB.First(&stored, user.Id).Error)
	require.Equal(t, 1_000_000, stored.Quota)
}

func TestPurchaseRejectionRefundsQuota(t *testing.T) {
	t.Setenv("CANBOSO_BUYER_KEY", "test-key")
	user := newShopUser(t, 2_000_000)
	product := newShopProduct(t, "account", "Grok Plus", 2)
	buyer := &fakeBuyer{purchase: func(string) (*PurchaseResult, error) {
		return nil, &APIError{Status: http.StatusBadRequest, Code: "OUT_OF_STOCK"}
	}}
	_, err := (&Service{Buyer: buyer}).Checkout(context.Background(), CheckoutInput{
		UserID: user.Id, ProductID: product.Id, Quantity: 1, IdempotencyKey: "idem-reject-01",
	})
	require.Error(t, err)
	var stored model.User
	require.NoError(t, model.DB.First(&stored, user.Id).Error)
	require.Equal(t, 2_000_000, stored.Quota)
	var order model.AccountShopOrder
	require.NoError(t, model.DB.Where("idempotency_key = ?", "idem-reject-01").First(&order).Error)
	require.Equal(t, model.AccountShopStatusRefunded, order.Status)
}

func TestNetworkFailureRetriesSameKeyThenRefundsIfRejected(t *testing.T) {
	t.Setenv("CANBOSO_BUYER_KEY", "test-key")
	user := newShopUser(t, 2_000_000)
	product := newShopProduct(t, "account", "Gemini Plus", 1)
	calls := 0
	buyer := &fakeBuyer{purchase: func(key string) (*PurchaseResult, error) {
		calls++
		if calls == 1 {
			return nil, errors.New("connection reset")
		}
		return nil, &APIError{Status: http.StatusNotFound, Code: "ORDER_NOT_FOUND"}
	}}
	service := &Service{Buyer: buyer}
	_, err := service.Checkout(context.Background(), CheckoutInput{
		UserID: user.Id, ProductID: product.Id, Quantity: 1, IdempotencyKey: "idem-network-1",
	})
	require.Error(t, err)
	require.Equal(t, "idem-network-1", buyer.lastKey)
	require.Equal(t, 2, buyer.calls)
	var stored model.User
	require.NoError(t, model.DB.First(&stored, user.Id).Error)
	require.Equal(t, 2_000_000, stored.Quota)
}

func TestInsufficientBalanceDoesNotCreateOrder(t *testing.T) {
	t.Setenv("CANBOSO_BUYER_KEY", "test-key")
	user := newShopUser(t, 1000)
	product := newShopProduct(t, "account", "Notion Plus", 5)
	buyer := &fakeBuyer{purchase: func(string) (*PurchaseResult, error) {
		t.Fatal("supplier must not be called")
		return nil, nil
	}}
	_, err := (&Service{Buyer: buyer}).Checkout(context.Background(), CheckoutInput{
		UserID: user.Id, ProductID: product.Id, Quantity: 1, IdempotencyKey: "idem-poor-0001",
	})
	require.Error(t, err)
	var count int64
	require.NoError(t, model.DB.Model(&model.AccountShopOrder{}).Where("idempotency_key = ?", "idem-poor-0001").Count(&count).Error)
	require.Zero(t, count)
	require.Zero(t, buyer.calls)
}

func newShopUser(t *testing.T, quota int) model.User {
	t.Helper()
	user := model.User{
		Username: "shop-" + common.GetRandomString(8),
		Password: "not-used-password",
		Role:     common.RoleCommonUser,
		Status:   common.UserStatusEnabled,
		Quota:    quota,
		AffCode:  "aff-" + common.GetRandomString(8),
	}
	require.NoError(t, model.DB.Create(&user).Error)
	return user
}

func newShopProduct(t *testing.T, kind, name string, supplierUSD float64) model.AccountShopProduct {
	t.Helper()
	product := model.AccountShopProduct{
		SupplierProductId: "prod-" + common.GetRandomString(8),
		Name:              name,
		ProductType:       kind,
		SupplierPriceUSD:  supplierUSD,
		Stock:             3,
		StockKnown:        true,
		Listed:            true,
	}
	require.NoError(t, model.DB.Create(&product).Error)
	return product
}
