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
package model

import (
	"time"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

// AccountShopProduct is one supplier catalog row plus the admin allowlist.
type AccountShopProduct struct {
	Id                int     `json:"id" gorm:"primaryKey"`
	SupplierProductId string  `json:"supplier_product_id" gorm:"uniqueIndex;size:128"`
	Name              string  `json:"name" gorm:"size:255"`
	ProductType       string  `json:"product_type" gorm:"size:32"`
	SupplierPriceUSD  float64 `json:"supplier_price_usd"`
	Stock             int     `json:"stock"`
	StockKnown        bool    `json:"stock_known"`
	Requirements      string  `json:"requirements" gorm:"type:text"`
	Description       string  `json:"description" gorm:"type:text"`
	Listed            bool    `json:"listed"`
	SellPriceUSD      float64 `json:"sell_price_usd"`
	UpdatedAt         int64   `json:"updated_at"`
}

func (AccountShopProduct) TableName() string { return "account_shop_products" }

// AccountShopOrder is a wallet purchase. DeliveryCiphertext holds encrypted
// supplier credentials. Order history from the supplier does not.
type AccountShopOrder struct {
	Id                 int     `json:"id" gorm:"primaryKey"`
	UserId             int     `json:"user_id" gorm:"index"`
	ProductId          int     `json:"product_id" gorm:"index"`
	SupplierProductId  string  `json:"supplier_product_id" gorm:"size:128"`
	ProductName        string  `json:"product_name" gorm:"size:255"`
	ProductType        string  `json:"product_type" gorm:"size:32"`
	IdempotencyKey     string  `json:"idempotency_key" gorm:"uniqueIndex;size:128"`
	Quantity           int     `json:"quantity"`
	Quota              int     `json:"quota"`
	SellUSD            float64 `json:"sell_usd"`
	Status             string  `json:"status" gorm:"size:32;index"`
	SupplierOrderCode  string  `json:"supplier_order_code" gorm:"size:128"`
	SupplierStatus     string  `json:"supplier_status" gorm:"size:64"`
	CustomerEmail      string  `json:"customer_email" gorm:"size:255"`
	CustomerAccounts   string  `json:"customer_accounts" gorm:"type:text"`
	DeliveryCiphertext string  `json:"-" gorm:"type:text"`
	ErrorKey           string  `json:"error_key" gorm:"size:255"`
	CreatedAt          int64   `json:"created_at" gorm:"index"`
	UpdatedAt          int64   `json:"updated_at"`
}

func (AccountShopOrder) TableName() string { return "account_shop_orders" }

const (
	AccountShopStatusSubmitted = "submitted"
	AccountShopStatusWaiting   = "waiting"
	AccountShopStatusCompleted = "completed"
	AccountShopStatusRefunded  = "refunded"
)

func ListListedAccountShopProducts() ([]AccountShopProduct, error) {
	var rows []AccountShopProduct
	err := DB.Where("listed = ?", true).Order("name asc").Find(&rows).Error
	return rows, err
}

func ListAccountShopProducts() ([]AccountShopProduct, error) {
	var rows []AccountShopProduct
	err := DB.Order("listed desc, name asc").Find(&rows).Error
	return rows, err
}

func GetAccountShopProduct(id int) (*AccountShopProduct, error) {
	var row AccountShopProduct
	err := DB.First(&row, id).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func UpsertAccountShopProduct(row *AccountShopProduct) error {
	var existing AccountShopProduct
	err := DB.Where("supplier_product_id = ?", row.SupplierProductId).First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return DB.Create(row).Error
	}
	if err != nil {
		return err
	}
	existing.Name = row.Name
	existing.ProductType = row.ProductType
	existing.SupplierPriceUSD = row.SupplierPriceUSD
	existing.Stock = row.Stock
	existing.StockKnown = row.StockKnown
	existing.Requirements = row.Requirements
	existing.Description = row.Description
	existing.UpdatedAt = row.UpdatedAt
	return DB.Save(&existing).Error
}

func DebitAccountShopOrder(order *AccountShopOrder) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&User{}).
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

func RefundAccountShopOrder(order *AccountShopOrder, errorKey string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var current AccountShopOrder
		if err := lockForUpdate(tx).First(&current, order.Id).Error; err != nil {
			return err
		}
		if current.Status == AccountShopStatusRefunded {
			*order = current
			return nil
		}
		result := tx.Model(&User{}).
			Where("id = ?", current.UserId).
			Update("quota", gorm.Expr("quota + ?", current.Quota))
		if result.Error != nil {
			return result.Error
		}
		current.Status = AccountShopStatusRefunded
		current.ErrorKey = errorKey
		current.UpdatedAt = time.Now().Unix()
		if err := tx.Save(&current).Error; err != nil {
			return err
		}
		*order = current
		return nil
	})
}
