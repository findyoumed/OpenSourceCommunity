import Link from 'next/link'
import { MessageSquare, Eye } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreadRow {
  id: string
  title: string
  body?: any
  categorySlug?: string
  categoryName?: string
  authorName: string
  authorAvatarUrl?: string
  replyCount: number
  viewCount?: number
  createdAt: string
  isAnswered: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string, isKo: boolean): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return isKo ? '방금 전' : 'just now'
  if (mins < 60) return isKo ? `${mins}분 전` : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return isKo ? `${hrs}시간 전` : `${hrs}h ago`
  return isKo ? `${Math.floor(hrs / 24)}일 전` : `${Math.floor(hrs / 24)}d ago`
}

// [LOG: 20260527_1546] Extract plain text recursively from dynamic Rich Text formats
function extractTextFromRichBody(body: any): string {
  if (!body) return ''
  
  if (typeof body === 'string') {
    if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(body)
        return extractTextFromRichBody(parsed)
      } catch {
        return body
      }
    }
    return body
  }

  if (Array.isArray(body)) {
    return body.map(extractTextFromRichBody).filter(Boolean).join(' ')
  }

  if (typeof body === 'object') {
    if (body.type === 'text' && typeof body.text === 'string') {
      return body.text
    }
    if (body.content && Array.isArray(body.content)) {
      return extractTextFromRichBody(body.content)
    }
    if (body.children && Array.isArray(body.children)) {
      return extractTextFromRichBody(body.children)
    }
  }

  return ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function excerpt(body: any, maxLen = 90): string {
  if (!body) return ''
  const plainText = extractTextFromRichBody(body)
  const text = stripHtml(plainText)
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function HotDiscussions({
  token,
  lang,
}: {
  token: string | undefined
  lang?: string | null | undefined
}) {
  let threads: ThreadRow[] = []

  try {
    threads = (await apiGet<ThreadRow[]>('/api/forums/threads?sort=active&limit=5', token, 60)) ?? []
  } catch {
    return null
  }

  if (threads.length === 0) return null

  const isKo = lang === 'ko'

  return (
    <WidgetShell
      title={isKo ? '인기 토론' : 'Hot Discussions'}
      icon={<MessageSquare className="h-4 w-4" />}
      href="/forums"
      hrefLabel={isKo ? '모든 토론 보기' : 'All discussions'}
      size="md"
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {threads.map((thread) => {
          const threadExcerpt = excerpt(thread.body)
          const href = thread.categorySlug
            ? `/forums/${thread.categorySlug}/${thread.id}`
            : `/forums/${thread.id}`

          return (
            <li key={thread.id}>
              <Link
                href={href}
                className="group flex gap-3 px-5 py-4 hover:bg-muted transition-colors"
              >
                <Avatar
                  src={thread.authorAvatarUrl ?? null}
                  name={thread.authorName}
                  size="sm"
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-surface-foreground line-clamp-1 group-hover:text-brand transition-colors">
                      {thread.title}
                    </p>
                    {thread.isAnswered && (
                      <Badge variant="success" className="shrink-0 text-[10px] py-0 px-1.5">
                        {isKo ? '✓ 해결됨' : '✓ Solved'}
                      </Badge>
                    )}
                  </div>

                  {threadExcerpt && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {threadExcerpt}
                    </p>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {/* [LOG: 20260527_1140] */}
                    <span className="text-[11px] text-muted-foreground">{thread.authorName}</span>
                    <span className="text-[11px] text-muted-foreground/50">·</span>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(thread.createdAt, isKo)}</span>
                    {thread.categoryName && (
                      <>
                        <span className="text-[11px] text-muted-foreground/50">·</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{thread.categoryName}</Badge>
                      </>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {thread.replyCount}
                    </span>
                    {(thread.viewCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Eye className="h-2.5 w-2.5" />
                        {thread.viewCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </WidgetShell>
  )
}
