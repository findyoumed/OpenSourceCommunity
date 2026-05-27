import Link from 'next/link'
import { LayoutGrid, Calendar, Globe, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
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
  return { title: t('events.title', lang) }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventItem {
  id: string
  title: string
  body: Record<string, unknown> | null
  location: { type: 'virtual' | 'irl'; url?: string; address?: string } | null
  startsAt: string
  endsAt: string
  timezone: string
  capacity: number | null
  coverImageUrl: string | null
  tags: string[]
  status: 'draft' | 'published' | 'cancelled'
}

interface EventListRow {
  event: EventItem
  rsvpCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(iso: string, timezone: string, lang: string = 'en'): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(new Date(iso))
}

function getMonthYear(iso: string, lang: string = 'en'): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

function groupByMonth(rows: EventListRow[], lang: string = 'en'): Map<string, EventListRow[]> {
  const map = new Map<string, EventListRow[]>()
  for (const row of rows) {
    const key = getMonthYear(row.event.startsAt, lang)
    const existing = map.get(key) ?? []
    existing.push(row)
    map.set(key, existing)
  }
  return map
}

const COVER_GRADIENTS = [
  'from-brand/60 to-violet-500/80',
  'from-rose-400 to-orange-400',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-yellow-500',
  'from-fuchsia-400 to-pink-500',
]

function gradientForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length] ?? COVER_GRADIENTS[0] ?? ''
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view = 'grid' } = await searchParams
  const calendarView = view === 'calendar'

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  const role = (session?.user?.app_metadata?.role as string | undefined) ?? 'member'
  const canCreate = role === 'org_admin' || role === 'moderator'

  let rows: EventListRow[] = []
  let fetchError = false
  let userLanguage = 'en'

  try {
    // [LOG: 20260527_1705]
    if (token) {
      const [rowsData, profile] = await Promise.all([
        apiGet<EventListRow[]>('/api/events', token),
        apiGet<{ language: string | null }>('/api/me', token, 60),
      ])
      rows = rowsData
      userLanguage = profile?.language ?? 'en'
    } else {
      rows = await apiGet<EventListRow[]>('/api/events', undefined)
    }
  } catch {
    fetchError = true
  }

  const grouped = groupByMonth(rows, userLanguage)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('events.title', userLanguage)}
        description={t('events.description', userLanguage)}
        action={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              <Link
                href="/events?view=grid"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  !calendarView ? 'bg-brand text-white' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {t('events.viewGrid', userLanguage)}
              </Link>
              <Link
                href="/events?view=calendar"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  calendarView ? 'bg-brand text-white' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                {t('events.viewCalendar', userLanguage)}
              </Link>
            </div>

            {canCreate && (
              <Button asChild>
                <Link href="/events/new">{t('events.createBtn', userLanguage)}</Link>
              </Button>
            )}
          </div>
        }
      />

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('events.error', userLanguage)}
        </div>
      )}

      {!fetchError && rows.length === 0 && (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title={t('events.emptyTitle', userLanguage)}
          description={
            canCreate
              ? t('events.emptyDescAdmin', userLanguage)
              : t('events.emptyDescMember', userLanguage)
          }
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/events/new">{t('events.createBtn', userLanguage)}</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Grid view */}
      {!fetchError && rows.length > 0 && !calendarView && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <EventCard key={row.event.id} row={row} lang={userLanguage} />
          ))}
        </div>
      )}

      {/* Calendar view (grouped by month) */}
      {!fetchError && rows.length > 0 && calendarView && (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([month, monthRows]) => (
            <section key={month}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {month}
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                {monthRows.map((row) => (
                  <EventRow key={row.event.id} row={row} lang={userLanguage} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Event Card (Grid view) ────────────────────────────────────────────────────

function EventCard({ row, lang = 'en' }: { row: EventListRow; lang?: string | null | undefined }) {
  const { event, rsvpCount } = row
  const gradient = gradientForId(event.id)
  const locationType = event.location?.type ?? 'virtual'

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Cover */}
      {event.coverImageUrl ? (
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className={`h-40 w-full bg-gradient-to-br ${gradient}`} />
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        <h2 className="text-sm font-semibold text-surface-foreground line-clamp-2 group-hover:text-brand transition-colors">
          {event.title}
        </h2>

        <p className="mt-2 text-xs text-muted-foreground">
          {formatEventDate(event.startsAt, event.timezone, lang ?? 'en')}
        </p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3">
          <Badge variant={locationType === 'virtual' ? 'blue' : 'success'}>
            {locationType === 'virtual' ? (
              <><Globe className="h-3 w-3 mr-1" />{t('events.location.virtual', lang)}</>
            ) : (
              <><MapPin className="h-3 w-3 mr-1" />{t('events.location.irl', lang)}</>
            )}
          </Badge>

          {rsvpCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {rsvpCount.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')} {t('events.attending', lang)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Event Row (Calendar view) ────────────────────────────────────────────────

function EventRow({ row, lang = 'en' }: { row: EventListRow; lang?: string | null | undefined }) {
  const { event, rsvpCount } = row
  const d = new Date(event.startsAt)
  const locationType = event.location?.type ?? 'virtual'
  const isKo = lang === 'ko'
  const day = d.toLocaleDateString(isKo ? 'ko-KR' : 'en-US', { day: 'numeric', timeZone: event.timezone })
  const weekday = d.toLocaleDateString(isKo ? 'ko-KR' : 'en-US', { weekday: 'short', timeZone: event.timezone })
  const time = d.toLocaleTimeString(isKo ? 'ko-KR' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone,
  })

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors"
    >
      {/* Date pill */}
      <div className="flex w-12 flex-shrink-0 flex-col items-center rounded-lg bg-brand/10 py-1.5 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">{weekday}</span>
        <span className="text-lg font-black text-brand leading-none">{day}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-surface-foreground line-clamp-1">
          {event.title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {time} · <span className={locationType === 'virtual' ? 'text-brand' : 'text-emerald-600'}>
            {locationType === 'virtual' ? t('events.location.virtual', lang) : t('events.location.irl', lang)}
          </span>
        </p>
      </div>

      {event.tags.slice(0, 2).map((tag) => (
        <Badge key={tag} variant="secondary" className="hidden sm:inline-flex">
          {tag}
        </Badge>
      ))}

      <span className="text-xs text-muted-foreground flex-shrink-0">
        {rsvpCount.toLocaleString(isKo ? 'ko-KR' : 'en-US')} {t('events.rsvps', lang)}
      </span>
    </Link>
  )
}

