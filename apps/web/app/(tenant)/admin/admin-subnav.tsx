'use client'

import { AdminNavLink } from './admin-nav-link'
import { useTranslation, type DictionaryKey } from '@/lib/i18n-context'

const NAV = [
  { labelKey: 'admin.nav.overview', href: '/admin' },
  { labelKey: 'admin.nav.members', href: '/admin/members' },
  { labelKey: 'admin.nav.moderation', href: '/admin/moderation' },
  { labelKey: 'admin.nav.roles', href: '/admin/roles' },
  { labelKey: 'admin.nav.branding', href: '/admin/branding' },
  { labelKey: 'admin.nav.integrations', href: '/admin/integrations' },
] satisfies Array<{ labelKey: DictionaryKey; href: string }>

export function AdminSubnav() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5">
      {NAV.map((item) => (
        <AdminNavLink key={item.href} href={item.href} label={t(item.labelKey)} />
      ))}
    </div>
  )
}
