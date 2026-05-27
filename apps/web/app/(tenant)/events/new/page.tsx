import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { NewEventForm } from './new-event-form'
import { headers } from 'next/headers'
import { t } from '@/lib/i18n'

// [LOG: 20260527_1736]

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = prefersKorean ? 'ko' : 'en'

  return { title: t('events.new.title', defaultLang) }
}

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  // Resolve language preferences
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = prefersKorean ? 'ko' : 'en'

  let userLanguage = undefined
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', session.access_token, 60)
    userLanguage = profile?.language
  } catch {}
  const lang = userLanguage ?? defaultLang

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/events" className="hover:text-muted-foreground">
          {t('events.title', lang)}
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">{t('events.new.breadcrumbNew', lang)}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">{t('events.new.title', lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('events.new.subtitle', lang)}
        </p>
      </div>

      <NewEventForm token={session.access_token} />
    </div>
  )
}

// ─── Inline API Fetch Helper for Server Component ─────────────────────────────
async function apiGet<T>(path: string, token: string, revalidate?: number): Promise<T | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: revalidate ? { revalidate } : undefined,
    })
    if (!res.ok) return null
    const envelope = await res.json() as { data: T }
    return envelope.data
  } catch {
    return null
  }
}
