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

/**
 * JetCloud API console brand. The stored system name still comes from system
 * settings; only an empty value or the upstream stock name falls back here.
 */
/**
 * Swap the mark by replacing the files at these public paths.
 * `logo` is the icon used in the console. Lockups add the wordmark.
 * Favicon, Apple touch icon, PWA icons, and the social image use the same mark.
 */
export const JETCLOUD = {
  name: 'جت کلاد API',
  nameEn: 'JetCloud API',
  url: 'https://jetcloudapi.com',
  logo: '/logo.svg',
  icon: '/icon.svg',
  favicon: '/favicon.ico',
  appleTouchIcon: '/apple-touch-icon.png',
  icon192: '/icon-192.png',
  icon512: '/icon-512.png',
  ogImage: '/og-image.png',
  upstreamDefaultName: 'New API',
} as const

export function resolveDisplaySystemName(value?: string | null): string {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === JETCLOUD.upstreamDefaultName) return JETCLOUD.name
  return trimmed
}
