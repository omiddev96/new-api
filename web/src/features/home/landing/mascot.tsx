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
import { useTranslation } from 'react-i18next'

export function SanctionMascot() {
  const { t } = useTranslation()
  return (
    <section className='mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 md:grid-cols-[1.2fr_0.8fr] md:px-8'>
      <div>
        <h2 className='text-3xl leading-[1.45] font-bold md:text-5xl md:leading-[1.35]'>
          {t('Stop worrying about sanctions and banned accounts.')}
        </h2>
        <p className='text-muted-foreground mt-4 max-w-xl text-base leading-8'>
          {t(
            'JetCloud keeps the key on our side. Your app keeps calling models even when a personal account would have been blocked.'
          )}
        </p>
      </div>
      <div className='jet-mascot mx-auto w-full max-w-[320px]' aria-hidden='true'>
        <svg viewBox='0 0 320 280' className='h-auto w-full'>
          <defs>
            <linearGradient id='jet-visor' x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0' stopColor='#22D3EE' />
              <stop offset='0.5' stopColor='#8B5CF6' />
              <stop offset='1' stopColor='#EC4899' />
            </linearGradient>
          </defs>
          <ellipse cx='168' cy='252' rx='78' ry='12' fill='#8B5CF6' opacity='0.22' />
          <g className='jet-mascot-float'>
            <path d='M168 46v18' stroke='#22D3EE' strokeWidth='4' strokeLinecap='round' />
            <circle cx='168' cy='38' r='7' fill='#EC4899' />
            <circle cx='168' cy='108' r='52' fill='#F8F5FF' />
            <circle cx='168' cy='108' r='52' fill='none' stroke='#8B5CF6' strokeWidth='4' />
            <path d='M128 108h80a28 28 0 0 1-80 0z' fill='url(#jet-visor)' />
            <circle cx='152' cy='96' r='4' fill='#1C1233' />
            <circle cx='184' cy='96' r='4' fill='#1C1233' />
            <path d='M156 128c8 8 16 8 24 0' fill='none' stroke='#8B5CF6' strokeWidth='3' strokeLinecap='round' />
            <rect x='124' y='164' width='88' height='72' rx='28' fill='#1C1233' />
            <path d='M148 188h40l-8 16h-24z' fill='#22D3EE' />
            <g className='jet-mascot-arm'>
              <path d='M212 186c28-6 42-34 36-58' fill='none' stroke='#E9D5FF' strokeWidth='12' strokeLinecap='round' />
              <circle cx='246' cy='122' r='14' fill='#F8F5FF' stroke='#8B5CF6' strokeWidth='3' />
            </g>
            <g className='jet-chain'>
              <circle cx='58' cy='196' r='12' fill='none' stroke='#22D3EE' strokeWidth='4' />
              <circle cx='86' cy='196' r='12' fill='none' stroke='#EC4899' strokeWidth='4' />
              <g className='jet-chain-break'>
                <circle cx='118' cy='196' r='12' fill='none' stroke='#8B5CF6' strokeWidth='4' />
              </g>
            </g>
            <g className='jet-shield'>
              <path d='M250 188c22 10 34 28 34 50-20 8-34 10-48 0 0-22 8-40 14-50z' fill='#8B5CF6' />
              <path d='M258 214l10 10 18-20' fill='none' stroke='#ECFEFF' strokeWidth='4' strokeLinecap='round' />
            </g>
          </g>
        </svg>
      </div>
    </section>
  )
}
