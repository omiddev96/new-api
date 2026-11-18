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
import { afterEach, describe, expect, test } from 'vitest'

import { perTokenPriceSuffix } from '@/features/pricing/lib/price'
import {
  formatBillingCurrencyFromUSD,
  formatCurrencyFromUSD,
  formatLocalCurrencyAmount,
  formatTomanAmount,
} from '@/lib/currency'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

function useToman() {
  useSystemConfigStore.getState().setConfig({
    currency: {
      ...DEFAULT_CURRENCY_CONFIG,
      quotaDisplayType: 'CUSTOM',
      customCurrencySymbol: 'تومان',
      customCurrencyExchangeRate: 280000,
    },
  })
}

afterEach(() => {
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG },
  })
})

describe('toman currency display', () => {
  test('puts the symbol after persian digits and drops whole-toman decimals', () => {
    useToman()
    expect(formatBillingCurrencyFromUSD(2.8, { digitsLarge: 4 })).toBe(
      '۷۸۴٬۰۰۰ تومان'
    )
    expect(formatCurrencyFromUSD(10)).toBe('۲٬۸۰۰٬۰۰۰ تومان')
    expect(formatLocalCurrencyAmount(784000.4)).toBe('۷۸۴٬۰۰۰ تومان')
    expect(formatTomanAmount(784000, 'تومان', false)).toBe('۷۸۴٬۰۰۰')
  })

  test('keeps up to two decimals for a fraction of one toman', () => {
    useToman()
    expect(formatBillingCurrencyFromUSD(0.000001)).toBe('۰٫۲۸ تومان')
  })

  test('leaves other custom currencies unchanged', () => {
    useSystemConfigStore.getState().setConfig({
      currency: {
        ...DEFAULT_CURRENCY_CONFIG,
        quotaDisplayType: 'CUSTOM',
        customCurrencySymbol: '€',
        customCurrencyExchangeRate: 0.9,
      },
    })
    expect(formatBillingCurrencyFromUSD(10)).toBe('€ 9')
  })

  test('labels a per-million price with a persian 1M token unit', () => {
    useToman()
    const suffix = perTokenPriceSuffix('M', (key, values) => {
      if (key === '{{unit}} tokens') return `${values?.unit} tokens`
      return key
    })
    expect(suffix).toBe('/ ۱M tokens')
  })
})
