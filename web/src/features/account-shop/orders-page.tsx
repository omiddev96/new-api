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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { MoneyFigure } from '@/components/money-figure'
import { formatQuota } from '@/lib/format'

import { getMyShopOrders } from './api'

const statusKey: Record<string, string> = {
  submitted: 'Submitted',
  waiting: 'Waiting for the seller',
  completed: 'Completed',
  refunded: 'Refunded',
}

export function AccountShopOrdersPage() {
  const { t } = useTranslation()
  const orders = useQuery({
    queryKey: ['account-shop-orders'],
    queryFn: getMyShopOrders,
    refetchInterval: (query) => {
      const rows = query.state.data?.data ?? []
      return rows.some((row) => row.status === 'submitted' || row.status === 'waiting')
        ? 15000
        : false
    },
  })
  const rows = orders.data?.data ?? []
  return (
    <div className='mx-auto max-w-3xl px-5 py-8'>
      <h1 className='text-2xl font-bold'>{t('My orders')}</h1>
      {rows.length === 0 ? (
        <p className='text-muted-foreground mt-6'>{t('No orders yet')}</p>
      ) : (
        <div className='mt-6 space-y-4'>
          {rows.map((order) => (
            <article key={order.id} className='rounded-3xl border p-5'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <h2 className='font-semibold'>{order.product_name}</h2>
                <span className='text-sm'>{t(statusKey[order.status] || order.status)}</span>
              </div>
              <p className='mt-2 text-lg font-semibold'>
                <MoneyFigure amount={formatQuota(order.quota)} />
              </p>
              {order.error_key ? (
                <p className='mt-2 text-sm text-red-500'>{t(order.error_key)}</p>
              ) : null}
              {order.accounts?.map((account) => (
                <div key={account.user} className='mt-4 space-y-2 text-sm' dir='ltr'>
                  <div className='flex items-center justify-between gap-2'>
                    <span>{account.user}</span>
                    <CopyButton value={account.user} aria-label={t('Copy')} />
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <span>{account.password}</span>
                    <CopyButton value={account.password} aria-label={t('Copy')} />
                  </div>
                  {account.expiryText ? <p>{account.expiryText}</p> : null}
                  {account.otherInfo ? <p>{account.otherInfo}</p> : null}
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
