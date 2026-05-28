'use client'

import { useRouter } from 'next/navigation'
import type { IdeaStatus } from './ideas-config'
import { STATUS_CONFIG } from './ideas-config'
import { t } from '@/lib/i18n'

interface IdeaCategory {
  id: string
  name: string
}

type SortOption = 'votes' | 'newest' | 'trending'

interface IdeasFiltersProps {
  sortOption: SortOption
  status: string | undefined
  category: string | undefined
  categories: IdeaCategory[]
  lang?: string | null
}

function buildHref({
  sort,
  status,
  category,
}: {
  sort?: string | undefined
  status?: string | undefined
  category?: string | undefined
}): string {
  const qs = new URLSearchParams()
  if (sort) qs.set('sort', sort)
  if (status) qs.set('status', status)
  if (category) qs.set('category', category)
  const str = qs.toString()
  return `/ideas${str ? `?${str}` : ''}`
}

export function IdeasFilters({
  sortOption,
  status,
  category,
  categories,
  lang,
}: IdeasFiltersProps) {
  const activeLang = lang ?? 'en'
  const router = useRouter()

  const sortOptions: SortOption[] = ['votes', 'newest', 'trending']

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Sort */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {sortOptions.map((s) => (
          <a
            key={s}
            href={buildHref({ sort: s, status, category })}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortOption === s
                ? 'bg-brand text-white'
                : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {t(`ideas.filter.sort.${s}` as any, activeLang)}
          </a>
        ))}
      </div>

      {/* Status filter */}
      <select
        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={status ?? ''}
        onChange={(e) => {
          const val = e.target.value
          router.push(buildHref({ sort: sortOption, status: val || undefined, category }))
        }}
      >
        <option value="">{t('ideas.filter.statusAll', activeLang)}</option>
        {(Object.keys(STATUS_CONFIG) as IdeaStatus[]).map((s) => (
          <option key={s} value={s}>
            {t(`ideas.status.${s}` as any, activeLang)}
          </option>
        ))}
      </select>

      {/* Category filter */}
      {categories.length > 0 && (
        <select
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={category ?? ''}
          onChange={(e) => {
            const val = e.target.value
            router.push(buildHref({ sort: sortOption, status, category: val || undefined }))
          }}
        >
          <option value="">{t('ideas.filter.categoryAll', activeLang)}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

