import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { NewWebinarForm } from './new-webinar-form'
import { headers } from 'next/headers'
import { t } from '@/lib/i18n'

// [LOG: 20260527_1736]

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = prefersKorean ? 'ko' : 'en'

  return { title: t('webinars.new.title', defaultLang) }
}

export default async function NewWebinarPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  // Verify the user is an org_admin
  let isAdmin = false
  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
  } catch {
    // fall through — will redirect below
  }

  if (!isAdmin) redirect('/webinars')

  // Resolve language preferences
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = prefersKorean ? 'ko' : 'en'

  let userLanguage = undefined
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    userLanguage = profile?.language
  } catch {}
  const lang = userLanguage ?? defaultLang

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/webinars" className="hover:text-muted-foreground">
          {t('webinars.title', lang)}
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">{t('webinars.new.breadcrumbCreate', lang)}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">{t('webinars.new.title', lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('webinars.new.subtitle', lang)}
        </p>
      </div>

      <NewWebinarForm token={token} />
    </div>
  )
}
