// [LOG: 20260527_1735]
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { Sidebar, type ModuleKey } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { TranslationProvider } from '@/lib/i18n-context'
import { headers, cookies } from 'next/headers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantConfig {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  primaryColor?: string | null
  enabledModules: ModuleKey[]
  settings?: Record<string, unknown>
}

interface MemberProfile {
  id: string
  displayName: string
  avatarUrl?: string
  role: 'member' | 'moderator' | 'org_admin'
  language?: string | null
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const token = (await supabase.auth.getSession()).data.session?.access_token

  // [LOG: 20260528_1518] Read language preference from server-side cookies or browser Accept-Language headers to solve Edge environment mismatches
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('NEXT_LOCALE')?.value

  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const prefersKorean = acceptLanguage.toLowerCase().includes('ko')
  const defaultLang = cookieLang ?? (prefersKorean ? 'ko' : 'en')

  // ── Fetch tenant config + member profile in parallel ───────────────────────
  let tenantConfig: TenantConfig = {
    id: 'default',
    name: 'Community',
    slug: 'default',
    enabledModules: ['forums', 'ideas'],
  }
  let memberProfile: MemberProfile | null = null

  try {
    // [LOG: 20260527_1657]
    if (token) {
      const [config, profile] = await Promise.all([
        apiGet<TenantConfig>('/api/tenant', token, 300),
        apiGet<MemberProfile>('/api/me', token, 60),
      ])
      tenantConfig = config
      memberProfile = profile
    } else {
      tenantConfig = await apiGet<TenantConfig>('/api/tenant', undefined, 300)
    }
  } catch (err) {
    // Non-fatal — fall back to defaults so the shell still renders.
    console.error('[TenantLayout] Failed to fetch tenant config or profile:', err)
  }

  const isAdmin = memberProfile?.role === 'org_admin'

  const brandStyle = tenantConfig.primaryColor
    ? ({ '--color-brand': tenantConfig.primaryColor } as React.CSSProperties)
    : undefined

  const resolvedLang = memberProfile?.language ?? defaultLang

  return (
    <TranslationProvider initialLang={resolvedLang}>
      <div className="min-h-screen bg-muted/30" style={brandStyle}>
        {/* Sidebar */}
        <Sidebar
          enabledModules={tenantConfig.enabledModules}
          isAdmin={isAdmin}
          tenantName={tenantConfig.name}
          tenantLogoUrl={tenantConfig.logoUrl ?? null}
        />

        {/* Header */}
        <Header
          tenantName={tenantConfig.name}
          tenantLogoUrl={tenantConfig.logoUrl ?? null}
          userName={memberProfile?.displayName}
          userAvatarUrl={memberProfile?.avatarUrl}
          userEmail={user?.email}
          userLanguage={memberProfile?.language ?? null}
          token={token}
        />

        {/* Main content — offset by sidebar width on desktop, header height on all viewports */}
        <main className="lg:pl-64 pt-16">
          <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </TranslationProvider>
  )
}

