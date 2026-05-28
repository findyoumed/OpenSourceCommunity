import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Search, MessageSquare, Lightbulb, Calendar, BookOpen, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { t } from '@/lib/i18n'

// [LOG: 20260527_1720]

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
  return { title: t('search.pageTitle', lang) }
}

interface SearchResult {
  id: string
  title: string
  snippet?: string
  subtitle?: string
  href: string
}

interface SearchData {
  threads: SearchResult[]
  ideas: SearchResult[]
  members: SearchResult[]
  events: SearchResult[]
  kb: SearchResult[]
}

const TYPE_CONFIG_KEYS: Record<string, { labelKey: string; icon: React.ElementType; color: string }> = {
  threads: { labelKey: 'search.badge.thread', icon: MessageSquare, color: 'blue' as const },
  ideas: { labelKey: 'search.badge.idea', icon: Lightbulb, color: 'purple' as const },
  events: { labelKey: 'search.badge.event', icon: Calendar, color: 'warning' as const },
  kb: { labelKey: 'search.badge.article', icon: BookOpen, color: 'success' as const },
  members: { labelKey: 'search.badge.member', icon: Users, color: 'secondary' as const },
}

// [LOG: 20260528_1511] Deep recursive JSON text extractor and robust broken JSON symbol scrub utility
function cleanSnippet(snippet: string | undefined): string {
  if (!snippet) return ''
  
  const trimmed = snippet.trim()
  
  // 1. Recursive extractor if it happens to be valid JSON
  const extractText = (obj: any): string => {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    if (Array.isArray(obj)) return obj.map(extractText).join(' ')
    if (typeof obj === 'object') {
      let res = ''
      if (obj.text && typeof obj.text === 'string') res += obj.text
      if (obj.content) res += ' ' + extractText(obj.content)
      for (const k in obj) {
        if (k !== 'content' && k !== 'text' && typeof obj[k] === 'object') {
          res += ' ' + extractText(obj[k])
        }
      }
      return res.trim()
    }
    return ''
  }

  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed)
      const text = extractText(parsed)
      if (text) return text
    }
  } catch {}

  // 2. High-performance Regex-scrubbing fallback for fragmented/broken JSON strings (Postgres ts_headline crops)
  let cleaned = snippet
    .replace(/\\"/g, '"')
    .replace(/\{\s*"type"\s*:\s*"[^"]*"\s*,?/gi, '')
    .replace(/"type"\s*:\s*"[^"]*"\s*,?/gi, '')
    .replace(/"content"\s*:\s*\[?/gi, '')
    .replace(/"text"\s*:\s*"/gi, '')
    .replace(/\{\s*"text"\s*:\s*"/gi, '')
    .replace(/\\n/g, ' ')
    .replace(/[\{\}\[\]"']/g, '') // Wipe remaining brackets, braces, and quotes
    .replace(/\btext\b/gi, '')
    .replace(/\bparagraph\b/gi, '')
    .replace(/\bdoc\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove leading/trailing commas or colons left from JSON splitting
  cleaned = cleaned.replace(/^[:,\s]+|[:,\s]+$/g, '')

  return cleaned || snippet
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const { q = '', type } = await searchParams

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let lang = 'en'
  if (token) {
    try {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      lang = profile?.language ?? 'en'
    } catch {}
  }

  let results: SearchData = { threads: [], ideas: [], members: [], events: [], kb: [] }

  if (q.trim().length >= 2) {
    const params = new URLSearchParams({ q, limit: '10' })
    if (type) params.set('type', type)
    try {
      results = await apiGet<SearchData>(`/api/search?${params}`, token, 0)
    } catch {}
  }

  const allResults: (SearchResult & { type: string })[] = [
    ...results.threads.map(r => ({ ...r, type: 'threads' })),
    ...results.ideas.map(r => ({ ...r, type: 'ideas' })),
    ...results.events.map(r => ({ ...r, type: 'events' })),
    ...results.kb.map(r => ({ ...r, type: 'kb' })),
    ...results.members.map(r => ({ ...r, type: 'members' })),
  ]

  const tabs = [
    { key: undefined, labelKey: 'search.tabs.all', count: allResults.length },
    { key: 'threads', labelKey: 'search.tabs.threads', count: results.threads.length },
    { key: 'ideas', labelKey: 'search.tabs.ideas', count: results.ideas.length },
    { key: 'events', labelKey: 'search.tabs.events', count: results.events.length },
    { key: 'kb', labelKey: 'search.tabs.kb', count: results.kb.length },
    { key: 'members', labelKey: 'search.tabs.members', count: results.members.length },
  ]

  const displayResults = type
    ? allResults.filter(r => r.type === type)
    : allResults

  return (
    <div className="space-y-6">
      <PageHeader title={t('search.pageTitle', lang)} />

      {/* Search bar */}
      <form method="GET" action="/search" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t('search.inputPlaceholder', lang)}
            autoFocus={!q}
            className="flex h-10 w-full rounded-lg border border-input bg-card pl-9 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
          {type && <input type="hidden" name="type" value={type} />}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          {t('search.btn', lang)}
        </button>
      </form>

      {q.trim().length >= 2 && (
        <>
          {/* Tab filter */}
          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map(tab => {
              const isActive = type === tab.key
              const href = tab.key
                ? `/search?q=${encodeURIComponent(q)}&type=${tab.key}`
                : `/search?q=${encodeURIComponent(q)}`
              return (
                <Link
                  key={tab.labelKey}
                  href={href}
                  className={[
                    'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted-foreground hover:text-surface-foreground',
                  ].join(' ')}
                >
                  {t(tab.labelKey as any, lang)}
                  {tab.count > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {tab.count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Results */}
          {displayResults.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title={t('search.emptyTitle', lang)}
              description={t('search.emptyDesc', lang)
                .replace('{q}', q)
                .replace('{typeDesc}', type ? ` (${t(`search.tabs.${type}` as any, lang)})` : '')
              }
            />
          ) : (
            <div className="space-y-2">
              {displayResults.map(result => {
                const config = TYPE_CONFIG_KEYS[result.type]!
                const Icon = config.icon
                return (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.href}
                    className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-surface-foreground">{result.title}</p>
                        <Badge variant={config.color as 'blue' | 'purple' | 'warning' | 'success' | 'secondary'} className="shrink-0">
                          {t(config.labelKey as any, lang)}
                        </Badge>
                      </div>
                      {result.subtitle && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{result.subtitle}</p>
                      )}
                      {result.snippet && (
                        <p
                          className="mt-1 text-xs text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: cleanSnippet(result.snippet) }}
                        />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {!q.trim() && (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t('search.startTitle', lang)}
          description={t('search.startDesc', lang)}
        />
      )}
    </div>
  )
}
