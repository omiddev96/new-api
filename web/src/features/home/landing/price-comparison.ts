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
import { formatTomanAmount, isTomanSymbol } from '@/lib/currency'

/**
 * Official rates are OpenAI Standard, short context, per 1M tokens.
 * Source: https://developers.openai.com/api/docs/pricing
 * Checked 2026-11-18. Edit this list when OpenAI changes those rates.
 * A row is shown only when both JetCloud input and output are strictly
 * cheaper than these official rates.
 */
export const OFFICIAL_OPENAI_STANDARD_USD_PER_MILLION = [
  { model: 'gpt-6.2-astra', input: 8, output: 40 },
  { model: 'gpt-6.2-sol', input: 2, output: 10 },
  { model: 'gpt-6-astra', input: 10, output: 50 },
  { model: 'gpt-6.1-sol', input: 2, output: 10 },
  { model: 'gpt-6.1-terra', input: 1, output: 5 },
  { model: 'gpt-6-sol', input: 2, output: 10 },
  { model: 'gpt-5.6-sol', input: 4, output: 20 },
  { model: 'gpt-5.6-terra', input: 2, output: 12 },
] as const

/** Fallback sell prices, USD per 1M tokens, used when /api/pricing has no row. */
export const FALLBACK_SELL_USD_PER_MILLION = [
  { model: 'gpt-6-astra', input: 28, output: 140 },
  { model: 'gpt-6.2-astra', input: 22.4, output: 112 },
  { model: 'gpt-5.6-sol', input: 14, output: 84 },
  { model: 'gpt-5.6-terra', input: 5.6, output: 33.6 },
  { model: 'gpt-6.2-sol', input: 5.6, output: 28 },
  { model: 'gpt-6.1-sol', input: 5.6, output: 28 },
  { model: 'gpt-6-sol', input: 5.6, output: 28 },
  { model: 'gpt-6.1-terra', input: 2.8, output: 14 },
] as const

export type LiveModelRatio = {
  model: string
  modelRatio: number
  completionRatio: number
  /** 0 token, 1 per request. Per-request rows are not token prices. */
  quotaType?: number
}

export type PriceComparisonRow = {
  model: string
  officialInput: number
  officialOutput: number
  jetInput: number
  jetOutput: number
  /** Conservative saving: the smaller of the input and output discounts. */
  savingsPercent: number
}

/** input $/1M = model_ratio * 2; output $/1M = input * completion_ratio. */
export function usdPerMillionFromRatio(
  modelRatio: number,
  completionRatio: number
): { input: number; output: number } | null {
  if (!Number.isFinite(modelRatio) || modelRatio <= 0) return null
  if (!Number.isFinite(completionRatio) || completionRatio <= 0) return null
  const input = modelRatio * 2
  return { input, output: input * completionRatio }
}

export function buildPriceComparisonRows(
  live: LiveModelRatio[] = []
): PriceComparisonRow[] {
  const liveByModel = new Map(live.map((item) => [item.model, item]))
  const rows: PriceComparisonRow[] = []

  for (const official of OFFICIAL_OPENAI_STANDARD_USD_PER_MILLION) {
    const fallback = FALLBACK_SELL_USD_PER_MILLION.find(
      (item) => item.model === official.model
    )
    const liveRatio = liveByModel.get(official.model)
    const livePrice =
      liveRatio && liveRatio.quotaType !== 1
        ? usdPerMillionFromRatio(liveRatio.modelRatio, liveRatio.completionRatio)
        : null
    const jetInput = livePrice?.input ?? fallback?.input
    const jetOutput = livePrice?.output ?? fallback?.output
    if (jetInput == null || jetOutput == null) continue
    if (jetInput >= official.input || jetOutput >= official.output) continue
    const inputSave = (official.input - jetInput) / official.input
    const outputSave = (official.output - jetOutput) / official.output
    rows.push({
      model: official.model,
      officialInput: official.input,
      officialOutput: official.output,
      jetInput,
      jetOutput,
      savingsPercent: Math.floor(Math.min(inputSave, outputSave) * 100),
    })
  }

  return rows
}

export function formatComparisonMoney(
  usd: number,
  options: {
    locale?: string
    custom: boolean
    symbol?: string
    exchangeRate?: number
  }
): string {
  const rate =
    options.custom &&
    typeof options.exchangeRate === 'number' &&
    options.exchangeRate > 0
      ? options.exchangeRate
      : 1
  const value = usd * rate
  if (options.custom && isTomanSymbol(options.symbol)) {
    return formatTomanAmount(value, options.symbol)
  }
  const formatted = new Intl.NumberFormat(options.locale, {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
  if (!options.custom) return `$${formatted}`
  const symbol = options.symbol?.trim()
  return symbol ? `${formatted} ${symbol}` : formatted
}
