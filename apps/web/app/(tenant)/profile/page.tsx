import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Settings, MessageCircle, ExternalLink } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { t, type DictionaryKey } from '@/lib/i18n'

// [LOG: 20260527_1720]

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  let lang = 'en'
  if (token) {
    try {
      const profile = await apiGet<{ language: string | null }>('/api/me', token, 60)
      lang = profile?.language ?? 'en'
    } catch {}
  }
  return { title: t('profile.title', lang) }
}

interface MemberProfile {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  role: string
  createdAt: string
  language?: string | null
  socialHandles?: Record<string, string>
}

const ROLE_LABEL_KEYS: Record<string, string> = {
  org_admin: 'admin.role.org_admin',
  moderator: 'admin.role.moderator',
  member: 'admin.role.member',
  guest: 'admin.role.guest',
}

function joinedDate(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let profile: MemberProfile | null = null
  let lang = 'en'
  try {
    profile = await apiGet<MemberProfile>('/api/me', session.access_token, 60)
    lang = profile?.language ?? 'en'
  } catch { /* fall through */ }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {t('profile.errorLoad', lang)}
      </div>
    )
  }

  const isElevated = profile.role === 'org_admin' || profile.role === 'moderator'
  const handles = profile.socialHandles ?? {}

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-foreground">{t('profile.title', lang)}</h1>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-surface-foreground hover:bg-muted transition-colors"
        >
          <Settings className="h-4 w-4" />
          {t('profile.editSettings', lang)}
        </Link>
      </div>

      {/* Identity card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-5">
          <Avatar src={profile.avatarUrl} name={profile.displayName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-surface-foreground">{profile.displayName}</h2>
              {isElevated && (
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {t((ROLE_LABEL_KEYS[profile.role] || 'admin.role.member') as DictionaryKey, lang)}
                </span>
              )}
            </div>
            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {t('profile.memberSince', lang)} {joinedDate(profile.createdAt, lang)}
            </p>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-5 text-sm text-surface-foreground leading-relaxed whitespace-pre-wrap border-t border-border pt-5">
            {profile.bio}
          </p>
        )}

        {/* Social links */}
        {(handles.twitter || handles.linkedin || handles.reddit) && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
            {handles.twitter && (
              <a
                href={`https://x.com/${handles.twitter.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {handles.twitter.startsWith('@') ? handles.twitter : `@${handles.twitter}`}
              </a>
            )}
            {handles.linkedin && (
              <a
                href={`https://linkedin.com/in/${handles.linkedin.replace(/^linkedin\.com\/in\//, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                LinkedIn
              </a>
            )}
            {handles.reddit && (
              <a
                href={`https://reddit.com/user/${handles.reddit.replace(/^u\//, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                {handles.reddit.startsWith('u/') ? handles.reddit : `u/${handles.reddit}`}
              </a>
            )}
          </div>
        )}

        {!profile.bio && !handles.twitter && !handles.linkedin && !handles.reddit && (
          <p className="mt-4 text-sm text-muted-foreground italic border-t border-border pt-4">
            {t('profile.noBio', lang)}{' '}
            <Link href="/settings" className="text-brand hover:underline">
              {t('profile.addBioLink', lang)}
            </Link>
          </p>
        )}
      </div>

      {/* How others see you */}
      <div className="rounded-xl border border-border bg-muted/40 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          {t('profile.appearanceNotice', lang)}{' '}
          <Link href="/settings" className="text-brand hover:underline font-medium">
            {t('profile.editSettingsLink', lang)}
          </Link>
        </p>
      </div>
    </div>
  )
}
