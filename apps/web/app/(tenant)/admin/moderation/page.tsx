import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ModerationActions } from './moderation-actions'
import { t, type DictionaryKey } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const { userLanguage } = await getModeratorContext()
  return { title: `${t('admin.moderation.title', userLanguage)} - ${t('admin.title', userLanguage)}` }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = 'pending' | 'reviewing' | 'removed' | 'dismissed'

interface ContentReport {
  id: string
  contentType: string
  contentId: string
  contentPreview: string | null
  contentAuthorName: string | null
  reason: string
  notes: string | null
  status: ReportStatus
  aiFlag: string | null
  aiReasoning: string | null
  createdAt: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, DictionaryKey> = {
  spam: 'admin.moderation.reason.spam',
  harassment: 'admin.moderation.reason.harassment',
  hate_speech: 'admin.moderation.reason.hate_speech',
  misinformation: 'admin.moderation.reason.misinformation',
  off_topic: 'admin.moderation.reason.off_topic',
  other: 'admin.moderation.reason.other',
}

const TYPE_BADGE: Record<string, string> = {
  thread: 'bg-blue-50 text-blue-700',
  post: 'bg-muted text-muted-foreground',
  idea: 'bg-violet-50 text-violet-700',
  comment: 'bg-amber-50 text-amber-700',
  chat_message: 'bg-emerald-50 text-emerald-700',
}

const AI_FLAG_CONFIG: Record<string, { labelKey: DictionaryKey; badge: string }> = {
  unsafe: { labelKey: 'admin.moderation.ai.unsafe', badge: 'bg-red-50 text-red-700 border border-red-200' },
  uncertain: { labelKey: 'admin.moderation.ai.uncertain', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  safe: { labelKey: 'admin.moderation.ai.safe', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
}

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const minutes = Math.max(Math.floor(diff / 60000), 0)
  if (lang === 'ko') {
    if (h < 1) return `${minutes}분 전`
    if (h < 24) return `${h}시간 전`
    return `${Math.floor(h / 24)}일 전`
  }
  if (h < 1) return `${minutes}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

async function getModeratorContext() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1645] Dynamic language fallback matching cookies or headers
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let isAdmin = false
  let userLanguage = defaultLang
  try {
    const profile = await apiGet<{ role: string; language: string | null }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin' || profile.role === 'moderator'
    userLanguage = profile.language ?? defaultLang
  } catch {}
  return { token, isAdmin, userLanguage }
}

export default async function ModerationPage({ searchParams }: PageProps) {
  const { token, isAdmin, userLanguage } = await getModeratorContext()
  if (!isAdmin) redirect('/home')

  const { status = 'pending' } = await searchParams
  const validStatus = ['pending', 'reviewing', 'removed', 'dismissed'].includes(status) ? status : 'pending'

  let reports: ContentReport[] = []
  try {
    reports = await apiGet<ContentReport[]>(`/api/admin/reports?status=${validStatus}&limit=50`, token, 0)
  } catch {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">{t('admin.moderation.title', userLanguage)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('admin.moderation.description', userLanguage)}</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          {t('admin.moderation.back', userLanguage)}
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1.5 w-fit">
        {(['pending', 'reviewing', 'removed', 'dismissed'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/moderation?status=${s}`}
            className={[
              'rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              validStatus === s
                ? 'bg-brand text-white'
                : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {t(`admin.moderation.status.${s}` as DictionaryKey, userLanguage)}
          </Link>
        ))}
      </div>

      {/* Queue */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">✅</div>
          <p className="text-sm font-medium text-muted-foreground">
            {validStatus === 'pending'
              ? t('admin.moderation.empty.pendingTitle', userLanguage)
              : t('admin.moderation.empty.statusTitle', userLanguage).replace('{status}', t(`admin.moderation.status.${validStatus}` as DictionaryKey, userLanguage))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {validStatus === 'pending'
              ? t('admin.moderation.empty.pendingDesc', userLanguage)
              : t('admin.moderation.empty.statusDesc', userLanguage).replace('{status}', t(`admin.moderation.status.${validStatus}` as DictionaryKey, userLanguage))}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const typeBadge = TYPE_BADGE[report.contentType] ?? 'bg-muted text-muted-foreground'
            const aiFlagCfg = report.aiFlag ? AI_FLAG_CONFIG[report.aiFlag] : null
            const reasonKey = REASON_LABELS[report.reason]
            return (
              <div key={report.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Badges row */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', typeBadge].join(' ')}>
                        {report.contentType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {reasonKey ? t(reasonKey, userLanguage) : report.reason}
                      </span>
                      {aiFlagCfg && (
                        <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', aiFlagCfg.badge].join(' ')}>
                          {t(aiFlagCfg.labelKey, userLanguage)}
                        </span>
                      )}
                    </div>

                    {/* Content preview */}
                    {report.contentPreview && (
                      <p className="text-sm text-surface-foreground line-clamp-2 mb-1">
                        &ldquo;{report.contentPreview}&rdquo;
                      </p>
                    )}

                    {/* Meta */}
                    <p className="text-xs text-muted-foreground">
                      {report.contentAuthorName && <>{t('admin.moderation.by', userLanguage)} {report.contentAuthorName} · </>}
                      {t('admin.moderation.reported', userLanguage)} {timeAgo(report.createdAt, userLanguage)}
                    </p>
                    {report.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        {t('admin.moderation.reporterNote', userLanguage)} &ldquo;{report.notes}&rdquo;
                      </p>
                    )}
                    {report.aiReasoning && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        AI: {report.aiReasoning}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {validStatus === 'pending' && (
                    <ModerationActions reportId={report.id} token={token ?? ''} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Guidelines */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 text-sm font-semibold text-surface-foreground">{t('admin.moderation.guidelines.title', userLanguage)}</h2>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {[
            t('admin.moderation.guidelines.1', userLanguage),
            t('admin.moderation.guidelines.2', userLanguage),
            t('admin.moderation.guidelines.3', userLanguage),
            t('admin.moderation.guidelines.4', userLanguage),
            t('admin.moderation.guidelines.5', userLanguage),
          ].map((g) => (
            <li key={g} className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              {g}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
