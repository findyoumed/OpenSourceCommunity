import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
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
  if (token) {
    try {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      lang = profile?.language ?? defaultLang
    } catch {}
  }

  // [LOG: 20260528_1258] Brand Update to Study With Me
  return {
    title: `Study With Me — ${lang === 'ko' ? '오픈 소스 커뮤니티 플랫폼' : 'The open-source community platform'}`,
    description: t('landing.hero.description', lang),
    openGraph: {
      title: `Study With Me — ${lang === 'ko' ? '오픈 소스 커뮤니티 플랫폼' : 'The open-source community platform'}`,
      description: t('landing.footer.tagline', lang),
    },
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE SVG ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
      />
    </svg>
  )
}

function ForumIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  )
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m22 8-6 4 6 4V8Z" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  )
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3 3 3 0 0 0 1 2.24A3.5 3.5 0 0 0 5 15.5 3.5 3.5 0 0 0 8 19h1v2h6v-2h1a3.5 3.5 0 0 0 3-5.26A3 3 0 0 0 20 11.24 3 3 0 0 0 21 10a3 3 0 0 0-3-3V6a4 4 0 0 0-4-4h-2Z" />
      <path d="M12 2v20" />
      <path d="M8 8h0M16 8h0M9 14h0M15 14h0" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}



/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DASHBOARD COMPONENT (Hero visual)
   ═══════════════════════════════════════════════════════════════════════════ */

