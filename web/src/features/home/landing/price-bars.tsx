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
import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MoneyFigure } from '@/components/money-figure'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'
import { toIntlLocale } from '@/i18n/languages'

import {
  buildPriceComparisonRows,
  formatComparisonMoney,
  type PriceComparisonRow,
} from './price-comparison'

type Money = {
  amount: (usd: number) => string
}

function useMoney(): Money {
  const { i18n } = useTranslation()
  const { status } = useStatus()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const custom =
    status?.quota_display_type === 'CUSTOM' &&
    typeof status.custom_currency_exchange_rate === 'number' &&
    status.custom_currency_exchange_rate > 0
  const symbol = status?.custom_currency_symbol
  const exchangeRate = status?.custom_currency_exchange_rate
  return {
    amount: (usd: number) =>
      formatComparisonMoney(usd, {
        locale,
        custom,
        symbol,
        exchangeRate,
      }),
  }
}

export function PriceComparison() {
  const { t } = useTranslation()
  const { models } = usePricingData()
  const money = useMoney()
  const rows = useMemo(
    () =>
      buildPriceComparisonRows(
        models.map((model) => ({
          model: model.model_name,
          modelRatio: model.model_ratio,
          completionRatio: model.completion_ratio,
          quotaType: model.quota_type,
        }))
      ),
    [models]
  )
  if (rows.length === 0) return null

  return (
    <section className='mx-auto max-w-6xl px-5 py-16 md:px-8'>
      <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-sm font-medium text-[#c4b5fd]'>
            {t('Official price vs JetCloud price')}
          </p>
          <h2 className='mt-2 text-3xl font-bold md:text-4xl'>
            {t('Pay less per million tokens')}
          </h2>
        </div>
        <p className='text-muted-foreground max-w-sm text-sm leading-7'>
          {t('Standard OpenAI API rates, short context, per 1M tokens.')}
        </p>
      </div>
      <div className='grid gap-4'>
        {rows.map((row) => (
          <PriceRow key={row.model} row={row} money={money} />
        ))}
      </div>
    </section>
  )
}

function PriceRow(props: { row: PriceComparisonRow; money: Money }) {
  const { t } = useTranslation()
  const { row, money } = props
  return (
    <article className='jet-glass rounded-3xl p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h3 className='font-semibold' dir='ltr'>
          {row.model}
        </h3>
        <span className='rounded-full bg-[#8B5CF6] px-3 py-1 text-sm font-semibold text-white'>
          {t('{{percent}}% less', { percent: row.savingsPercent })}
        </span>
      </div>
      <div className='mt-4 grid gap-4 md:grid-cols-2'>
        <BarPair
          label={t('Input')}
          official={row.officialInput}
          jet={row.jetInput}
          money={money}
        />
        <BarPair
          label={t('Output')}
          official={row.officialOutput}
          jet={row.jetOutput}
          money={money}
        />
      </div>
    </article>
  )
}

function useGrownWidth(target: number) {
  const reduced = useReducedMotion()
  const [width, setWidth] = useState(reduced ? target : 0)
  useEffect(() => {
    if (reduced) {
      setWidth(target)
      return
    }
    const frame = requestAnimationFrame(() => setWidth(target))
    return () => cancelAnimationFrame(frame)
  }, [reduced, target])
  return width
}

function BarPair(props: {
  label: string
  official: number
  jet: number
  money: Money
}) {
  const { t } = useTranslation()
  const officialWidth = useGrownWidth(100)
  const jetWidth = useGrownWidth(
    Math.max(8, Math.round((props.jet / props.official) * 100))
  )
  return (
    <div>
      <p className='text-muted-foreground mb-2 text-xs'>{props.label}</p>
      <div className='space-y-2'>
        <Bar
          width={officialWidth}
          className='bg-white/20'
          caption={t('Official')}
          value={props.money.amount(props.official)}
        />
        <Bar
          width={jetWidth}
          className='bg-gradient-to-l from-[#22D3EE] via-[#EC4899] to-[#8B5CF6]'
          caption='JetCloud'
          value={props.money.amount(props.jet)}
        />
      </div>
    </div>
  )
}

function Bar(props: {
  width: number
  className: string
  caption: string
  value: string
}) {
  const { t } = useTranslation()
  const unit = props.value.includes('تومان')
    ? t('per thousand tokens')
    : undefined
  return (
    <div>
      <div className='text-muted-foreground mb-1 flex justify-between text-xs'>
        <span>{props.caption}</span>
        <MoneyFigure amount={props.value} unit={unit} />
      </div>
      <div className='h-2.5 overflow-hidden rounded-full bg-white/10'>
        <div
          className={`jet-price-bar h-full rounded-full ${props.className}`}
          style={{ width: `${props.width}%` }}
        />
      </div>
    </div>
  )
}
