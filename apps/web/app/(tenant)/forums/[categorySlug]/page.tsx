import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { t } from '@/lib/i18n'

// [LOG: 20260527_1736]

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForumCategory {
  id: string
  slug: string
  name: string
  description: string | null
}

interface Thread {
  id: string
  title: string
  authorName: string
  authorAvatarUrl: string | null
  replyCount: number
  viewCount: number
  isAnswered: boolean
  isPinned: boolean
  lastActivityAt: string | null
  createdAt: string
}

type SortOption = 'newest' | 'active'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}): Promise<Metadata> {
  const { categorySlug } = await params
  return { title: `Forums — ${categorySlug}` }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const isKo = lang === 'ko'
  if (mins < 1) return isKo ? '방금 전' : 'just now'
  if (mins < 60) return isKo ? `${mins}분 전` : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return isKo ? `${hrs}시간 전` : `${hrs}h ago`
  return isKo ? `${Math.floor(hrs / 24)}일 전` : `${Math.floor(hrs / 24)}d ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ sort?: string }>
}) {
  const { categorySlug } = await params
  const { sort = 'newest' } = await searchParams
  const sortOption = (['newest', 'active'] as const).includes(sort as SortOption)
    ? (sort as SortOption)
    : 'newest'

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // Resolve language preferences
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = prefersKorean ? 'ko' : 'en'

  let userLanguage = undefined
  try {
    if (token) {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      userLanguage = profile?.language
    }
  } catch {}
  const lang = userLanguage ?? defaultLang

  // Resolve category by slug from the list endpoint
  let category: ForumCategory | null = null
  let threads: Thread[] = []

  try {
    const categories = await apiGet<ForumCategory[]>('/api/forums/categories', token)
    category = categories.find((c) => c.slug === categorySlug) ?? null
  } catch {
    notFound()
  }

  if (!category) notFound()

  try {
    threads = await apiGet<Thread[]>(
      `/api/forums/threads?categoryId=${category.id}&sort=${sortOption}`,
      token,
    )
  } catch {
    // threads stays empty — show empty state
  }

  const sortLabels: Record<SortOption, string> = {
    newest: t('forums.category.sortNewest', lang),
    active: t('forums.category.sortActive', lang),
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forums" className="hover:text-muted-foreground">{t('nav.forums', lang)}</Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">{category.name}</span>
      </nav>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">{category.name}</h1>
          {category.description && (
            <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
        <Link
          href={`/forums/${categorySlug}/new`}
          className="flex-shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          {t('forums.category.newThreadBtn', lang)}
        </Link>
      </div>

      {/* ── Sort controls ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(['newest', 'active'] as const).map((s) => (
          <Link
            key={s}
            href={`/forums/${categorySlug}?sort=${s}`}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortOption === s
                ? 'bg-brand text-white'
                : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {sortLabels[s]}
          </Link>
        ))}
      </div>

      {/* ── Thread list ───────────────────────────────────────────────────── */}
      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t('forums.category.emptyTitle', lang)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('forums.category.emptyDesc', lang)}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                categorySlug={categorySlug}
                lang={lang}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  categorySlug,
  lang,
}: {
  thread: Thread
  categorySlug: string
  lang: string
}) {
  return (
    <li>
      <Link
        href={`/forums/${categorySlug}/${thread.id}`}
        className="flex items-start gap-4 px-6 py-4 hover:bg-muted transition-colors"
      >
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {thread.authorAvatarUrl ? (
            <img
              src={thread.authorAvatarUrl}
              alt={thread.authorName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {thread.authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {thread.isPinned && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {t('forums.category.cardPinned', lang)}
              </span>
            )}
            {thread.isAnswered && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                {t('forums.category.cardAnswered', lang)}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-surface-foreground line-clamp-1">
            {thread.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('forums.category.by', lang)} {thread.authorName} &middot; {timeAgo(thread.createdAt, lang)}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden flex-shrink-0 text-right text-xs text-muted-foreground sm:block">
          <p className="font-semibold text-surface-foreground">{thread.replyCount} {t('forums.category.cardReplies', lang)}</p>
          <p>{thread.viewCount.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')} {t('forums.category.cardViews', lang)}</p>
          {thread.lastActivityAt && (
            <p className="text-muted-foreground">
              {t('forums.category.cardActive', lang)} {timeAgo(thread.lastActivityAt, lang)}
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}