function HeroDashboardMockup({ lang = 'en' }: { lang?: string | null | undefined }) {
  const isKo = lang === 'ko'

  const NAV_ITEMS = isKo 
    ? ['대시보드', '포럼 게시판', '아이디어 건의', '이벤트/모임', '멤버 목록', '인텔리전스']
    : ['Dashboard', 'Forums', 'Ideas', 'Events', 'Members', 'Intelligence']

  const STATS = [
    { label: isKo ? '회원 수' : 'Members', value: '12,847', change: '+14%', color: 'text-brand', bg: 'bg-brand/5', ring: 'ring-brand/10' },
    { label: isKo ? '오늘 활성' : 'Active today', value: '1,293', change: '+8%', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    { label: isKo ? '게시글' : 'Posts', value: '847', change: '+23%', color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
    { label: isKo ? '긍정 지수' : 'Sentiment', value: '94%', change: '+2%', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
  ]

  const ACTIVITY = [
    { name: 'Sarah K.', action: isKo ? '님이 아이디어 게시' : 'posted in Ideas', time: isKo ? '2분 전' : '2m ago', avatarColor: 'bg-brand/70' },
    { name: 'Marcus T.', action: isKo ? '님이 답글 작성' : 'replied to a thread', time: isKo ? '5분 전' : '5m ago', avatarColor: 'bg-emerald-400' },
    { name: 'Aisha R.', action: isKo ? '님이 참여 신청' : 'RSVP\'d to Webinar', time: isKo ? '12분 전' : '12m ago', avatarColor: 'bg-violet-400' },
    { name: 'David L.', action: isKo ? '님이 뱃지 획득' : 'earned Top Advocate badge', time: isKo ? '18분 전' : '18m ago', avatarColor: 'bg-amber-400' },
    { name: 'Priya S.', action: isKo ? '님이 강좌 수료' : 'completed Course 3', time: isKo ? '24분 전' : '24m ago', avatarColor: 'bg-rose-400' },
  ]

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-2xl shadow-neutral-900/10 overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/80 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="ml-3 flex-1 rounded-md bg-card/80 border border-border px-3 py-1 text-xs text-muted-foreground font-mono">
          app.opensourcecommunity.io/dashboard
        </div>
      </div>

      {/* Dashboard body */}
      <div className="flex min-h-[320px]">
        {/* Sidebar */}
        <div className="hidden sm:flex w-48 flex-col border-r border-neutral-800 bg-neutral-900 p-3 gap-1">
          {/* Logo area */}
          <div className="flex items-center gap-2 px-2 py-2 mb-3">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-400 to-violet-500" />
            <span className="text-xs font-semibold text-white tracking-tight">Acme Community</span>
          </div>
          {/* Nav items */}
          {NAV_ITEMS.map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                i === 0
                  ? 'bg-brand/20 text-brand/60'
                  : i === 5
                    ? 'text-orange-300/80'
                    : 'text-muted-foreground'
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${
                i === 0 ? 'bg-brand/70' : i === 5 ? 'bg-orange-400' : 'bg-neutral-600'
              }`} />
              {item}
            </div>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
            <div className="h-5 w-5 rounded-full bg-neutral-700" />
            <span>{isKo ? '설정' : 'Settings'}</span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 bg-muted/50">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-lg ${stat.bg} ring-1 ${stat.ring} p-3`}
              >
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className={`text-lg font-bold ${stat.color} mt-0.5 leading-tight`}>{stat.value}</div>
                <div className="text-[10px] font-medium text-emerald-500 mt-0.5">{stat.change} {isKo ? '이번 주' : 'this week'}</div>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div className="rounded-lg bg-card ring-1 ring-slate-200/60 p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-surface-foreground">{isKo ? '최근 활동' : 'Recent Activity'}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{isKo ? '모두 보기' : 'View all'}</span>
            </div>
            {ACTIVITY.map((item) => (
              <div key={item.name} className="flex items-center gap-2.5 py-1.5">
                <div className={`h-6 w-6 rounded-full ${item.avatarColor} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-surface-foreground">{item.name} </span>
                  <span className="text-xs text-muted-foreground">{item.action}</span>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK INTELLIGENCE DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */

function IntelligenceMockup({ lang = 'en' }: { lang?: string | null | undefined }) {
  const isKo = lang === 'ko'

  const MENTIONS = [
    { platform: 'Reddit', badge: 'bg-orange-500/20 text-orange-300', text: isKo ? '"OpenSourceCommunity는 우리가 써본 것 중 최고입니다..."' : '"OpenSourceCommunity is the best platform we\'ve used..."', sentiment: 'positive' },
    { platform: 'Twitter/X', badge: 'bg-sky-500/20 text-sky-300', text: isKo ? '"Circle에서 @OpenSourceCommunity로 방금 이전했어요..."' : '"Just migrated from Circle to @OpenSourceCommunity..."', sentiment: 'positive' },
    { platform: 'LinkedIn', badge: 'bg-blue-500/20 text-blue-300', text: isKo ? '"커뮤니티 성장을 위한 흥미로운 접근 방식이네요..."' : '"Interesting approach to community-led growth..."', sentiment: 'neutral' },
  ]

  return (
    <div className="rounded-xl border border-neutral-700/50 bg-neutral-800/80 shadow-2xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-neutral-700/50 bg-neutral-800 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <span className="ml-2 text-[11px] font-medium text-muted-foreground">{isKo ? '소셜 인텔리전스' : 'Social Intelligence'}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Crisis alert banner */}
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-red-300">{isKo ? '위기 알림' : 'Crisis Alert'}</div>
            <div className="text-[11px] text-red-300/70">{isKo ? 'r/saas에서 부정적 신호 감지 — 2시간 내 12회 언급' : 'Negative spike detected on r/saas — 12 mentions in 2h'}</div>
          </div>
        </div>

        {/* Two-col grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sentiment gauge */}
          <div className="rounded-lg bg-neutral-700/50 p-3">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{isKo ? '전체 긍정 지수' : 'Overall Sentiment'}</div>
            {/* Arc gauge - simplified */}
            <div className="flex items-center justify-center py-2">
              <svg viewBox="0 0 100 60" className="w-24 h-14">
                {/* Background arc */}
                <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
                {/* Value arc - ~78% of 180 degrees */}
                <path d="M 10 55 A 40 40 0 0 1 82 25" fill="none" stroke="url(#sentimentGrad)" strokeWidth="8" strokeLinecap="round" />
                <defs>
                  <linearGradient id="sentimentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <text x="50" y="52" textAnchor="middle" className="fill-white text-[16px] font-bold">78%</text>
              </svg>
            </div>
            <div className="text-center text-[10px] text-emerald-400 font-medium">{isKo ? '+3% 지난주 대비' : '+3% vs last week'}</div>
          </div>

          {/* Top advocates */}
          <div className="rounded-lg bg-neutral-700/50 p-3">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{isKo ? '활동 회원 TOP' : 'Top Advocates'}</div>
            <div className="space-y-2">
              {[
                { name: '@sarah_dev', score: 94, color: 'bg-brand/70' },
                { name: '@marcos_t', score: 87, color: 'bg-violet-400' },
                { name: '@priya_eng', score: 82, color: 'bg-emerald-400' },
              ].map((adv) => (
                <div key={adv.name} className="flex items-center gap-2">
                  <div className={`h-5 w-5 rounded-full ${adv.color} flex-shrink-0`} />
                  <span className="text-[11px] text-muted-foreground/70 flex-1 truncate">{adv.name}</span>
                  <span className="text-[10px] font-semibold text-emerald-400">{adv.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent mentions */}
        <div className="rounded-lg bg-neutral-700/50 p-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{isKo ? '최근 언급된 내용' : 'Recent Mentions'}</div>
          <div className="space-y-2">
            {MENTIONS.map((mention) => (
              <div key={mention.platform} className="flex items-start gap-2">
                <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${mention.badge}`}>
                  {mention.platform}
                </span>
                <p className="text-[11px] text-muted-foreground/70 leading-tight flex-1">{mention.text}</p>
                <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full mt-1 ${
                  mention.sentiment === 'positive' ? 'bg-emerald-400' : 'bg-neutral-400'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default async function LandingPage() {
  redirect('/home')

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  // [LOG: 20260528_1645] Dynamic language fallback matching cookies or headers
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

  const isKo = userLanguage === 'ko'

  return (
    <main className="min-h-screen bg-card text-surface-foreground overflow-hidden">

      {/* ━━━ NAVBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-card/80 border-b border-border/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-brand/20">
              <span className="text-sm font-bold text-white leading-none">S</span>
            </div>
            <span className="text-base font-bold tracking-tight text-surface-foreground">
              {/* [LOG: 20260528_1258] Brand Update */}
              Study With Me
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#modules" className="hover:text-surface-foreground transition-colors">{t('landing.footer.features', userLanguage)}</Link>
            <Link href="#open-source" className="hover:text-surface-foreground transition-colors">Open Source</Link>
            <Link href="/docs" className="hover:text-surface-foreground transition-colors">{t('landing.footer.docs', userLanguage)}</Link>
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-surface-foreground hover:bg-muted hover:border-border transition-all"
            >
              {t('auth.login.submitBtn', userLanguage)}
            </Link>
            <Link
              href="https://github.com/JonJLevesque/OpenSourceCommunity"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand/20 hover:opacity-90 transition-all"
            >
              <GitHubIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('landing.hero.cta.github', userLanguage)}</span>
              <span className="sm:hidden">GitHub</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative pt-32 pb-20 lg:pb-28 lg:pt-40">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="heroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#heroGrid)" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-white" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-brand/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            <div className="lg:w-[42%] flex-shrink-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t('landing.hero.eyebrow', userLanguage)}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.08] text-surface-foreground">
                {t('landing.hero.title1', userLanguage)}{' '}
                <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                  {t('landing.hero.title2', userLanguage)}
                </span>
              </h1>

              <p className="mt-6 text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
                {t('landing.hero.description', userLanguage)}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90 hover:shadow-brand/30 transition-all"
                >
                  {t('landing.hero.cta.join', userLanguage)}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="https://github.com/JonJLevesque/OpenSourceCommunity"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-base font-semibold text-surface-foreground hover:bg-muted hover:border-border transition-all"
                >
                  <GitHubIcon className="h-5 w-5" />
                  {t('landing.hero.cta.github', userLanguage)}
                </Link>
              </div>

              <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
                {t('landing.hero.trust', userLanguage)}
              </p>
            </div>

            <div className="mt-14 lg:mt-0 lg:w-[58%]">
              <div className="relative" style={{ perspective: '2000px' }}>
                <div style={{ transform: 'rotateY(-3deg) rotateX(2deg)' }}>
                  <HeroDashboardMockup lang={userLanguage} />
                </div>
                <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-indigo-200/30 via-violet-200/20 to-transparent blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SOCIAL PROOF / STATS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-muted border-y border-border">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '11', labelKey: 'landing.stats.modules' },
              { value: '100%', labelKey: 'landing.stats.opensource' },
              { value: isKo ? '5분 만에' : 'Self-host', labelKey: 'landing.stats.selfhost' },
              { value: isKo ? '비상업적' : 'Non-commercial', labelKey: 'landing.stats.license' },
            ].map((stat) => (
              <div key={stat.labelKey}>
                <div className="text-xl sm:text-2xl font-bold text-surface-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{t(stat.labelKey as any, userLanguage)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ MODULES GRID ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="modules" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-surface-foreground">
              {t('landing.features.title', userLanguage)}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.subtitle', userLanguage)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { id: 'forums', icon: ForumIcon, iconClass: 'text-brand', bg: 'bg-brand/5' },
              { id: 'ideas', icon: LightbulbIcon, iconClass: 'text-amber-600', bg: 'bg-amber-50' },
              { id: 'events', icon: CalendarIcon, iconClass: 'text-emerald-600', bg: 'bg-emerald-50' },
              { id: 'courses', icon: BookIcon, iconClass: 'text-violet-600', bg: 'bg-violet-50' },
              { id: 'webinars', icon: VideoIcon, iconClass: 'text-rose-600', bg: 'bg-rose-50' },
              { id: 'kb', icon: DocumentIcon, iconClass: 'text-sky-600', bg: 'bg-sky-50' },
              { id: 'chat', icon: ChatIcon, iconClass: 'text-teal-600', bg: 'bg-teal-50' },
              { id: 'intel', icon: BrainIcon, iconClass: 'text-orange-500', bg: 'bg-orange-500/15', featured: true },
              { id: 'members', icon: UsersIcon, iconClass: 'text-indigo-600', bg: 'bg-indigo-50' },
              { id: 'notifications', icon: BellIcon, iconClass: 'text-pink-600', bg: 'bg-pink-50' },
              { id: 'multilingual', icon: GlobeIcon, iconClass: 'text-violet-600', bg: 'bg-violet-50' },
            ].map((f) => {
              const Icon = f.icon
              return (
                <div key={f.id} className={`group rounded-2xl border ${f.featured ? 'border-orange-400/30 bg-gradient-to-br from-orange-500/10 to-amber-500/10' : 'border-border bg-card'} p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden`}>
                  {f.featured && (
                    <div className="absolute top-3 right-3 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-500">
                      {isKo ? '주요 기능' : 'Featured'}
                    </div>
                  )}
                  <div className={`h-11 w-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`h-5.5 w-5.5 ${f.iconClass}`} />
                  </div>
                  <h3 className="text-base font-semibold text-surface-foreground mb-1.5">{t(`landing.features.${f.id}.title` as any, userLanguage)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`landing.features.${f.id}.desc` as any, userLanguage)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ━━━ SOCIAL INTELLIGENCE DEEP-DIVE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="social-intelligence" className="bg-neutral-900 text-white py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-0" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            <div className="lg:w-1/2 mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-orange-300 mb-6">
                <BrainIcon className="h-3.5 w-3.5" />
                {t('landing.intel.eyebrow', userLanguage)}
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                {isKo ? '오직 OSC에만 있는' : 'The intelligence layer'}{' '}
                <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  {isKo ? '지능형 레이어' : 'no one else has'}
                </span>
              </h2>

              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
                {t('landing.intel.description', userLanguage)}
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'landing.intel.point1',
                  'landing.intel.point2',
                  'landing.intel.point3',
                  'landing.intel.point4',
                ].map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-muted-foreground/70 leading-relaxed">{t(key as any, userLanguage)}</span>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-sm text-muted-foreground">
                {t('landing.intel.footer', userLanguage)}
              </p>
            </div>

            <div className="lg:w-1/2">
              <IntelligenceMockup lang={userLanguage} />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ OPEN SOURCE CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="open-source" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-surface-foreground">
              {t('landing.os.title', userLanguage)}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.os.subtitle', userLanguage)}
            </p>
          </div>

          <div className="mx-auto max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="ml-3 text-xs text-muted-foreground font-mono">{t('landing.os.terminal', userLanguage)}</span>
            </div>
            <div className="p-5 font-mono text-sm leading-7 overflow-x-auto">
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">git clone</span>{' '}
                <span className="text-muted-foreground/70">https://github.com/JonJLevesque/OpenSourceCommunity.git</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">cd</span>{' '}
                <span className="text-muted-foreground/70">OpenSourceCommunity</span>{' '}
                <span className="text-muted-foreground">&&</span>{' '}
                <span className="text-sky-300">pnpm install</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">npx supabase start</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">pnpm db:push</span>{' '}
                <span className="text-muted-foreground">&&</span>{' '}
                <span className="text-sky-300">pnpm db:seed</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">pnpm dev</span>
              </div>
              <div className="mt-2">
                <span className="text-muted-foreground"># {t('landing.os.ready', userLanguage)}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 max-w-sm mx-auto">
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <h3 className="text-lg font-semibold text-surface-foreground mb-2">{t('landing.os.runInstance.title', userLanguage)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {t('landing.os.runInstance.desc', userLanguage)}
              </p>
              <Link
                href="https://github.com/JonJLevesque/OpenSourceCommunity"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"
              >
                <GitHubIcon className="h-4 w-4" />
                {t('landing.os.runInstance.cta', userLanguage)}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ ROADMAP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 border-y border-border/60">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-violet-600 mb-6">
              {t('landing.roadmap.eyebrow', userLanguage)}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-surface-foreground">
              {t('landing.roadmap.title', userLanguage)}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.roadmap.subtitle', userLanguage)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'phase1', check: true },
              { id: 'phase2', check: true },
              { id: 'phase3', check: false },
              { id: 'phase4', check: false },
            ].map((p) => (
              <div key={p.id} className={`rounded-2xl border-2 ${p.check ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50' : 'border-border bg-white'} p-7 shadow-sm`}>
                <div className={`inline-flex items-center gap-1.5 rounded-full ${p.check ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-3`}>
                  {p.check && '✓'} {t(`landing.roadmap.${p.id}` as any, userLanguage)}
                </div>
                <h3 className="text-lg font-semibold text-surface-foreground mb-2">{t(`landing.roadmap.${p.id}.title` as any, userLanguage)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`landing.roadmap.${p.id}.desc` as any, userLanguage)}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="https://github.com/JonJLevesque/OpenSourceCommunity/issues?q=label%3Aroadmap"
              className="inline-flex items-center gap-2 text-brand font-semibold text-base hover:opacity-80 transition-opacity"
            >
              {t('landing.roadmap.fullCta', userLanguage)}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-28 px-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ctaGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.07" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ctaGrid)" />
          </svg>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t('landing.cta.title', userLanguage)}
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
            {t('landing.cta.description', userLanguage)}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-brand shadow-lg hover:bg-white/90 transition-all"
            >
              {t('landing.cta.joinBtn', userLanguage)}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="https://github.com/JonJLevesque/OpenSourceCommunity"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              <GitHubIcon className="h-5 w-5" />
              {t('landing.hero.cta.github', userLanguage)}
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-border bg-card py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 lg:gap-12">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white leading-none">S</span>
                </div>
                <span className="text-base font-bold tracking-tight text-surface-foreground">
                  {/* [LOG: 20260528_1258] Brand Update */}
                  Study With Me
                </span>
              </Link>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
                {t('landing.footer.tagline', userLanguage)}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('landing.footer.features', userLanguage)}</h4>
              <ul className="space-y-2.5">
                {[
                  { labelKey: 'landing.features.forums.title' },
                  { labelKey: 'landing.features.ideas.title' },
                  { labelKey: 'landing.features.events.title' },
                  { labelKey: 'landing.features.courses.title' },
                  { labelKey: 'landing.features.webinars.title' },
                  { labelKey: 'landing.features.kb.title' },
                  { labelKey: 'landing.features.chat.title' },
                  { labelKey: 'landing.features.members.title' },
                  { labelKey: 'landing.features.notifications.title' },
                  { labelKey: 'landing.features.intel.title' },
                ].map((item) => (
                  <li key={item.labelKey}>
                    <Link href="#modules" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t(item.labelKey as any, userLanguage)}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('landing.footer.developers', userLanguage)}</h4>
              <ul className="space-y-2.5">
                <li><Link href="https://github.com/JonJLevesque/OpenSourceCommunity" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">GitHub</Link></li>
                <li><Link href="/docs" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t('landing.footer.docs', userLanguage)}</Link></li>
                <li><Link href="/docs/contributing" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t('landing.footer.contributing', userLanguage)}</Link></li>
                <li><Link href="https://github.com/JonJLevesque/OpenSourceCommunity/security" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t('landing.footer.security', userLanguage)}</Link></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('landing.footer.community', userLanguage)}</h4>
              <ul className="space-y-2.5">
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Discord</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Twitter / X</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t('landing.footer.blog', userLanguage)}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('landing.footer.legal', userLanguage)}</h4>
              <ul className="space-y-2.5">
                <li><Link href="https://github.com/JonJLevesque/OpenSourceCommunity/blob/main/LICENSE" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t('landing.footer.license', userLanguage)}</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t('landing.footer.privacy', userLanguage)}</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{t('landing.footer.terms', userLanguage)}</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-14 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {/* [LOG: 20260528_1258] Brand Update */}
              &copy; {new Date().getFullYear()} Study With Me. {t('landing.footer.rights', userLanguage)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('landing.footer.released', userLanguage)}{' '}
              <Link href="https://github.com/JonJLevesque/OpenSourceCommunity/blob/main/LICENSE" className="text-brand hover:text-brand transition-colors">
                {isKo ? '비상업적 라이선스' : 'Non-commercial License'}
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

