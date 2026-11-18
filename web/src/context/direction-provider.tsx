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
import { DirectionProvider as BaseDirectionProvider } from '@base-ui/react/direction-provider'
import i18next from 'i18next'
import { createContext, useContext, useEffect, useState } from 'react'

import { directionForLanguage, toIntlLocale } from '@/i18n/languages'
import { setCookie } from '@/lib/cookies'

export type Direction = 'ltr' | 'rtl'

const DIRECTION_COOKIE_NAME = 'dir'
const DIRECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function currentLanguage(): string {
  return i18next.resolvedLanguage || i18next.language || 'fa'
}

function applyDocumentLocale(language: string, dir: Direction) {
  const html = document.documentElement
  html.setAttribute('dir', dir)
  const intl = toIntlLocale(language)
  if (intl) html.setAttribute('lang', intl)
}

type DirectionContextType = {
  defaultDir: Direction
  dir: Direction
  setDir: (dir: Direction) => void
  resetDir: () => void
}

const DirectionContext = createContext<DirectionContextType | null>(null)

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const [dir, _setDir] = useState<Direction>(() =>
    directionForLanguage(currentLanguage())
  )
  const defaultDir = directionForLanguage(currentLanguage())

  useEffect(() => {
    const apply = (language: string) => {
      const next = directionForLanguage(language)
      _setDir(next)
      setCookie(DIRECTION_COOKIE_NAME, next, DIRECTION_COOKIE_MAX_AGE)
      applyDocumentLocale(language, next)
    }
    apply(currentLanguage())
    i18next.on('languageChanged', apply)
    return () => {
      i18next.off('languageChanged', apply)
    }
  }, [])

  useEffect(() => {
    applyDocumentLocale(currentLanguage(), dir)
  }, [dir])

  const setDir = (dir: Direction) => {
    _setDir(dir)
    setCookie(DIRECTION_COOKIE_NAME, dir, DIRECTION_COOKIE_MAX_AGE)
  }

  const resetDir = () => {
    const next = directionForLanguage(currentLanguage())
    _setDir(next)
    setCookie(DIRECTION_COOKIE_NAME, next, DIRECTION_COOKIE_MAX_AGE)
  }

  return (
    <DirectionContext
      value={{
        defaultDir,
        dir,
        setDir,
        resetDir,
      }}
    >
      <BaseDirectionProvider direction={dir}>{children}</BaseDirectionProvider>
    </DirectionContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const context = useContext(DirectionContext)
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return context
}
