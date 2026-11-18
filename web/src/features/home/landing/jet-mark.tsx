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
import { JETCLOUD } from '@/brand/jetcloud'

type JetMarkProps = {
  animated?: boolean
  className?: string
  title?: string
}

/**
 * Animated twin of `public/logo.svg`. The file is the swappable asset;
 * this drawing only adds the hero pulse and trail.
 */
export function JetMark(props: JetMarkProps) {
  const title = props.title ?? JETCLOUD.name
  const motion = props.animated ? 'jet-mark-live' : ''
  return (
    <svg
      viewBox='0 0 80 80'
      className={props.className}
      role='img'
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id='jet-rim' x1='6' y1='4' x2='74' y2='76'>
          <stop offset='0' stopColor='#E9D5FF' />
          <stop offset='0.42' stopColor='#F9A8D4' />
          <stop offset='1' stopColor='#67E8F9' />
        </linearGradient>
        <linearGradient id='jet-glass' x1='10' y1='8' x2='70' y2='74'>
          <stop offset='0' stopColor='#F8F5FF' />
          <stop offset='0.55' stopColor='#F3E8FF' />
          <stop offset='1' stopColor='#E0F2FE' />
        </linearGradient>
        <linearGradient id='jet-trail' x1='8' y1='62' x2='52' y2='28'>
          <stop offset='0' stopColor='#EC4899' stopOpacity='0' />
          <stop offset='0.45' stopColor='#C084FC' />
          <stop offset='1' stopColor='#22D3EE' />
        </linearGradient>
      </defs>
      <rect x='3' y='3' width='74' height='74' rx='20' fill='url(#jet-glass)' />
      <rect
        x='3.5'
        y='3.5'
        width='73'
        height='73'
        rx='19.5'
        fill='none'
        stroke='url(#jet-rim)'
        strokeWidth='2.2'
      />
      <path
        className={motion ? 'jet-trail' : undefined}
        d='M10 58c10-3 18-12 28-20'
        fill='none'
        stroke='url(#jet-trail)'
        strokeWidth='3.2'
        strokeLinecap='round'
      />
      <g stroke='#D8B4FE' strokeWidth='1.15' strokeLinecap='round'>
        <path d='M24 30 34 22' />
        <path d='M34 22 46 20' />
        <path d='M24 30 30 40' />
        <path d='M30 40 42 36' />
        <path d='M42 36 54 28' />
        <path d='M34 22 42 36' />
        <path d='M46 20 54 28' />
        <path d='M30 40 38 50' />
        <path d='M42 36 50 46' />
        <path d='M38 50 50 46' />
      </g>
      <g className={motion ? 'jet-nodes' : undefined}>
        <circle cx='24' cy='30' r='3.3' fill='#8B5CF6' />
        <circle cx='34' cy='22' r='3.6' fill='#EC4899' />
        <circle cx='46' cy='20' r='2.8' fill='#A78BFA' />
        <circle cx='30' cy='40' r='3.4' fill='#F472B6' />
        <circle cx='42' cy='36' r='4.1' fill='#22D3EE' />
        <circle cx='54' cy='28' r='3.2' fill='#67E8F9' />
        <circle cx='38' cy='50' r='2.7' fill='#8B5CF6' />
        <circle cx='50' cy='46' r='3' fill='#EC4899' />
      </g>
      <path
        fill='#F8FAFC'
        d='M28 34 56 22c.7-.3 1.3.6.8 1.2L44 36l8 10c.3.5-.2 1.1-.8.8L28 36.5c-.6-.3-.6-1.2 0-1.5z'
      />
      <path fill='#ffffff' fillOpacity='0.55' d='M31 34.2 50 25.2 42.5 35z' />
    </svg>
  )
}
