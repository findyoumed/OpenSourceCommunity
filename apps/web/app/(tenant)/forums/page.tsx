// [LOG: 20260527_1034]
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  let lang = 'en'
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    lang = profile?.language ?? 'en'
  } catch {}
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

  let categories: ForumCategory[] = []
  let fetchError = false
  let userLanguage = 'en'

  try {
    const [cats, profile] = await Promise.all([
      apiGet<ForumCategory[]>('/api/forums/categories', token),
      apiGet<{ language: string | null }>('/api/me', token, 60)
    ])
    categories = cats
    userLanguage = profile?.language ?? 'en'
  } catch {
    fetchError = true
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('forums.title', userLanguage)}
        description={t('forums.description', userLanguage)}
        action={
          <Button asChild>
            <Link href="/forums/new">{t('forums.newBtn', userLanguage)}</Link>
          </Button>
        }
      />

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('forums.error', userLanguage)}
        </div>
      )}

      {!fetchError && categories.length === 0 && (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title={t('forums.emptyTitle', userLanguage)}
          description={t('forums.emptyDesc', userLanguage)}
          action={
            <Button asChild>
              <Link href="/forums/new">{t('forums.emptyAction', userLanguage)}</Link>
            </Button>
          }
        />
      )}

      {categories.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/forums/${cat.slug}`}
                  className="flex items-start gap-4 px-6 py-5 hover:bg-muted transition-colors"
                >
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <MessageSquare className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-surface-foreground">
                      {cat.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {cat.description}
                    </p>

                    {cat.lastThread && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t('forums.latest', userLanguage)}:{' '}
                        <span className="text-surface-foreground font-medium">
                          {cat.lastThread.title}
                        </span>{' '}
                        {t('forums.by', userLanguage)} {cat.lastThread.authorName}
                      </p>
                    )}
                  </div>

                  <div className="hidden flex-shrink-0 text-right sm:block">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <div>
                        <p className="text-base font-bold text-surface-foreground">
                          {cat.threadCount.toLocaleString(userLanguage === 'ko' ? 'ko-KR' : 'en-US')}
                        </p>
                        {t('forums.threads', userLanguage)}
                      </div>
                      <div>
                        <p className="text-base font-bold text-surface-foreground">
                          {cat.postCount.toLocaleString(userLanguage === 'ko' ? 'ko-KR' : 'en-US')}
                        </p>
                        {t('forums.posts', userLanguage)}
                      </div>
                    </div>
                    {cat.lastActivityAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(cat.lastActivityAt, userLanguage)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


