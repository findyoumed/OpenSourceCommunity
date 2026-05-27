import Link from 'next/link'
import { Plus } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'
import type { BadgeProps } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'post' | 'idea' | 'event' | 'comment'
  title: string
  authorName: string
  authorAvatarUrl?: string
  createdAt: string
  href: string
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

const BADGE_VARIANT: Record<ActivityItem['type'], BadgeProps['variant']> = {
  post:    'default',
  idea:    'warning',
  event:   'success',
  comment: 'secondary',
}

const getBadgeLabel = (type: ActivityItem['type'], lang?: string | null | undefined) => {
  const isKo = lang === 'ko'
  const labels: Record<ActivityItem['type'], { en: string; ko: string }> = {
    post:    { en: 'Post',  ko: '게시글' },
    idea:    { en: 'Idea',  ko: '건의' },
    event:   { en: 'Event', ko: '이벤트' },
    comment: { en: 'Reply', ko: '댓글' },
  }
  return isKo ? labels[type].ko : labels[type].en
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function ActivityFeed({
  token,
  lang,
}: {
  token: string | undefined
  lang?: string | null | undefined
}) {
  let activity: ActivityItem[] = []

  try {
    activity = (await apiGet<ActivityItem[]>('/api/activity?limit=10', token, 60)) ?? []
  } catch {
    return null
  }

  const isKo = lang === 'ko'

  return (
    <WidgetShell
      title={isKo ? '실시간 활동 피드' : 'Recent Activity'}
      icon={<Activity className="h-4 w-4" />}
      href="/forums"
      hrefLabel={isKo ? '전체 보기' : 'View all'}
      size="sm"
      contentClassName="p-0"
    >
      {activity.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
            <Plus className="h-4 w-4 text-brand" />
          </div>
          <p className="mt-3 text-sm font-medium text-surface-foreground">
            {isKo ? '아직 활동 기록이 없습니다' : 'No activity yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isKo ? '첫 번째 게시글의 주인공이 되어보세요!' : 'Be the first to post!'}
          </p>
          <Link
            href="/forums/new"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {isKo ? '토론 시작하기' : 'Start a discussion'}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {activity.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-muted transition-colors"
              >
                <Avatar src={item.authorAvatarUrl ?? null} name={item.authorName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-surface-foreground line-clamp-1 group-hover:text-brand transition-colors">
                    {item.title}
                  </p>
                  {/* [LOG: 20260527_1210] */}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {item.authorName} · {timeAgo(item.createdAt, isKo)}
                  </p>
                </div>
                <Badge variant={BADGE_VARIANT[item.type]} className="flex-shrink-0 text-[10px]">
                  {getBadgeLabel(item.type, lang)}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
