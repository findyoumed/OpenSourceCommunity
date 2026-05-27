import Link from 'next/link'
import { BookOpen, Folder, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { t } from '@/lib/i18n'

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
  return { title: t('kb.title', lang) }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface KbCategory {
  id: string
  slug: string
  name: string
  parentId: string | null
  sortOrder: number
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KbPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  let categories: KbCategory[] = []
  let fetchError = false
  let userLanguage = 'en'

  try {
    // [LOG: 20260527_1707]
    if (token) {
      const [cats, profile] = await Promise.all([
        apiGet<KbCategory[]>('/api/kb/categories', token),
        apiGet<{ language: string | null }>('/api/me', token, 60),
      ])
      categories = cats
      userLanguage = profile?.language ?? 'en'
    } else {
      categories = await apiGet<KbCategory[]>('/api/kb/categories', undefined)
    }
  } catch {
    fetchError = true
  }

  const rootCategories = categories.filter((c) => c.parentId === null)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('kb.title', userLanguage)}
        description={t('kb.description', userLanguage)}
      />

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('kb.error', userLanguage)}
        </div>
      )}

      {!fetchError && rootCategories.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={t('kb.emptyTitle', userLanguage)}
          description={t('kb.emptyDesc', userLanguage)}
        />
      )}

      {!fetchError && rootCategories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rootCategories.map((category) => {
            const childCount = categories.filter((c) => c.parentId === category.id).length

            return (
              <Link
                key={category.id}
                href={`/kb/${category.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-brand/20 transition-all"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Folder className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-semibold text-surface-foreground group-hover:text-brand transition-colors">
                  {category.name}
                </h2>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {childCount > 0
                    ? `${childCount}${t(childCount === 1 ? 'kb.subcategory' : 'kb.subcategories', userLanguage)}`
                    : t('kb.browseArticles', userLanguage)}
                </p>
                <span className="mt-auto pt-4 inline-flex items-center gap-1 text-xs font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('kb.viewArticles', userLanguage)}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

