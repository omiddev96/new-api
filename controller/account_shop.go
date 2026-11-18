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
package controller

import (
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/accountshop"
	"github.com/gin-gonic/gin"
)

var accountShop = &accountshop.Service{Buyer: accountshop.NewHTTPBuyer()}

func GetAccountShopStatus(c *gin.Context) {
	common.ApiSuccess(c, gin.H{"available": accountshop.ShopConfigured()})
}

func GetAccountShopProducts(c *gin.Context) {
	if !accountshop.ShopConfigured() {
		common.ApiSuccess(c, gin.H{"available": false, "products": []any{}})
		return
	}
	rows, err := model.ListListedAccountShopProducts()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"available": true, "products": publicProducts(rows)})
}

func CreateAccountShopOrder(c *gin.Context) {
	var input struct {
		ProductID        int      `json:"product_id"`
		Quantity         int      `json:"quantity"`
		CustomerEmail    string   `json:"customer_email"`
		CustomerAccounts []string `json:"customer_accounts"`
		IdempotencyKey   string   `json:"idempotency_key"`
		SlotMonths       int      `json:"slot_months"`
	}
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	order, err := accountShop.Checkout(c.Request.Context(), accountshop.CheckoutInput{
		UserID:           c.GetInt("id"),
		ProductID:        input.ProductID,
		Quantity:         input.Quantity,
		CustomerEmail:    input.CustomerEmail,
		CustomerAccounts: input.CustomerAccounts,
		IdempotencyKey:   input.IdempotencyKey,
		SlotMonths:       input.SlotMonths,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, presentOrder(order, true))
}

func ListMyAccountShopOrders(c *gin.Context) {
	var rows []model.AccountShopOrder
	err := model.DB.Where("user_id = ?", c.GetInt("id")).Order("id desc").Limit(50).Find(&rows).Error
	if err != nil {
		common.ApiError(c, err)
		return
	}
	out := make([]gin.H, 0, len(rows))
	for i := range rows {
		refreshed, _ := accountShop.Refresh(c.Request.Context(), &rows[i])
		out = append(out, presentOrder(refreshed, true))
	}
	common.ApiSuccess(c, out)
}

func GetMyAccountShopOrder(c *gin.Context) {
	order, err := loadOwnOrder(c)
	if err != nil {
		common.ApiErrorT(c, "The order was not found.")
		return
	}
	refreshed, err := accountShop.Refresh(c.Request.Context(), order)
	if err != nil && refreshed == nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, presentOrder(refreshed, true))
}

func AdminListAccountShopProducts(c *gin.Context) {
	rows, err := model.ListAccountShopProducts()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, rows)
}

func AdminUpdateAccountShopProduct(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	product, err := model.GetAccountShopProduct(id)
	if err != nil {
		common.ApiErrorT(c, "That product is no longer available.")
		return
	}
	var input struct {
		Listed       *bool    `json:"listed"`
		SellPriceUSD *float64 `json:"sell_price_usd"`
	}
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	if input.Listed != nil {
		product.Listed = *input.Listed
	}
	if input.SellPriceUSD != nil {
		product.SellPriceUSD = *input.SellPriceUSD
	}
	product.UpdatedAt = time.Now().Unix()
	if err := model.DB.Save(product).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, product)
}

func AdminAccountShopBalance(c *gin.Context) {
	if !accountshop.ShopConfigured() {
		common.ApiSuccess(c, gin.H{"available": false})
		return
	}
	balance, err := accountShop.Buyer.Balance(c.Request.Context())
	if err != nil {
		common.ApiErrorT(c, "The supplier balance could not be loaded.")
		return
	}
	common.ApiSuccess(c, gin.H{"available": true, "balance_usd": balance.BalanceUSD})
}

func AdminListAccountShopOrders(c *gin.Context) {
	var rows []model.AccountShopOrder
	if err := model.DB.Order("id desc").Limit(100).Find(&rows).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	out := make([]gin.H, 0, len(rows))
	for i := range rows {
		out = append(out, presentOrder(&rows[i], false))
	}
	common.ApiSuccess(c, out)
}

func AdminRefundAccountShopOrder(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := accountshop.RefundOrder(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccessT(c, "The charge was returned to the wallet.", nil)
}

func loadOwnOrder(c *gin.Context) (*model.AccountShopOrder, error) {
	id, _ := strconv.Atoi(c.Param("id"))
	var order model.AccountShopOrder
	err := model.DB.Where("id = ? AND user_id = ?", id, c.GetInt("id")).First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func publicProducts(rows []model.AccountShopProduct) []gin.H {
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		if row.StockKnown && row.Stock <= 0 {
			continue
		}
		sell := accountshop.SellUSD(row.Name, row.SupplierPriceUSD, row.SellPriceUSD)
		quota, err := accountshop.QuotaForUSD(sell, 1)
		if err != nil {
			continue
		}
		out = append(out, gin.H{
			"id":           row.Id,
			"name":         row.Name,
			"product_type": row.ProductType,
			"stock":        row.Stock,
			"stock_known":  row.StockKnown,
			"sell_quota":   quota,
			"requirements": row.Requirements,
		})
	}
	return out
}

func presentOrder(order *model.AccountShopOrder, includeSecrets bool) gin.H {
	body := gin.H{
		"id":              order.Id,
		"product_name":    order.ProductName,
		"product_type":    order.ProductType,
		"quantity":        order.Quantity,
		"quota":           order.Quota,
		"status":          order.Status,
		"supplier_status": order.SupplierStatus,
		"error_key":       order.ErrorKey,
		"created_at":      order.CreatedAt,
	}
	if includeSecrets && order.UserId > 0 {
		accounts, err := accountshop.DecodeDelivery(order)
		if err == nil {
			body["accounts"] = accounts
		}
	}
	return body
}
