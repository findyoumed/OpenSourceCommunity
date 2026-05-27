import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { ModuleKey } from '@/components/layout/sidebar'
import { resolveWidgets, type HomepageConfig } from './widgets/types'

// ─── Widget imports ───────────────────────────────────────────────────────────

import WelcomeBar from './widgets/welcome-bar'
import CategoriesGrid from './widgets/categories-grid'
import HotDiscussions from './widgets/hot-discussions'
import TrendingIdeas from './widgets/trending-ideas'
import UpcomingEvents from './widgets/upcoming-events'
import RecentArticles from './widgets/recent-articles'
import FeaturedCourses from './widgets/featured-courses'
import UpcomingWebinars from './widgets/upcoming-webinars'
import MemberSpotlight from './widgets/member-spotlight'
import ActivityFeed from './widgets/activity-feed'
import QuickLinks from './widgets/quick-links'

export const metadata: Metadata = { title: 'Home' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantConfig {
  id: string
  name: string
  slug: string
  enabledModules: ModuleKey[]
  settings?: { homepage?: HomepageConfig }
}

interface MemberProfile {
  role: 'member' | 'moderator' | 'org_admin'
  language?: string | null
}

// ─── Widget renderer ──────────────────────────────────────────────────────────

function renderWidget(
  id: string,
  token: string | undefined,
  tenantName: string,
  enabledModules: string[],
  isAdmin: boolean,
  lang: string | null | undefined
) {
  switch (id) {
    case 'welcome':           return <WelcomeBar key={id} token={token} tenantName={tenantName} lang={lang} />
    case 'categories-grid':  return <CategoriesGrid key={id} enabledModules={enabledModules} isAdmin={isAdmin} lang={lang} />
    case 'hot-discussions':   return <HotDiscussions key={id} token={token} lang={lang} />
    case 'trending-ideas':    return <TrendingIdeas key={id} token={token} lang={lang} />
    case 'upcoming-events':   return <UpcomingEvents key={id} token={token} lang={lang} />
    case 'recent-articles':   return <RecentArticles key={id} token={token} lang={lang} />
    case 'featured-courses':  return <FeaturedCourses key={id} token={token} lang={lang} />
    case 'upcoming-webinars': return <UpcomingWebinars key={id} token={token} lang={lang} />
    case 'member-spotlight':  return <MemberSpotlight key={id} token={token} lang={lang} />
    case 'activity-feed':     return <ActivityFeed key={id} token={token} lang={lang} />
    case 'quick-links':       return <QuickLinks key={id} enabledModules={enabledModules} lang={lang} />
    default:                  return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CommunityHomePage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let tenantConfig: TenantConfig = {
    id: '',
    name: 'Community',
    slug: 'community',
    enabledModules: ['forums', 'ideas'],
  }
  let isAdmin = false
  let userLang: string | null | undefined = 'en'

  try {
    const [data, profile] = await Promise.all([
      apiGet<TenantConfig>('/api/tenant', token, 300),
      apiGet<MemberProfile>('/api/me', token, 60),
    ])
    if (data) tenantConfig = data
    isAdmin = profile?.role === 'org_admin'
    userLang = profile?.language
  } catch {
    // fall back to defaults — page still renders
  }

  const widgets = resolveWidgets(
    tenantConfig.settings?.homepage ?? null,
    tenantConfig.enabledModules
  )

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      style={{ gridAutoFlow: 'dense' }}
    >
      {/* [LOG: 20260527_1127] */}
      {widgets.map((w) =>
        renderWidget(w.id, token, tenantConfig.name, tenantConfig.enabledModules, isAdmin, userLang)
      )}
    </div>
  )
}
