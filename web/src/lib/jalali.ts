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

import dayjs from '@/lib/dayjs'

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

export const JALALI_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const

export function toPersianDigits(value: string): string {
  return value.replaceAll(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit)
}

export function isPersianLanguage(language?: string | null): boolean {
  const value = language ?? i18next.resolvedLanguage ?? i18next.language
  return value === 'fa' || value?.toLowerCase().startsWith('fa-') === true
}

export function formatJalaliDate(input: Date | number): string {
  return toPersianDigits(dayjs(input).calendar('jalali').format('YYYY/MM/DD'))
}

export function formatJalaliDateTime(input: Date | number): string {
  return toPersianDigits(
    dayjs(input).calendar('jalali').format('YYYY/MM/DD HH:mm:ss')
  )
}

export function formatJalaliChartTime(
  timestampSec: number,
  granularity: 'hour' | 'day' | 'week'
): string {
  const d = dayjs(timestampSec * 1000).calendar('jalali')
  let result = toPersianDigits(d.format('MM/DD'))
  if (granularity === 'hour') {
    result += ` ${toPersianDigits(d.format('HH:mm'))}`
  } else if (granularity === 'week') {
    const weekEnd = d.add(6, 'day')
    result += ` - ${toPersianDigits(weekEnd.format('MM/DD'))}`
  }
  return result
}

/** Saturday-first offset of the first day of the Jalali month containing `date`. */
export function jalaliMonthGrid(date: Date): {
  year: number
  monthIndex: number
  days: number
  offset: number
} {
  const view = dayjs(date).calendar('jalali')
  return {
    year: view.year(),
    monthIndex: view.month(),
    days: view.daysInMonth(),
    offset: (view.startOf('month').day() + 1) % 7,
  }
}

export function shiftJalaliMonth(date: Date, amount: number): Date {
  return dayjs(date).calendar('jalali').add(amount, 'month').toDate()
}

export function jalaliDayToDate(year: number, monthIndex: number, day: number): Date {
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayText = String(day).padStart(2, '0')
  return dayjs(`${year}/${month}/${dayText}`, { jalali: true })
    .calendar('gregory')
    .toDate()
}

export function isSameJalaliDay(left: Date, right: Date): boolean {
  const a = dayjs(left).calendar('jalali')
  const b = dayjs(right).calendar('jalali')
  return a.year() === b.year() && a.month() === b.month() && a.date() === b.date()
}
