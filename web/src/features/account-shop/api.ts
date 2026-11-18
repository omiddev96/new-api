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
import { api } from '@/lib/api'

export type ShopProduct = {
  id: number
  name: string
  product_type: 'account' | 'slot' | 'upgrade_account' | string
  stock: number
  stock_known: boolean
  sell_quota: number
  requirements: string
}

export type ShopAccount = {
  user: string
  password: string
  verifyEmail?: string
  expiryText?: string
  otherInfo?: string
}

export type ShopOrder = {
  id: number
  product_name: string
  product_type: string
  quantity: number
  quota: number
  status: string
  supplier_status: string
  error_key: string
  created_at: number
  accounts?: ShopAccount[]
}

export type AdminProduct = {
  id: number
  name: string
  product_type: string
  supplier_price_usd: number
  stock: number
  stock_known: boolean
  listed: boolean
  sell_price_usd: number
}

export async function getShopCatalog() {
  const res = await api.get('/api/account-shop/products')
  return res.data as {
    success: boolean
    data: { available: boolean; products: ShopProduct[] }
  }
}

export async function createShopOrder(body: {
  product_id: number
  quantity: number
  customer_email?: string
  customer_accounts?: string[]
  idempotency_key: string
}) {
  const res = await api.post('/api/account-shop/orders', body)
  return res.data as { success: boolean; message?: string; message_key?: string; data?: ShopOrder }
}

export async function getMyShopOrders() {
  const res = await api.get('/api/account-shop/orders')
  return res.data as { success: boolean; data: ShopOrder[] }
}

export async function getAdminShopProducts() {
  const res = await api.get('/api/account-shop/admin/products')
  return res.data as { success: boolean; data: AdminProduct[] }
}

export async function updateAdminShopProduct(
  id: number,
  body: { listed?: boolean; sell_price_usd?: number }
) {
  const res = await api.put(`/api/account-shop/admin/products/${id}`, body)
  return res.data
}

export async function getAdminShopBalance() {
  const res = await api.get('/api/account-shop/admin/balance')
  return res.data as { success: boolean; data: { available: boolean; balance_usd?: number } }
}

export async function getAdminShopOrders() {
  const res = await api.get('/api/account-shop/admin/orders')
  return res.data as { success: boolean; data: ShopOrder[] }
}

export async function refundAdminShopOrder(id: number) {
  const res = await api.post(`/api/account-shop/admin/orders/${id}/refund`)
  return res.data
}
