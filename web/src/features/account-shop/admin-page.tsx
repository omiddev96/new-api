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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  getAdminShopBalance,
  getAdminShopOrders,
  getAdminShopProducts,
  refundAdminShopOrder,
  updateAdminShopProduct,
} from './api'

export function AccountShopAdminPage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const products = useQuery({
    queryKey: ['account-shop-admin-products'],
    queryFn: getAdminShopProducts,
  })
  const balance = useQuery({
    queryKey: ['account-shop-admin-balance'],
    queryFn: getAdminShopBalance,
  })
  const orders = useQuery({
    queryKey: ['account-shop-admin-orders'],
    queryFn: getAdminShopOrders,
  })
  const [prices, setPrices] = useState<Record<number, string>>({})

  return (
    <div className='mx-auto max-w-5xl px-5 py-8'>
      <h1 className='text-2xl font-bold'>{t('Manage the account shop')}</h1>
      <p className='mt-3 text-sm'>
        {t('Supplier balance')}:{' '}
        {balance.data?.data?.available
          ? `$${balance.data.data.balance_usd ?? 0}`
          : t('The account shop is unavailable.')}
      </p>
      <div className='mt-6 space-y-3'>
        {(products.data?.data ?? []).map((product) => (
          <div key={product.id} className='flex flex-wrap items-center gap-3 rounded-2xl border p-3'>
            <div className='min-w-48 flex-1'>
              <p className='font-medium'>{product.name}</p>
              <p className='text-muted-foreground text-xs'>
                ${product.supplier_price_usd} · {product.product_type}
                {product.stock_known ? ` · ${product.stock}` : ''}
              </p>
            </div>
            <Button
              variant={product.listed ? 'default' : 'outline'}
              onClick={() =>
                void updateAdminShopProduct(product.id, { listed: !product.listed }).then(() =>
                  client.invalidateQueries({ queryKey: ['account-shop-admin-products'] })
                )
              }
            >
              {t('Listed')}
            </Button>
            <Input
              className='w-28'
              value={prices[product.id] ?? String(product.sell_price_usd || '')}
              placeholder={t('Sell price USD')}
              onChange={(event) =>
                setPrices((current) => ({ ...current, [product.id]: event.target.value }))
              }
            />
            <Button
              variant='outline'
              onClick={() => {
                const value = Number(prices[product.id] ?? product.sell_price_usd)
                void updateAdminShopProduct(product.id, {
                  sell_price_usd: Number.isFinite(value) ? value : 0,
                }).then(() =>
                  client.invalidateQueries({ queryKey: ['account-shop-admin-products'] })
                )
              }}
            >
              {t('Save')}
            </Button>
          </div>
        ))}
      </div>
      <h2 className='mt-10 text-xl font-semibold'>{t('My orders')}</h2>
      <div className='mt-4 space-y-3'>
        {(orders.data?.data ?? []).map((order) => (
          <div key={order.id} className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3'>
            <div>
              <p className='font-medium'>{order.product_name}</p>
              <p className='text-muted-foreground text-xs'>{order.status}</p>
            </div>
            {order.status !== 'refunded' ? (
              <Button
                variant='outline'
                onClick={() =>
                  void refundAdminShopOrder(order.id).then(() =>
                    client.invalidateQueries({ queryKey: ['account-shop-admin-orders'] })
                  )
                }
              >
                {t('Refund')}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
