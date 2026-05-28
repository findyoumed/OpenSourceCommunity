import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { ModuleKey } from '@/components/layout/sidebar'
import type { Metadata } from 'next'
import { SubNavLink } from './sub-nav-link'
import { headers, cookies } from 'next/headers'
import { t } from '@/lib/i18n'
import { resolveLocalePreference } from '@/lib/language'

// [LOG: 20260527_1736]

export async function generateMetadata(): Promise<Metadata> {
  // [LOG: 20260528_1520] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  // [LOG: 20260528_1735] Replaced old locale pattern with resolveLocalePreference

  return { title: t('intelligence.layout.title', resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })) }
}

interface TenantConfig {
  enabledModules: ModuleKey[]
}

export default async function IntelligenceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1520] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  // Resolve language preferences
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  // [LOG: 20260528_1735] Replaced old locale pattern with resolveLocalePreference

  let userLanguage = undefined
  let enabledModules: ModuleKey[] = []
  let isAdmin = false

  try {
    const [config, profile] = await Promise.all([
      apiGet<TenantConfig>('/api/tenant', token, 300),
      token ? apiGet<{ role: string; language: string | null }>('/api/me', token, 60) : null,
    ])
    enabledModules = config?.enabledModules ?? []
    isAdmin = profile?.role === 'org_admin'
    userLanguage = profile?.language
  } catch {
    // fall back to not enabled / not admin
  }

  if (!isAdmin) redirect('/home')

  const lang = userLanguage ?? resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })
  const isEnabled = enabledModules.includes('intelligence')

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">{t('intelligence.layout.title', lang)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('intelligence.layout.subtitle', lang)}
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-violet-50 text-violet-400">
            <RadarIcon />
          </div>
          <h2 className="text-lg font-semibold text-surface-foreground">
            {t('intelligence.layout.disabledTitle', lang)}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {t('intelligence.layout.disabledDesc', lang)}
          </p>
          <div className="mt-6">
            <Link
              href="/admin"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors"
            >
              {t('intelligence.layout.adminBtn', lang)}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Dynamic subnav based on localized labels
  const SUBNAV = [
    { label: t('intelligence.inbox', lang), href: '/intelligence/inbox' },
    { label: t('intelligence.sentiment', lang), href: '/intelligence/sentiment' },
    { label: t('intelligence.competitors', lang), href: '/intelligence/competitors' },
    { label: t('intelligence.advocates', lang), href: '/intelligence/advocates' },
    { label: t('intelligence.alerts', lang), href: '/intelligence/alerts' },
    { label: t('intelligence.keywords', lang), href: '/intelligence/keywords' },
  ]

  return (
    <div className="space-y-6">
      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">{t('intelligence.layout.title', lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('intelligence.layout.subtitle', lang)}
        </p>
      </div>

      {/* ── Sub-navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5">
        {SUBNAV.map((item) => (
          <SubNavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      {children}
    </div>
  )
}

function RadarIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <circle cx="12" cy="12" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1 0 10 10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a6 6 0 1 0 6 6" />
    </svg>
  )
}
