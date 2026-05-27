import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { t, type DictionaryKey } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getUserLanguage()
  return { title: `${t('admin.integrations.title', lang)} - ${t('admin.title', lang)}` }
}

const INTEGRATIONS = [
  {
    name: 'Salesforce',
    descriptionKey: 'admin.integrations.salesforce.desc',
    icon: '\u2601\ufe0f',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'HubSpot',
    descriptionKey: 'admin.integrations.hubspot.desc',
    icon: '\ud83d\udd36',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'Slack',
    descriptionKey: 'admin.integrations.slack.desc',
    icon: '\ud83d\udcac',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'Zapier',
    descriptionKey: 'admin.integrations.zapier.desc',
    icon: '\u26a1',
    status: 'available',
    docsHref: '#',
  },
  {
    name: 'Webhooks',
    descriptionKey: 'admin.integrations.webhooks.desc',
    icon: '\ud83d\udd17',
    status: 'available',
    href: '/admin/integrations/webhooks',
  },
  {
    name: 'SSO / SAML',
    descriptionKey: 'admin.integrations.sso.desc',
    icon: '\ud83d\udd10',
    status: 'enterprise',
    docsHref: '#',
  },
] satisfies Array<{
  name: string
  descriptionKey: DictionaryKey
  icon: string
  status: 'available' | 'enterprise'
  docsHref?: string
  href?: string
}>

async function getUserLanguage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    return profile?.language ?? 'en'
  } catch {
    return 'en'
  }
}

export default async function IntegrationsPage() {
  const userLanguage = await getUserLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">
          {t('admin.integrations.title', userLanguage)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.integrations.description', userLanguage)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((intg) => (
          <div key={intg.name} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{intg.icon}</span>
                <p className="text-sm font-semibold text-surface-foreground">{intg.name}</p>
              </div>
              {intg.status === 'enterprise' && (
                <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">
                  {t('admin.integrations.status.enterprise', userLanguage)}
                </span>
              )}
            </div>
            <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
              {t(intg.descriptionKey, userLanguage)}
            </p>
            {'href' in intg && intg.href ? (
              <Link
                href={intg.href}
                className="flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-surface-foreground hover:bg-muted transition-colors"
              >
                {t('admin.integrations.action.configureArrow', userLanguage)}
              </Link>
            ) : (
              <button
                type="button"
                className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-surface-foreground hover:bg-muted transition-colors"
              >
                {intg.status === 'enterprise'
                  ? t('admin.integrations.action.configure', userLanguage)
                  : t('admin.integrations.action.connect', userLanguage)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
