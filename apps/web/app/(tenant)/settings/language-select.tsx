'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation, type Locale } from '@/lib/i18n-context'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
] satisfies Array<{ code: Locale; label: string }>

function normalizeLocale(value: string | null): Locale {
  return value === 'ko' ? 'ko' : 'en'
}

export function LanguageSelect({ current, token: _token }: { current: string | null; token: string }) {
  const router = useRouter()
  const { t, changeLanguage } = useTranslation()
  const [isPending, startTransition] = useTransition()
  const currentLocale = normalizeLocale(current)
  const [value, setValue] = useState<Locale>(currentLocale)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(false)
    startTransition(async () => {
      await changeLanguage(value)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={value}
        onChange={(e) => { setValue(e.target.value as Locale); setSaved(false) }}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>{lang.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || value === currentLocale}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('profile.saving') : t('profile.saveBtn')}
      </button>
      {saved && <span className="text-sm text-emerald-600 font-medium">{t('settings.notifications.saved')}</span>}
    </div>
  )
}
