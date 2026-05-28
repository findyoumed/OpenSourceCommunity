import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'New discussion' }

interface ForumCategory {
  id: string
  slug: string
  name: string
  description: string | null
}

export default async function ForumsNewPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  // [LOG: 20260528_1645] Dynamic language fallback matching cookies or headers
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let categories: ForumCategory[] = []
  let userLanguage = defaultLang

  try {
    const [cats, profile] = await Promise.all([
      apiGet<ForumCategory[]>('/api/forums/categories', token),
      apiGet<{ language: string | null }>('/api/me', token, 60),
    ])
    categories = cats
    userLanguage = profile?.language ?? defaultLang
  } catch {
    // fall through — show error state
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forums" className="hover:text-muted-foreground">
          {t('nav.forums', userLanguage)}
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">
          {t('forums.new.title', userLanguage)}
        </span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">
          {t('forums.new.title', userLanguage)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('forums.new.chooseCategory', userLanguage)}
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t('forums.new.noCategories', userLanguage)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('forums.new.adminNeeded', userLanguage)}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/forums/${cat.slug}/new`}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-surface-foreground">{cat.name}</p>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{cat.description}</p>
                    )}
                  </div>
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

