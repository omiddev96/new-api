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
	"strings"
	"time"
	"unicode"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/shopspring/decimal"
)

// Suggested products. Sync enables a new catalog row when its name matches.
var seedNames = []string{
	"chatgpt plus gpay 1 month full warranty",
	"chatgpt go 3 months",
	"chatgpt go 1 month",
	"chatgpt business slot 1 month",
	"chatgpt pro 1 month",
	"grok plus 30 days",
	"grok plus 7 days",
	"gemini plus slot 1 month",
	"gemini ai plus upgrade 6 months",
	"notion business slot + ai 1 month",
	"notion plus 1 year",
	"claude api $10",
	"claude api $100",
	"codex astra api $10",
	"codex astra api $100",
	"grok api $10",
	"gemini api $10",
	"elevenlabs redeem 131k",
	"cursor pro api 2600 credits",
}

func normalizeName(value string) string {
	var b strings.Builder
	lastSpace := false
	for _, r := range strings.ToLower(value) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '$' || r == '+' {
			b.WriteRune(r)
			lastSpace = false
			continue
		}
		if !lastSpace && b.Len() > 0 {
			b.WriteByte(' ')
			lastSpace = true
		}
	}
	return strings.TrimSpace(b.String())
}

func matchesSeed(name string) bool {
	normalized := normalizeName(name)
	padded := " " + normalized + " "
	for _, seed := range seedNames {
		if normalized == seed || strings.Contains(padded, " "+seed+" ") {
			return true
		}
	}
	return false
}

func creditPack(name string) bool {
	folded := strings.ToLower(name)
	return strings.Contains(folded, "api") ||
		strings.Contains(folded, "redeem") ||
		strings.Contains(folded, "credit")
}

// SellUSD applies the admin override, otherwise ×4 for credit packs and ×2
// for subscriptions, slots, and upgrades.
func SellUSD(name string, supplierUSD, override float64) float64 {
	if override > 0 {
		return override
	}
	if creditPack(name) {
		return supplierUSD * 4
	}
	return supplierUSD * 2
}

func supplierUSD(product SupplierProduct, vndPerUSD float64) (float64, bool) {
	switch strings.ToUpper(strings.TrimSpace(product.Price.Currency)) {
	case "USD":
		return product.Price.Amount, product.Price.Amount > 0
	case "VND":
		if vndPerUSD <= 0 || product.Price.Amount <= 0 {
			return 0, false
		}
		return product.Price.Amount / vndPerUSD, true
	default:
		return 0, false
	}
}

func QuotaForUSD(usd float64, quantity int) (int, error) {
	if usd <= 0 || quantity <= 0 {
		return 0, common.NewMessage("The price is not available.")
	}
	amount := decimal.NewFromFloat(usd).
		Mul(decimal.NewFromInt(int64(quantity))).
		Mul(decimal.NewFromFloat(common.QuotaPerUnit))
	return common.WalletQuotaFromDecimalStrict(amount)
}

func SyncCatalog(ctx context.Context, buyer Buyer) error {
	catalog, err := buyer.Products(ctx)
	if err != nil {
		return err
	}
	now := time.Now().Unix()
	for _, product := range catalog.Products {
		usd, ok := supplierUSD(product, catalog.USDRate)
		if !ok || product.ProductID == "" {
			continue
		}
		requirements, err := common.Marshal(product.Requirements)
		if err != nil {
			requirements = []byte("{}")
		}
		stock := 0
		known := product.Availability.Available != nil
		if known {
			stock = *product.Availability.Available
		}
		row := &model.AccountShopProduct{
			SupplierProductId: product.ProductID,
			Name:              product.Name,
			ProductType:       product.ProductType,
			SupplierPriceUSD:  usd,
			Stock:             stock,
			StockKnown:        known,
			Requirements:      string(requirements),
			Description:       product.Description,
			Listed:            matchesSeed(product.Name),
			UpdatedAt:         now,
		}
		if err := model.UpsertAccountShopProduct(row); err != nil {
			return err
		}
	}
	return nil
}

func StartSync(buyer Buyer) {
	if !ShopConfigured() || buyer == nil {
		return
	}
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
			if err := SyncCatalog(ctx, buyer); err != nil {
				common.SysLog(common.LogText("account shop sync failed: %s", err.Error()))
			}
			cancel()
			<-ticker.C
		}
	}()
}
