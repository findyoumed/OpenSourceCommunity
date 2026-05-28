import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { t } from '@/lib/i18n'
import { resolveLocalePreference } from '@/lib/language'

export async function generateMetadata(): Promise<Metadata> {
  const { userLanguage } = await getAdminContext()
  return { title: `${t('admin.members.title', userLanguage)} - ${t('admin.title', userLanguage)}` }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberRole = 'guest' | 'member' | 'moderator' | 'org_admin'

interface Member {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  role: MemberRole
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<MemberRole, { labelKey: Parameters<typeof t>[0]; className: string }> = {
  guest: { labelKey: 'admin.role.guest', className: 'bg-muted text-muted-foreground' },
  member: { labelKey: 'admin.role.member', className: 'bg-blue-50 text-blue-700' },
  moderator: { labelKey: 'admin.role.moderator', className: 'bg-amber-50 text-amber-700' },
  org_admin: { labelKey: 'admin.role.org_admin', className: 'bg-brand/5 text-brand' },
}

function joinedDate(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko' : 'en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

// ─── Page ─────────────────────────────────────────────────────────────────────
async function getAdminContext() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1645] Dynamic language fallback matching cookies or headers
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  // [LOG: 20260528_1735] Replaced old locale pattern with resolveLocalePreference

  let isAdmin = false
  let userLanguage = resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })
  try {
    const profile = await apiGet<{ role: string; language: string | null }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
    userLanguage = resolveLocalePreference({ profileLanguage: profile.language, cookieLanguage: cookieLang, acceptLanguage })
  } catch {}
  return { token, isAdmin, userLanguage }
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search } = await searchParams

  const { token, isAdmin, userLanguage } = await getAdminContext()

  if (!isAdmin) {
    redirect('/home')
  }

  // Fetch members
  const qs = new URLSearchParams({ limit: '50' })
  if (search) qs.set('search', search)

  let members: Member[] = []
  let fetchError = false

  try {
    members = await apiGet<Member[]>(`/api/members?${qs}`, token, 30)
  } catch {
    fetchError = true
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">{t('admin.members.title', userLanguage)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('admin.members.description', userLanguage)}
          </p>
        </div>
        <Link
          href="/admin/members/invite"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors whitespace-nowrap"
        >
          {t('admin.members.invite', userLanguage)}
        </Link>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <form method="GET" className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder={t('admin.members.searchPlaceholder', userLanguage)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-surface-foreground hover:bg-muted transition-colors"
        >
          {t('admin.members.search', userLanguage)}
        </button>
        {search && (
          <Link
            href="/admin/members"
            className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
          >
            {t('admin.members.clear', userLanguage)}
          </Link>
        )}
      </form>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('admin.members.error', userLanguage)}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!fetchError && members.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t('admin.members.empty', userLanguage)}</p>
          {search && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('admin.members.emptySearch', userLanguage)}
            </p>
          )}
        </div>
      )}

      {/* ── Members table ─────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                <th className="py-3 pl-5 pr-3 text-left font-medium">{t('admin.members.table.member', userLanguage)}</th>
                <th className="px-3 py-3 text-left font-medium">{t('admin.members.table.role', userLanguage)}</th>
                <th className="px-3 py-3 text-left font-medium">{t('admin.members.table.joined', userLanguage)}</th>
                <th className="py-3 pl-3 pr-5 text-right font-medium">{t('admin.members.table.actions', userLanguage)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.member
                return (
                  <tr key={member.id} className="group hover:bg-muted transition-colors">
                    {/* Avatar + Name */}
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.displayName}
                            className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-surface-foreground">
                            {member.displayName}
                          </p>
                          {member.username && (
                            <p className="truncate text-xs text-muted-foreground">
                              @{member.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-3 py-3">
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          badge.className,
                        ].join(' ')}
                      >
                        {t(badge.labelKey, userLanguage)}
                      </span>
                    </td>

                    {/* Joined date */}
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {joinedDate(member.createdAt, userLanguage)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 pl-3 pr-5 text-right">
                      <Link
                        href={`/members/${member.id}`}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        {t('admin.members.viewProfile', userLanguage)}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {members.length === 1
              ? t('admin.members.count.one', userLanguage)
              : t('admin.members.count.many', userLanguage).replace('{count}', String(members.length))}
          </div>
        </div>
      )}
    </div>
  )
}
