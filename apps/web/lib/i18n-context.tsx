// [LOG: 20260527_1030]
'use client'

import React, { createContext, useContext, useState, useTransition } from 'react'
import { apiClientPatch } from '@/lib/api-client'
import { dictionary, type Locale, type DictionaryKey } from './i18n'

export { dictionary }
export type { Locale, DictionaryKey }

// ─── 1. Pure Synchronous Translation Function (Re-exported for compatibility) ──
export function t(key: DictionaryKey, lang?: string | null | undefined): string {
  const currentLang = (lang === 'ko' ? 'ko' : 'en') as Locale
  return dictionary[currentLang][key] || dictionary['en'][key] || String(key)
}

// ─── 2. React Context for Client Components ────────────────────────────────────
interface TranslationContextProps {
  lang: Locale
  t: (key: DictionaryKey) => string
  changeLanguage: (newLang: Locale) => Promise<void>
  isPending: boolean
}

const TranslationContext = createContext<TranslationContextProps | undefined>(undefined)

export function TranslationProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode
  initialLang: string | null
}) {
  const [lang, setLang] = useState<Locale>(initialLang === 'ko' ? 'ko' : 'en')
  const [isPending, startTransition] = useTransition()

  async function changeLanguage(newLang: Locale) {
    setLang(newLang)
    const apiValue = newLang === 'en' ? null : newLang
    
    // Server database update & component refresh
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          await apiClientPatch('/api/me', { language: apiValue })
        } catch (err) {
          console.error('Failed to sync language selection with server:', err)
        } finally {
          resolve()
        }
      })
    })
  }

  function translate(key: DictionaryKey): string {
    return dictionary[lang][key] || dictionary['en'][key] || String(key)
  }

  return (
    <TranslationContext.Provider value={{ lang, t: translate, changeLanguage, isPending }}>
      {children}
    </TranslationContext.Provider>
  )
}

// ─── 3. Client Hook ────────────────────────────────────────────────────────────
export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}
