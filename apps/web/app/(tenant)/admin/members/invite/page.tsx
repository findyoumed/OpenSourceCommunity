import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { t } from '@/lib/i18n'
import { resolveLocalePreference } from '@/lib/language'

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

export async function generateMetadata(): Promise<Metadata> {
  const userLanguage = await getUserLanguage()
  return { title: `${t('admin.members.invite', userLanguage)} - ${t('admin.title', userLanguage)}` }
}

export default async function InviteMemberPage() {
  const userLanguage = await getUserLanguage()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-foreground">{t('admin.members.invite', userLanguage)}</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t('admin.members.inviteComingSoon', userLanguage)}</p>
      </div>
    </div>
  )
}
