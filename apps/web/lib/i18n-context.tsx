// [LOG: 20260527_1030]
'use client'

import React, { createContext, useContext, useState, useTransition, useEffect } from 'react'
import { apiClientPatch } from '@/lib/api-client'
import { dictionary, type Locale, type DictionaryKey } from './i18n'
import { createClient } from '@/lib/supabase/client'

export { dictionary }
export type { Locale, DictionaryKey }

// [LOG: 20260527_1731]

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

  // Detect browser language if no database preference is set
  useEffect(() => {
    if (!initialLang && typeof window !== 'undefined' && window.navigator) {
      const browserLang = window.navigator.language || (window.navigator.languages && window.navigator.languages[0])
      if (browserLang && browserLang.toLowerCase().startsWith('ko')) {
        setLang('ko')
      }
    }
  }, [initialLang])

  async function changeLanguage(newLang: Locale) {
    setLang(newLang)
    
    // [LOG: 20260528_1518] Persist user language selection in a cookie for robust SSR Edge resolution
    if (typeof window !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`
    }

    const apiValue = newLang === 'en' ? null : newLang
    
    // Server database update & component refresh (only if logged in)
    const supabase = createClient()
    const sessionRes = await supabase.auth.getSession()
    if (!sessionRes.data.session) {
      return
    }

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
