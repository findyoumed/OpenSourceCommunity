// [LOG: 20260528_1436] Import ForumListWithSearch
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { t } from '@/lib/i18n'
import { headers, cookies } from 'next/headers'
import ForumListWithSearch from './forum-list-with-search'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  let lang = 'en'
  if (token) {
    try {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      lang = profile?.language ?? 'en'
    } catch {}
  }
  return { title: t('nav.forums', lang) }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForumCategory {
  id: string
  slug: string
  name: string
  description: string
  threadCount: number
  postCount: number
  lastActivityAt: string | null
  lastThread?: {
    id: string
    title: string
    authorName: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null, lang: string = 'en'): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ForumsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1520] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  // Resolve language preferences
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let categories: ForumCategory[] = []
  let fetchError = false
  let userLanguage = undefined

  try {
    // [LOG: 20260527_1701]
    if (token) {
      const [cats, profile] = await Promise.all([
        apiGet<ForumCategory[]>('/api/forums/categories', token),
        apiGet<{ language: string | null }>('/api/me', token, 60)
      ])
      categories = cats
      userLanguage = profile?.language
    } else {
      categories = await apiGet<ForumCategory[]>('/api/forums/categories', undefined)
    }
  } catch {
    fetchError = true
  }

  const resolvedLang = userLanguage ?? defaultLang

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('forums.title', resolvedLang)}
        description={t('forums.description', resolvedLang)}
        action={
          <Button asChild>
            <Link href="/forums/new">{t('forums.newBtn', resolvedLang)}</Link>
          </Button>
        }
      />

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('forums.error', resolvedLang)}
        </div>
      )}

      {!fetchError && categories.length === 0 && (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title={t('forums.emptyTitle', resolvedLang)}
          description={t('forums.emptyDesc', resolvedLang)}
          action={
            <Button asChild>
              <Link href="/forums/new">{t('forums.emptyAction', resolvedLang)}</Link>
            </Button>
          }
        />
      )}

      {/* [LOG: 20260528_1437] Render category list with live client-side search filtering */}
      {categories.length > 0 && (
        <ForumListWithSearch
          categories={categories}
        />
      )}
    </div>
  )
}


