import Link from 'next/link'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { headers, cookies } from 'next/headers'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1645] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let lang = defaultLang
  if (token) {
    try {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      lang = profile?.language ?? defaultLang
    } catch {}
  }
  return { title: t('members.title', lang) }
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

const ROLE_BADGE_VARIANT: Record<MemberRole, React.ComponentProps<typeof Badge>['variant']> = {
  guest: 'secondary',
  member: 'blue',
  moderator: 'warning',
  org_admin: 'default',
}

const ROLE_LABEL_KEYS: Record<MemberRole, string> = {
  guest: 'admin.role.guest',
  member: 'admin.role.member',
  moderator: 'admin.role.moderator',
  org_admin: 'admin.role.org_admin',
}

function joinedDate(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', year: 'numeric' }).format(new Date(iso))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>
}) {
  const { search, role, page = '1' } = await searchParams

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1645] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  let lang = defaultLang
  if (token) {
    try {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      lang = profile?.language ?? defaultLang
    } catch {}
  }

  const qs = new URLSearchParams({ page, limit: '40' })
  if (search) qs.set('search', search)
  if (role) qs.set('role', role)

  let members: Member[] = []
  let fetchError = false

  try {
    members = await apiGet<Member[]>(`/api/members?${qs}`, token, 60)
  } catch {
    fetchError = true
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('members.title', lang)}
        description={t('members.description', lang)}
      />

      {/* Search & filter */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder={t('members.searchPlaceholder', lang)}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          name="role"
          defaultValue={role ?? ''}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t('members.allRoles', lang)}</option>
          <option value="member">{t('admin.role.member', lang)}</option>
          <option value="moderator">{t('admin.role.moderator', lang)}</option>
          <option value="org_admin">{t('admin.role.org_admin', lang)}</option>
        </select>

        <Button type="submit">{t('members.searchBtn', lang)}</Button>

        {(search || role) && (
          <Link
            href="/members"
            className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
          >
            {t('members.clearBtn', lang)}
          </Link>
        )}
      </form>

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('members.error', lang)}
        </div>
      )}

      {!fetchError && members.length === 0 && (search || role) && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={t('members.emptyTitle', lang)}
          description={t('members.emptyDesc', lang)}
        />
      )}

      {!fetchError && members.length === 0 && !search && !role && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={t('members.emptyTitle', lang)}
        />
      )}

      {members.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-brand/20 transition-all"
            >
              <Avatar
                src={member.avatarUrl}
                name={member.displayName}
                size="lg"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-surface-foreground">
                  {member.displayName}
                </p>
                {member.username && (
                  <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
                    {t(ROLE_LABEL_KEYS[member.role] as any, lang)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('members.joinedPrefix', lang)} {joinedDate(member.createdAt, lang)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {members.length === 40 && (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link
              href={`/members?${new URLSearchParams({ ...(search ? { search } : {}), ...(role ? { role } : {}), page: String(Number(page) + 1) })}`}
            >
              {t('members.loadMore', lang)}
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
