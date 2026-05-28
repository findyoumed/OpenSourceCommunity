// [LOG: 20260527_1033]
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { ProfileForm } from '../profile/profile-form'
import { LanguageSelect } from './language-select'
import { headers, cookies } from 'next/headers'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1645] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let lang = defaultLang
  if (token) {
    try {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      lang = profile?.language ?? defaultLang
    } catch {}
  }
  return { title: t('settings.title', lang) }
}

interface MemberProfile {
  id: string
  displayName: string
  username: string | null
  bio: string | null
  avatarUrl: string | null
  role: string
  language: string | null
  socialHandles?: Record<string, string>
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const token = session.access_token

  // [LOG: 20260528_1645] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let profile: MemberProfile | null = null
  try {
    profile = await apiGet<MemberProfile>('/api/me', token, 60)
  } catch { /* fall through */ }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Something went wrong. Please try refreshing.
      </div>
    )
  }

  const userLanguage = profile.language ?? defaultLang

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">
          {t('settings.title', userLanguage)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings.subtitle', userLanguage)}
        </p>
      </div>

      {/* ── Edit Profile ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-surface-foreground">
          {t('settings.profile.title', userLanguage)}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {t('settings.profile.desc', userLanguage)}
        </p>
        <ProfileForm
          token={token}
          initialValues={{
            displayName: profile.displayName,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            ...(profile.socialHandles ? { socialHandles: profile.socialHandles } : {}),
          }}
          lang={userLanguage}
        />
      </section>

      {/* ── Language ───────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-surface-foreground">
          {t('settings.language.title', userLanguage)}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {t('settings.language.desc', userLanguage)}
        </p>
        <LanguageSelect current={profile.language} token={token} />
      </section>

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-base font-semibold text-surface-foreground">
              {t('settings.notifications.title', userLanguage)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('settings.notifications.desc', userLanguage)}
            </p>
          </div>
          <Link
            href="/settings/notifications"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-surface-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
            {t('settings.notifications.manage', userLanguage)}
          </Link>
        </div>
      </section>

      {/* ── Account ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-surface-foreground">
          {t('settings.account.title', userLanguage)}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('settings.account.desc', userLanguage)}
        </p>
        <div className="rounded-lg bg-muted border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {t('settings.account.signedIn', userLanguage)}
          </p>
          <p className="text-sm font-medium text-surface-foreground">{session.user.email}</p>
        </div>
      </section>
    </div>
  )
}



