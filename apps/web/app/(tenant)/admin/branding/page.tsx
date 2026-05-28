import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { BrandingForm } from './branding-form'
import { t } from '@/lib/i18n'
import { resolveLocalePreference } from '@/lib/language'

export async function generateMetadata(): Promise<Metadata> {
  const { userLanguage } = await getBrandingContext()
  return { title: `${t('admin.branding.title', userLanguage)} - ${t('admin.title', userLanguage)}` }
}

interface TenantConfig {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  slug: string
}

async function getBrandingContext() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1645] Dynamic language fallback matching cookies or headers
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  // [LOG: 20260528_1735] Replaced old locale pattern with resolveLocalePreference

  let userLanguage = resolveLocalePreference({ cookieLanguage: cookieLang, acceptLanguage })
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    userLanguage = resolveLocalePreference({ profileLanguage: profile?.language, cookieLanguage: cookieLang, acceptLanguage })
  } catch {}
  return { token, userLanguage }
}

export default async function BrandingPage() {
  const { token, userLanguage } = await getBrandingContext()

  let tenant: TenantConfig | null = null
  try {
    tenant = await apiGet<TenantConfig>('/api/tenant', token, 30)
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">{t('admin.branding.title', userLanguage)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.branding.description', userLanguage)}</p>
      </div>
      <BrandingForm
        initialName={tenant?.name ?? ''}
        initialLogoUrl={tenant?.logoUrl ?? ''}
        initialColor={tenant?.primaryColor ?? '#6366f1'}
        token={token ?? ''}
      />
    </div>
  )
}
