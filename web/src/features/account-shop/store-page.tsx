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
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MoneyFigure } from '@/components/money-figure'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatQuota } from '@/lib/format'
import { getLobeIcon } from '@/lib/lobe-icon'
import { useAuthStore } from '@/stores/auth-store'

import { createShopOrder, getShopCatalog, type ShopProduct } from './api'

function iconName(name: string) {
  const folded = name.toLowerCase()
  if (folded.includes('claude') || folded.includes('codex')) return 'Claude.Color'
  if (folded.includes('gemini')) return 'Gemini.Color'
  if (folded.includes('grok')) return 'Grok.Color'
  if (folded.includes('chatgpt') || folded.includes('cursor')) return 'OpenAI.Color'
  return ''
}

function serverMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message_key?: string; message?: string } } })
    ?.response?.data
  return data?.message_key || data?.message || fallback
}

export function AccountShopPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)
  const catalog = useQuery({
    queryKey: ['account-shop'],
    queryFn: getShopCatalog,
  })
  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [email, setEmail] = useState('')
  const [accounts, setAccounts] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const available = catalog.data?.data?.available
  const products = catalog.data?.data?.products ?? []

  async function buy() {
    if (!product) return
    if (!user) {
      void navigate({ to: '/sign-in', search: { redirect: '/account-shop' } })
      return
    }
    setPending(true)
    setError('')
    try {
      const result = await createShopOrder({
        product_id: product.id,
        quantity: 1,
        customer_email: email,
        customer_accounts: accounts
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        idempotency_key: crypto.randomUUID(),
      })
      if (!result.success) {
        setError(t(result.message_key || result.message || 'The purchase could not be completed.'))
        return
      }
      setProduct(null)
      void navigate({ to: '/account-shop/orders' })
    } catch (caught) {
      setError(t(serverMessage(caught, 'The purchase could not be completed.')))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='mx-auto max-w-6xl px-5 py-10'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold'>{t('AI accounts')}</h1>
          <p className='text-muted-foreground mt-2 max-w-2xl leading-7'>
            {t('Buy an AI account')}
          </p>
        </div>
        {user ? (
          <div className='flex gap-2'>
            {(user.role ?? 0) >= 10 ? (
              <Button variant='outline' render={<Link to='/account-shop/manage' />}>
                {t('Manage the account shop')}
              </Button>
            ) : null}
            <Button variant='outline' render={<Link to='/account-shop/orders' />}>
              {t('My orders')}
            </Button>
          </div>
        ) : null}
      </div>
      <p className='mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7'>
        {t(
          'Most accounts include a short warranty, often 1 to 7 days. Read the product name before you pay. A rejected supplier order returns the charge to your wallet. Delivered accounts are not refunded from the shop.'
        )}
      </p>
      {available === false ? (
        <p className='text-muted-foreground mt-8'>{t('The account shop is unavailable.')}</p>
      ) : (
        <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {products.map((item) => {
            const icon = iconName(item.name)
            return (
              <article key={item.id} className='rounded-3xl border p-5'>
                <div className='flex items-center gap-3'>
                  {icon ? getLobeIcon(icon, 28) : null}
                  <h2 className='font-semibold'>{item.name}</h2>
                </div>
                <p className='mt-4 text-2xl font-semibold'>
                  <MoneyFigure amount={formatQuota(item.sell_quota)} />
                </p>
                <p className='text-muted-foreground mt-2 text-sm'>
                  {item.stock_known
                    ? t('{{count}} in stock', { count: item.stock })
                    : t('In stock')}
                </p>
                <Button className='mt-4 rounded-full' onClick={() => setProduct(item)}>
                  {t('Buy')}
                </Button>
              </article>
            )
          })}
        </div>
      )}
      <Dialog open={product != null} onOpenChange={(open) => !open && setProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{product?.name}</DialogTitle>
            <DialogDescription>
              {t(
                'Most accounts include a short warranty, often 1 to 7 days. Read the product name before you pay. A rejected supplier order returns the charge to your wallet. Delivered accounts are not refunded from the shop.'
              )}
            </DialogDescription>
          </DialogHeader>
          {product?.product_type === 'slot' ? (
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('Email for the slot')}
              type='email'
            />
          ) : null}
          {product?.product_type === 'upgrade_account' ? (
            <textarea
              className='border-input min-h-24 w-full rounded-md border p-3 text-sm'
              value={accounts}
              onChange={(event) => setAccounts(event.target.value)}
              placeholder={t('Account ids, one per line')}
            />
          ) : null}
          {error ? <p className='text-sm text-red-500'>{error}</p> : null}
          <DialogFooter>
            <Button disabled={pending} onClick={() => void buy()}>
              {t('Place the order')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
