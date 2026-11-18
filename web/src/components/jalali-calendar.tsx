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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  isSameJalaliDay,
  jalaliDayToDate,
  jalaliMonthGrid,
  shiftJalaliMonth,
  toPersianDigits,
} from '@/lib/jalali'
import { cn } from '@/lib/utils'

type JalaliCalendarProps = {
  selected?: Date
  onSelect: (date: Date) => void
  disabled?: (date: Date) => boolean
}

export function JalaliCalendar(props: JalaliCalendarProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState<Date>(props.selected ?? new Date())
  const grid = jalaliMonthGrid(visible)
  const monthName = JALALI_MONTHS[grid.monthIndex] ?? ''
  const yearLabel = toPersianDigits(String(grid.year))
  const today = new Date()

  return (
    <div className='w-[280px] p-3' dir='rtl'>
      <div className='mb-2 flex items-center justify-between'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label={t('Previous')}
          onClick={() => setVisible(shiftJalaliMonth(visible, -1))}
        >
          <ChevronRight className='size-4' />
        </Button>
        <div className='text-sm font-medium'>
          {monthName} {yearLabel}
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label={t('Next')}
          onClick={() => setVisible(shiftJalaliMonth(visible, 1))}
        >
          <ChevronLeft className='size-4' />
        </Button>
      </div>
      <div className='text-muted-foreground grid grid-cols-7 text-center text-xs'>
        {JALALI_WEEKDAYS.map((label) => (
          <div key={label} className='py-1'>
            {label}
          </div>
        ))}
      </div>
      <div className='grid grid-cols-7'>
        {Array.from({ length: grid.offset }, (_, index) => (
          <div key={`pad-${index}`} />
        ))}
        {Array.from({ length: grid.days }, (_, index) => {
          const day = index + 1
          const date = jalaliDayToDate(grid.year, grid.monthIndex, day)
          const selected = props.selected
            ? isSameJalaliDay(date, props.selected)
            : false
          const isToday = isSameJalaliDay(date, today)
          const disabled = props.disabled?.(date) ?? false
          return (
            <Button
              key={day}
              type='button'
              variant={selected ? 'default' : 'ghost'}
              size='icon'
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${toPersianDigits(String(day))} ${monthName} ${yearLabel}`}
              className={cn(
                'size-8',
                isToday && !selected && 'border-primary border'
              )}
              onClick={() => props.onSelect(date)}
            >
              {toPersianDigits(String(day))}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
