'use client'
import { useState } from 'react'
import { apiClientPatch } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n-context'

export function BrandingForm({
  initialName, initialLogoUrl, initialColor, token: _token,
}: {
  initialName: string
  initialLogoUrl: string
  initialColor: string
  token: string
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [primaryColor, setPrimaryColor] = useState(initialColor)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiClientPatch('/api/admin/branding', { name, logoUrl: logoUrl || '', primaryColor })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError(t('admin.branding.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-foreground">{t('admin.branding.communityName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.branding.communityNamePlaceholder')}
            className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-foreground">{t('admin.branding.logoUrl')}</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://yoursite.com/logo.png"
            className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {logoUrl && (
            <div className="mt-2">
              <img src={logoUrl} alt={t('admin.branding.logoPreview')} className="h-10 w-10 rounded-lg object-cover" />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-foreground">{t('admin.branding.primaryColor')}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-border p-1"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              className="w-28 rounded-lg border border-border px-3 py-2 text-sm font-mono text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {saving ? t('admin.branding.saving') : t('admin.branding.save')}
        </button>
        {saved && <p className="text-sm text-emerald-600 font-medium">{t('admin.branding.saved')}</p>}
      </div>
    </form>
  )
}
