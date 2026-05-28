'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, Search, X, Loader2, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/lib/i18n-context'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClientGet } from '@/lib/api-client'

// [LOG: 20260528_1459] Custom definitions for search
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

interface SearchedThread {
  id: string
  title: string
  snippet?: string
  href: string
}

interface ForumListWithSearchProps {
  categories: ForumCategory[]
}

function formatDate(iso: string | null, lang: string = 'en'): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
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

export default function ForumListWithSearch({
  categories,
}: ForumListWithSearchProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') ?? ''
  
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchedThreads, setSearchedThreads] = useState<SearchedThread[] | null>(null)
  const [loading, setLoading] = useState(false)
  
  const { t, lang } = useTranslation()
  const resolvedLang = lang ?? 'en'
  const isKo = resolvedLang === 'ko'

  // [LOG: 20260528_1459] Function to query actual thread posts from the DB
  const performThreadSearch = async (queryText: string) => {
    const trimmed = queryText.trim()
    if (trimmed.length < 2) {
      setSearchedThreads(null)
      return
    }

    setLoading(true)
    try {
      // Call direct backend search endpoint filtered by type=threads
      const response = await apiClientGet<{ threads: SearchedThread[] }>(
        `/api/search?q=${encodeURIComponent(trimmed)}&type=threads&limit=15`
      )
      setSearchedThreads(response.threads || [])
    } catch (err) {
      console.error('Failed to search threads:', err)
      setSearchedThreads([])
    } finally {
      setLoading(false)
    }
  }

  // Handle URL Query Initial Load
  useEffect(() => {
    if (initialQuery) {
      performThreadSearch(initialQuery)
    }
  }, [initialQuery])

  // [LOG: 20260528_1508] Seamless full-page redirect to the global search page on Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length > 0) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleClear = () => {
    setSearchQuery('')
    setSearchedThreads(null)
  }

  // Instantly filter categories locally if query is short (visual feedback)
  const filteredCategories = categories.filter((cat) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      cat.name.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query)
    )
  })

  // Mode determines whether we are showing search results or categories list
  const isSearchingActive = searchQuery.trim().length >= 2 && searchedThreads !== null

  return (
    <div className="space-y-5">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (e.target.value.trim() === '') {
              setSearchedThreads(null)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isKo
              ? '포럼 전체 게시글 검색 (검색어 입력 후 Enter)...'
              : 'Search all forum posts (Type and press Enter)...'
          }
          className="block w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-surface-foreground placeholder-muted-foreground shadow-sm transition-all focus:border-brand focus:ring-1 focus:ring-brand"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-surface-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-brand" />
          <span>{isKo ? '게시글을 검색하는 중...' : 'Searching forum posts...'}</span>
        </div>
      )}

      {/* ── MODE 1: Show Searched Threads ────────────────────────────────────── */}
      {!loading && isSearchingActive && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isKo ? '검색된 게시글 결과' : 'Searched Posts'}
            </h3>
            <span className="text-xs text-muted-foreground">
              {isKo ? `총 ${searchedThreads.length}개 발견` : `${searchedThreads.length} posts found`}
            </span>
          </div>

          {searchedThreads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-surface-foreground">
                {isKo ? `"${searchQuery}"에 대한 검색 결과가 없습니다` : `No results found for "${searchQuery}"`}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {isKo
                  ? '다른 단어(예: admin, 가입 멤버이름, 혹은 작성한 글제목)를 입력해 보세요.'
                  : 'Try typing other words like admin, thread title, or author name.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <ul className="divide-y divide-border">
                {searchedThreads.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      href={thread.href}
                      className="group flex items-start justify-between gap-4 px-6 py-5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-brand/10 text-brand">
                            💬
                          </span>
                          <h4 className="text-sm font-semibold text-surface-foreground group-hover:text-brand transition-colors">
                            {thread.title}
                          </h4>
                        </div>
                        {thread.snippet && (
                          <p
                            className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pl-7"
                            dangerouslySetInnerHTML={{ __html: cleanSnippet(thread.snippet) }}
                          />
                        )}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── MODE 2: Normal Categories List ───────────────────────────────────── */}
      {!loading && !isSearchingActive && (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isKo ? '포럼 카테고리' : 'Forum Categories'}
            </h3>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-surface-foreground">
                {isKo ? '매칭되는 카테고리가 없습니다' : 'No categories match your search'}
              </h3>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <ul className="divide-y divide-border">
                {filteredCategories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/forums/${cat.slug}`}
                      className="flex items-start gap-4 px-6 py-5 hover:bg-muted/40 transition-colors"
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
                            {t('forums.latest', resolvedLang)}:{' '}
                            <span className="text-surface-foreground font-medium">
                              {cat.lastThread.title}
                            </span>{' '}
                            {t('forums.by', resolvedLang)} {cat.lastThread.authorName}
                          </p>
                        )}
                      </div>

                      <div className="hidden flex-shrink-0 text-right sm:block">
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <div>
                            <p className="text-base font-bold text-surface-foreground">
                              {cat.threadCount.toLocaleString(resolvedLang === 'ko' ? 'ko-KR' : 'en-US')}
                            </p>
                            {t('forums.threads', resolvedLang)}
                          </div>
                          <div>
                            <p className="text-base font-bold text-surface-foreground">
                              {cat.postCount.toLocaleString(resolvedLang === 'ko' ? 'ko-KR' : 'en-US')}
                            </p>
                            {t('forums.posts', resolvedLang)}
                          </div>
                        </div>
                        {cat.lastActivityAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(cat.lastActivityAt, resolvedLang)}
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
      )}
    </div>
  )
}
