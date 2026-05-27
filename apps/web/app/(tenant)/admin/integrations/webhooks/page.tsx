import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { WebhooksClient } from './webhooks-client'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getAdminContext().then((ctx) => ctx.userLanguage)
  return { title: `${t('admin.webhooks.title', lang)} - ${t('admin.integrations.title', lang)}` }
}

interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  enabled: boolean
  createdAt: string
}

async function getAdminContext() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  let userLanguage = 'en'
  try {
    const profile = await apiGet<{ role: string; language: string | null }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
    userLanguage = profile.language ?? 'en'
  } catch {}

  return { token, isAdmin, userLanguage }
}

export default async function WebhooksPage() {
  const { token, isAdmin, userLanguage } = await getAdminContext()

  if (!isAdmin) redirect('/admin')

  let webhooks: Webhook[] = []
  try {
    webhooks = await apiGet<Webhook[]>('/api/admin/webhooks', token, 0)
  } catch {}

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">
          {t('admin.webhooks.title', userLanguage)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.webhooks.description', userLanguage)}{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">X-Webhook-Signature: sha256=...</code>
        </p>
      </div>

      <WebhooksClient
        initialWebhooks={webhooks}
        token={token ?? ''}
        apiUrl={apiUrl}
      />
    </div>
  )
}
