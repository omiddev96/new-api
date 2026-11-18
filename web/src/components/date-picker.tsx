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
import { Calendar as CalendarIcon } from 'lucide-react'
import { enUS, fr, ja, ru, vi, zhCN, zhTW } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'

import { JalaliCalendar } from '@/components/jalali-calendar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import dayjs from '@/lib/dayjs'
import { formatJalaliDate, isPersianLanguage } from '@/lib/jalali'

const calendarLocales = {
  en: enUS,
  zhCN,
  zhTW,
  fr,
  ru,
  ja,
  vi,
} as const

type DatePickerProps = {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({
  selected,
  onSelect,
  placeholder,
}: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const placeholderText = placeholder ?? t('Pick a date')
  const persian = isPersianLanguage(i18n.language)
  const calendarLocale =
    calendarLocales[i18n.language as keyof typeof calendarLocales] ?? enUS
  let selectedLabel = placeholderText
  if (selected && persian) {
    selectedLabel = formatJalaliDate(selected)
  } else if (selected) {
    selectedLabel = dayjs(selected).format('YYYY-MM-DD')
  }
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant='outline'
            data-empty={!selected}
            className='data-[empty=true]:text-muted-foreground w-[240px] justify-start text-start font-normal'
          />
        }
      >
        {selected ? selectedLabel : <span>{placeholderText}</span>}
        <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0'>
        {persian ? (
          <JalaliCalendar
            selected={selected}
            onSelect={(date) => onSelect(date)}
            disabled={(date: Date) =>
              date > new Date() || date < new Date('1900-01-01')
            }
          />
        ) : (
          <Calendar
            mode='single'
            captionLayout='dropdown'
            selected={selected}
            onSelect={onSelect}
            locale={calendarLocale}
            disabled={(date: Date) =>
              date > new Date() || date < new Date('1900-01-01')
            }
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
