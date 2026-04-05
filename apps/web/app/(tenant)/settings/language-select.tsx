'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { apiClientPatch } from '@/lib/api-client'

const LANGUAGES = [
  { code: '', label: 'English (default)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'sv', label: 'Svenska' },
]

export function LanguageSelect({ current, token: _token }: { current: string | null; token: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(current ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(false)
    startTransition(async () => {
      await apiClientPatch('/api/me', { language: value || null })
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>{lang.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || value === (current ?? '')}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
      {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
    </div>
  )
}
