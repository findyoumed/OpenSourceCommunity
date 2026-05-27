// [LOG: 20260527_1515]
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  let lang = 'en'
  try {
    const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
    lang = profile?.language ?? 'en'
  } catch {}
  return { title: t('chat.title', lang) }
}

interface Channel {
  id: string
  name: string
  slug: string
  description: string | null
  isPrivate: boolean | null
  createdAt: string | null
}

export default async function ChatPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let channels: Channel[] = []
  let userLanguage = 'en'
  try {
    const [channelsData, profile] = await Promise.all([
      apiGet<Channel[]>('/api/chat/channels', token, 0),
      apiGet<{ language: string | null }>('/api/me', token, 60),
    ])
    channels = channelsData
    userLanguage = profile?.language ?? 'en'
  } catch { /* show empty */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">
            {t('chat.title', userLanguage)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('chat.description', userLanguage)}
          </p>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t('chat.emptyTitle', userLanguage)}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/chat/${ch.id}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-border transition-all"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-lg">
                #
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-surface-foreground">{ch.name}</p>
                {ch.description && (
                  <p className="text-sm text-muted-foreground truncate">{ch.description}</p>
                )}
              </div>
              {ch.isPrivate && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {t('chat.private', userLanguage)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
