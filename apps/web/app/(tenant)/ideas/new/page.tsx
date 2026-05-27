import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { NewIdeaForm } from './new-idea-form'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  let lang = 'en'
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    lang = profile?.language ?? 'en'
  } catch {}
  return { title: t('ideas.new.title', lang) }
}

interface IdeaCategory {
  id: string
  name: string
}

export default async function NewIdeaPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  let categories: IdeaCategory[] = []
  let userLanguage = 'en'

  try {
    const [cats, profile] = await Promise.all([
      apiGet<IdeaCategory[]>('/api/ideas/categories', token, 600),
      apiGet<{ language: string | null }>('/api/me', token, 60),
    ])
    categories = cats
    userLanguage = profile?.language ?? 'en'
  } catch {
    // non-fatal — form still works without categories
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ideas" className="hover:text-muted-foreground">
          {t('ideas.title', userLanguage)}
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">
          {t('ideas.new.title', userLanguage)}
        </span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">
          {t('ideas.new.title', userLanguage)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('ideas.new.description', userLanguage)}
        </p>
      </div>

      <NewIdeaForm categories={categories} token={token} lang={userLanguage} />
    </div>
  )
}

