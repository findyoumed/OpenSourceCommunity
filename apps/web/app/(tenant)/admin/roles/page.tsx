import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { RoleSelector } from './role-selector'
import { t, type DictionaryKey } from '@/lib/i18n'
import { resolveLocalePreference } from '@/lib/language'

export async function generateMetadata(): Promise<Metadata> {
  const userLanguage = await getUserLanguage()
  return { title: `${t('admin.roles.title', userLanguage)} - ${t('admin.title', userLanguage)}` }
}

type MemberRole = 'guest' | 'member' | 'moderator' | 'org_admin'

interface Member {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  role: MemberRole
  createdAt: string
}

const ROLE_BADGE: Record<MemberRole, { labelKey: DictionaryKey; className: string }> = {
  guest: { labelKey: 'admin.role.guest', className: 'bg-muted text-muted-foreground' },
  member: { labelKey: 'admin.role.member', className: 'bg-blue-50 text-blue-700' },
  moderator: { labelKey: 'admin.role.moderator', className: 'bg-amber-50 text-amber-700' },
  org_admin: { labelKey: 'admin.role.org_admin', className: 'bg-brand/5 text-brand' },
}

async function getUserLanguage() {
  // [LOG: 20260528_1645] Dynamic language fallback matching cookies or headers
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  // [LOG: 20260528_1735] Replaced old locale pattern with resolveLocalePreference

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    return profile?.language ?? resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })
  } catch {
    return resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })
  }
}

export default async function RolesPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  const userLanguage = await getUserLanguage()

  let members: Member[] = []
  try {
    members = await apiGet<Member[]>('/api/members?limit=100', token, 30)
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">{t('admin.roles.title', userLanguage)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.roles.description', userLanguage)}
        </p>
      </div>

      {/* Role descriptions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          { role: 'org_admin', labelKey: 'admin.role.org_admin', descKey: 'admin.roles.desc.org_admin', className: 'border-brand/30 bg-brand/5' },
          { role: 'moderator', labelKey: 'admin.role.moderator', descKey: 'admin.roles.desc.moderator', className: 'border-amber-200 bg-amber-50' },
          { role: 'member', labelKey: 'admin.role.member', descKey: 'admin.roles.desc.member', className: 'border-blue-200 bg-blue-50' },
          { role: 'guest', labelKey: 'admin.role.guest', descKey: 'admin.roles.desc.guest', className: 'border-border bg-muted' },
        ] as const).map((r) => (
          <div key={r.role} className={['rounded-xl border p-4', r.className].join(' ')}>
            <p className="text-sm font-semibold text-surface-foreground">{t(r.labelKey, userLanguage)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t(r.descKey, userLanguage)}</p>
          </div>
        ))}
      </div>

      {/* Members table */}
      {members.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                <th className="py-3 pl-5 pr-3 text-left font-medium">{t('admin.members.table.member', userLanguage)}</th>
                <th className="px-3 py-3 text-left font-medium">{t('admin.roles.table.current', userLanguage)}</th>
                <th className="py-3 pl-3 pr-5 text-right font-medium">{t('admin.roles.table.change', userLanguage)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.member
                return (
                  <tr key={member.id} className="hover:bg-muted transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.displayName} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand flex-shrink-0">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-surface-foreground">{member.displayName}</p>
                          {member.username && <p className="text-xs text-muted-foreground">@{member.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badge.className].join(' ')}>
                        {t(badge.labelKey, userLanguage)}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <RoleSelector memberId={member.id} currentRole={member.role} token={token ?? ''} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {members.length === 1
              ? t('admin.roles.count.one', userLanguage)
              : t('admin.roles.count.many', userLanguage).replace('{count}', String(members.length))}
          </div>
        </div>
      )}
    </div>
  )
}
