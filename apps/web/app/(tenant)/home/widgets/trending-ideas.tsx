import Link from 'next/link'
import { Lightbulb, ChevronUp } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'
import type { BadgeProps } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

type IdeaStatus = 'open' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined'

interface IdeaRow {
  id: string
  title: string
  status: IdeaStatus
  voteCount: number
  commentCount: number
  category?: string
  authorName: string
  createdAt: string
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<IdeaStatus, { label: string; variant: BadgeProps['variant'] }> = {
  open:        { label: 'Open',         variant: 'default' },
  under_review:{ label: 'Under Review', variant: 'blue' },
  planned:     { label: 'Planned',      variant: 'purple' },
  in_progress: { label: 'In Progress',  variant: 'warning' },
  completed:   { label: 'Completed',    variant: 'success' },
  declined:    { label: 'Declined',     variant: 'destructive' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function TrendingIdeas({
  token,
  lang,
}: {
  token: string | undefined
  lang?: string | null | undefined
}) {
  let ideas: IdeaRow[] = []

  try {
    ideas = (await apiGet<IdeaRow[]>('/api/ideas?sort=trending&limit=5', token, 120)) ?? []
  } catch {
    return null
  }

  if (ideas.length === 0) return null

  const isKo = lang === 'ko'

  const getStatusLabel = (status: IdeaStatus) => {
    const labels: Record<IdeaStatus, string> = {
      open:         isKo ? '제안됨' : 'Open',
      under_review: isKo ? '검토 중' : 'Under Review',
      planned:      isKo ? '계획됨' : 'Planned',
      in_progress:  isKo ? '진행 중' : 'In Progress',
      completed:    isKo ? '완료됨' : 'Completed',
      declined:     isKo ? '반려됨' : 'Declined',
    }
    return labels[status] || status
  }

  return (
    <WidgetShell
      title={isKo ? '추천 건의사항' : 'Trending Ideas'}
      icon={<Lightbulb className="h-4 w-4" />}
      href="/ideas"
      hrefLabel={isKo ? '모든 건의 보기' : 'All ideas'}
      size="md"
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {ideas.map((idea) => {
          const status = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.open
          return (
            <li key={idea.id}>
              <Link
                href={`/ideas/${idea.id}`}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors"
              >
                {/* Vote pill */}
                <div className="flex flex-col items-center flex-shrink-0 w-10">
                  <div className="flex flex-col items-center gap-0.5 rounded-lg bg-brand/5 px-2 py-1.5 group-hover:bg-brand/10 transition-colors">
                    <ChevronUp className="h-3 w-3 text-brand" />
                    <span className="text-xs font-bold text-brand leading-none">{idea.voteCount}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-foreground line-clamp-1 group-hover:text-brand transition-colors">
                    {idea.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {/* [LOG: 20260527_1145] */}
                    {idea.category && (
                      <span className="text-[11px] text-muted-foreground">{idea.category}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {isKo
                        ? `${idea.commentCount}개 의견`
                        : `${idea.commentCount} comment${idea.commentCount !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <Badge variant={status.variant} className="flex-shrink-0 text-[10px] py-0 px-1.5">
                  {getStatusLabel(idea.status)}
                </Badge>
              </Link>
            </li>
          )
        })}
      </ul>
    </WidgetShell>
  )
}
