import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { CheckCircle2, Pin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ThreadActions } from './thread-actions'
import { TranslatableThread } from './translatable-thread'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { resolveLocalePreference, type Locale } from '@/lib/language'

interface ThreadObj {
  id: string
  title: string
  categorySlug: string
  categoryName: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  isAnswered: boolean
  isPinned: boolean
  viewCount: number
  acceptedAnswerId: string | null
  createdAt: string
}

interface PostObj {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  authorRole: string
  body: Record<string, unknown> | string
  isAnswer: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

interface ThreadDetailResponse {
  thread: ThreadObj
  posts: PostObj[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; threadId: string }>
}): Promise<Metadata> {
  const { threadId } = await params
  try {
    const supabase = await createClient()
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const detail = await apiGet<ThreadDetailResponse>(`/api/forums/threads/${threadId}`, token)
    return { title: detail.thread.title }
  } catch {
    return { title: 'Thread' }
  }
}

function renderNode(node: Record<string, unknown>): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const children = content.map((child) => renderNode(child)).join('')

  switch (type) {
    case 'doc':
      return children
    case 'paragraph':
      return `<p>${children || '<br>'}</p>`
    case 'heading': {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 2
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${children}</ul>`
    case 'orderedList':
      return `<ol>${children}</ol>`
    case 'listItem':
      return `<li>${children}</li>`
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`
    case 'codeBlock':
      return `<pre><code>${children}</code></pre>`
    case 'text': {
      let text = (node.text as string | undefined) ?? ''
      const marks = (node.marks as Array<{ type: string }> | undefined) ?? []
      for (const mark of marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'underline') text = `<u>${text}</u>`
        if (mark.type === 'strike') text = `<s>${text}</s>`
        if (mark.type === 'code') text = `<code>${text}</code>`
      }
      return text
    }
    default:
      return children
  }
}

function renderBody(body: Record<string, unknown> | string): string {
  try {
    if (typeof body === 'string') return body
    return renderNode(body)
  } catch {
    return ''
  }
}

function extractText(node: Record<string, unknown>): string {
  if (node.type === 'text') return (node.text as string | undefined) ?? ''
  const children = (node.content as Record<string, unknown>[] | undefined) ?? []
  return children.map(extractText).join(' ')
}

function bodyToPlainText(body: Record<string, unknown> | string): string {
  try {
    if (typeof body === 'string') return body
    return extractText(body).replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ categorySlug: string; threadId: string }>
}) {
  const { categorySlug, threadId } = await params

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language')

  let detail: ThreadDetailResponse | null = null
  try {
    detail = await apiGet<ThreadDetailResponse>(`/api/forums/threads/${threadId}`, token)
  } catch {
    notFound()
  }
  if (!detail) notFound()

  let memberLanguage: Locale = resolveLocalePreference({
    cookieLanguage: cookieLang,
    acceptLanguage,
  })

  if (token) {
    try {
      const me = await apiGet<{ language?: string | null }>('/api/me', token, 60)
      memberLanguage = resolveLocalePreference({
        profileLanguage: me.language,
        cookieLanguage: cookieLang,
        acceptLanguage,
      })
    } catch {}
  }

  const { thread, posts } = detail
  const isKo = memberLanguage === 'ko'
  const locale = isKo ? 'ko-KR' : 'en-US'

  const enrichedPosts = posts.map((post) => ({
    ...post,
    bodyHtml: renderBody(post.body),
    bodyText: bodyToPlainText(post.body),
  }))

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/forums" className="hover:text-surface-foreground transition-colors">
          {isKo ? '포럼' : 'Forums'}
        </Link>
        <span className="text-border">/</span>
        <Link href={`/forums/${categorySlug}`} className="hover:text-surface-foreground transition-colors">
          {thread.categoryName}
        </Link>
        <span className="text-border">/</span>
        <span className="truncate max-w-[200px] text-surface-foreground font-medium">
          {thread.title}
        </span>
      </nav>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              {thread.isPinned && (
                <Badge variant="secondary">
                  <Pin className="mr-1 h-3 w-3" />
                  {isKo ? '고정됨' : 'Pinned'}
                </Badge>
              )}
              {thread.isAnswered && (
                <Badge variant="success">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {isKo ? '해결됨' : 'Answered'}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-surface-foreground">{thread.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {thread.authorName} &middot;{' '}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(thread.createdAt))}{' '}
              &middot; {thread.viewCount.toLocaleString(locale)} {isKo ? '조회' : 'views'}
            </p>
          </div>
        </div>
      </div>

      {memberLanguage !== 'en' ? (
        <TranslatableThread posts={enrichedPosts} targetLang={memberLanguage} />
      ) : (
        <div className="space-y-4">
          {enrichedPosts.map((post) => (
            <PostCard key={post.id} post={post} lang={memberLanguage} />
          ))}
        </div>
      )}

      <ThreadActions
        threadId={thread.id}
        categorySlug={categorySlug}
        token={token ?? ''}
        lang={memberLanguage}
      />
    </div>
  )
}

function PostCard({ post, lang }: { post: PostObj & { bodyHtml: string }; lang: Locale }) {
  const isKo = lang === 'ko'
  const locale = isKo ? 'ko-KR' : 'en-US'

  return (
    <article
      className={[
        'rounded-xl border bg-card p-6',
        post.isAnswer
          ? 'border-emerald-300 ring-1 ring-emerald-200/60'
          : 'border-border',
      ].join(' ')}
    >
      {post.isAnswer && (
        <div className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {isKo ? '채택된 답변' : 'Accepted answer'}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Avatar
          src={post.authorAvatarUrl}
          name={post.authorName}
          size="sm"
        />
        <div>
          <p className="text-sm font-semibold text-surface-foreground">{post.authorName}</p>
          {post.authorRole !== 'member' && post.authorRole !== 'guest' && (
            <span className="text-xs capitalize text-brand">{post.authorRole.replace('_', ' ')}</span>
          )}
        </div>
        <time className="ml-auto text-xs text-muted-foreground">
          {new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(post.createdAt))}
        </time>
      </div>

      {post.bodyHtml && (
        <div
          className="prose prose-sm max-w-none prose-headings:text-surface-foreground prose-p:text-surface-foreground prose-strong:text-surface-foreground prose-code:text-brand prose-a:text-brand"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      )}
    </article>
  )
}
