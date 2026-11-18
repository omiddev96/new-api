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
import { isTomanDisplay } from '@/lib/currency'
import { cn } from '@/lib/utils'

const NUMBER = /^([+\-−]?[\d۰-۹٬٫.,]+)\s+(.+)$/

/** Renders a toman amount with the unit quieter than the number. */
export function MoneyFigure(props: {
  amount: string
  unit?: string
  className?: string
}) {
  const match = props.amount.match(NUMBER)
  const toman = isTomanDisplay() || props.amount.includes('تومان')
  if (!toman || !match) {
    return (
      <span className={props.className}>
        {props.amount}
        {props.unit ? ` / ${props.unit}` : ''}
      </span>
    )
  }

  return (
    <span
      className={cn('inline-flex flex-wrap items-baseline gap-x-1', props.className)}
    >
      <span className='tabular-nums'>{match[1]}</span>
      <span className='text-muted-foreground text-[0.72em] font-normal'>
        {match[2]}
        {props.unit ? ` / ${props.unit}` : ''}
      </span>
    </span>
  )
}
