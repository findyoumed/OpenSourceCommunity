import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { ProfileForm } from '../profile/profile-form'
import { LanguageSelect } from './language-select'

export const metadata: Metadata = { title: 'Settings' }

interface MemberProfile {
  id: string
  displayName: string
  username: string | null
  bio: string | null
  avatarUrl: string | null
  role: string
  language: string | null
  socialHandles?: Record<string, string>
}


export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const token = session.access_token

  let profile: MemberProfile | null = null
  try {
    profile = await apiGet<MemberProfile>('/api/me', token, 60)
  } catch { /* fall through */ }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load settings. Please try refreshing.
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, language, and account preferences</p>
      </div>

      {/* ── Edit Profile ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-surface-foreground">Edit Profile</h2>
        <p className="mb-5 text-sm text-muted-foreground">This is what other members see when they view your profile.</p>
        <ProfileForm
          token={token}
          initialValues={{
            displayName: profile.displayName,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            ...(profile.socialHandles ? { socialHandles: profile.socialHandles } : {}),
          }}
        />
      </section>

      {/* ── Language ───────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-surface-foreground">Language</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Content in forums and other modules will be translated to your chosen language on demand.
          You can also change this any time using the globe icon in the top bar.
        </p>
        <LanguageSelect current={profile.language} token={token} />
      </section>

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-base font-semibold text-surface-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">Control which emails and in-app alerts you receive.</p>
          </div>
          <Link
            href="/settings/notifications"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-surface-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
            Manage
          </Link>
        </div>
      </section>

      {/* ── Account ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-surface-foreground">Account</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Email and password are managed through your identity provider.
        </p>
        <div className="rounded-lg bg-muted border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium text-surface-foreground">{session.user.email}</p>
        </div>
      </section>
    </div>
  )
}

