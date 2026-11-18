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
import i18next from 'i18next'
import { afterEach, expect, test } from 'vitest'

import { resolveDisplaySystemName } from '@/brand/jetcloud'
import { formatTimestampToDate } from '@/lib/format'
import { formatJalaliDateTime } from '@/lib/jalali'

const sample = new Date(2026, 9, 11, 15, 4, 5)

afterEach(async () => {
  await i18next.changeLanguage('en')
})

test('formats a civil date on the Jalali calendar with Persian digits', () => {
  expect(formatJalaliDateTime(sample)).toBe('۱۴۰۵/۰۷/۱۹ ۱۵:۰۴:۰۵')
})

test('formatTimestampToDate follows the active language', async () => {
  const seconds = Math.floor(sample.getTime() / 1000)
  expect(formatTimestampToDate(seconds)).toBe('2026-10-11 15:04:05')
  await i18next.changeLanguage('fa')
  expect(formatTimestampToDate(seconds)).toBe('۱۴۰۵/۰۷/۱۹ ۱۵:۰۴:۰۵')
})

test('resolveDisplaySystemName keeps a custom name and replaces the stock name', () => {
  expect(resolveDisplaySystemName('')).toBe('جت کلاد API')
  expect(resolveDisplaySystemName('New API')).toBe('جت کلاد API')
  expect(resolveDisplaySystemName('  میزبان اختصاصی  ')).toBe('میزبان اختصاصی')
})
