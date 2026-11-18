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
import { describe, expect, test } from 'vitest'

import {
  buildPriceComparisonRows,
  formatComparisonMoney,
  usdPerMillionFromRatio,
} from '../price-comparison'

describe('price comparison', () => {
  test('hides a row when the published official rate is lower than the fallback sell price', () => {
    const rows = buildPriceComparisonRows()
    expect(rows.map((row) => row.model)).not.toContain('gpt-6-astra')
    expect(rows).toEqual([])
  })

  test('shows a live ratio only when both token prices are below the official rate', () => {
    const cheaper = buildPriceComparisonRows([
      { model: 'gpt-6.1-terra', modelRatio: 0.2, completionRatio: 4 },
    ])
    expect(cheaper).toEqual([
      {
        model: 'gpt-6.1-terra',
        officialInput: 1,
        officialOutput: 5,
        jetInput: 0.4,
        jetOutput: 1.6,
        savingsPercent: 60,
      },
    ])

    const outputStillHigher = buildPriceComparisonRows([
      { model: 'gpt-6.1-terra', modelRatio: 0.2, completionRatio: 20 },
    ])
    expect(outputStillHigher).toEqual([])
  })

  test('ignores per-request live rows and keeps the fallback filter', () => {
    const rows = buildPriceComparisonRows([
      {
        model: 'gpt-6.1-terra',
        modelRatio: 0.2,
        completionRatio: 4,
        quotaType: 1,
      },
    ])
    expect(rows).toEqual([])
  })

  test('derives dollars per million from model ratio', () => {
    expect(usdPerMillionFromRatio(14, 5)).toEqual({ input: 28, output: 140 })
    expect(usdPerMillionFromRatio(0, 5)).toBeNull()
  })

  test('formats USD, and a custom currency when an exchange rate is set', () => {
    expect(formatComparisonMoney(2.8, { custom: false, locale: 'en' })).toBe(
      '$2.8'
    )
    expect(
      formatComparisonMoney(2.8, {
        custom: true,
        locale: 'en',
        symbol: 'تومان',
        exchangeRate: 100000,
      })
    ).toBe('280,000 تومان')
  })
})
