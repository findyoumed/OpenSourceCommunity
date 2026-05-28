import type { Locale } from './i18n'

export type { Locale }

export function normalizeLocale(value: string | null | undefined): Locale | null {
  return value === 'ko' || value === 'en' ? value : null
}

export function resolveLocalePreference({
  profileLanguage,
  cookieLanguage,
  acceptLanguage,
}: {
  profileLanguage?: string | null | undefined
  cookieLanguage?: string | null | undefined
  acceptLanguage?: string | null | undefined
}): Locale {
  // [LOG: 20260528_1725] Prioritize explicit user-selected cookieLanguage over profileLanguage to ensure real-time language toggling works beautifully
  const cookieLocale = normalizeLocale(cookieLanguage)
  if (cookieLocale) return cookieLocale

  const profileLocale = normalizeLocale(profileLanguage)
  if (profileLocale) return profileLocale

  return acceptLanguage?.toLowerCase().includes('ko') ? 'ko' : 'en'
}
