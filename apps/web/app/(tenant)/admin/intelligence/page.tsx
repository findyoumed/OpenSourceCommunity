// [LOG: 20260527_1650]
import type { Metadata } from 'next'
import Link from 'next/link'
import { Brain, Target, Bell, Search, Inbox, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
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
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    lang = profile?.language ?? defaultLang
  } catch {}
  return { title: t('admin.intelligence.title', lang) }
}

export default async function IntelligenceSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1645] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let userLanguage = defaultLang
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    userLanguage = profile?.language ?? defaultLang
  } catch {}

  const INTEL_SECTIONS = [
    {
      href: '/intelligence/inbox',
      label: t('admin.intelligence.sections.inbox.label', userLanguage),
      desc: t('admin.intelligence.sections.inbox.desc', userLanguage),
      icon: Inbox,
      accent: '#8b5cf6',
    },
    {
      href: '/intelligence/sentiment',
      label: t('admin.intelligence.sections.sentiment.label', userLanguage),
      desc: t('admin.intelligence.sections.sentiment.desc', userLanguage),
      icon: TrendingUp,
      accent: '#10b981',
    },
    {
      href: '/intelligence/competitors',
      label: t('admin.intelligence.sections.competitors.label', userLanguage),
      desc: t('admin.intelligence.sections.competitors.desc', userLanguage),
      icon: Target,
      accent: '#ef4444',
    },
    {
      href: '/intelligence/advocates',
      label: t('admin.intelligence.sections.advocates.label', userLanguage),
      desc: t('admin.intelligence.sections.advocates.desc', userLanguage),
      icon: Brain,
      accent: '#f59e0b',
    },
    {
      href: '/intelligence/alerts',
      label: t('admin.intelligence.sections.alerts.label', userLanguage),
      desc: t('admin.intelligence.sections.alerts.desc', userLanguage),
      icon: Bell,
      accent: '#0ea5e9',
    },
    {
      href: '/intelligence/keywords',
      label: t('admin.intelligence.sections.keywords.label', userLanguage),
      desc: t('admin.intelligence.sections.keywords.desc', userLanguage),
      icon: Search,
      accent: '#a855f7',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">
          {t('admin.intelligence.header', userLanguage)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.intelligence.subtitle', userLanguage)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEL_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderLeftColor: section.accent, borderLeftWidth: '3px' }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${section.accent}1a` }}
            >
              <section.icon className="h-[18px] w-[18px]" style={{ color: section.accent }} />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-foreground transition-colors group-hover:text-brand">
                {section.label}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{section.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-surface-foreground">
          {t('admin.intelligence.sources.title', userLanguage)}
        </p>
        {userLanguage === 'ko' ? (
          <p className="mt-1 text-sm text-muted-foreground">
            소셜 파이프라인 커넥터(G2, Trustpilot, Product Hunt, Reddit 등)는 백엔드 API 워커의 환경 변수를 기반으로 작동합니다. 상세 내용은 관리 환경의{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SOCIAL_PIPELINE_*</code>{' '}
            설정을 참조하십시오.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Social pipeline connectors (G2, Trustpilot, Product Hunt, Reddit, etc.) are configured via
            environment variables on the API worker. See the{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SOCIAL_PIPELINE_*</code>{' '}
            variables in your deployment environment.
          </p>
        )}
      </div>
    </div>
  )
}
