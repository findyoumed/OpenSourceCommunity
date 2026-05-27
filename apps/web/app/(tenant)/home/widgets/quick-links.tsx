import Link from 'next/link'
import {
  MessageSquare, Lightbulb, Calendar, BookOpen,
  GraduationCap, Video, Users, ArrowRight, Compass,
} from 'lucide-react'
import type { ModuleKey } from '@/components/layout/sidebar'
import { WidgetShell } from './widget-shell'

// ─── Module link definitions ─────────────────────────────────────────────────

const MODULE_LINKS: Record<ModuleKey, { href: string; label: string; desc: string; icon: React.ElementType }> = {
  forums:        { href: '/forums',    label: 'Forums',        desc: 'Discussions & answers', icon: MessageSquare },
  ideas:         { href: '/ideas',     label: 'Ideas',         desc: 'Vote on what\'s next',   icon: Lightbulb },
  events:        { href: '/events',    label: 'Events',        desc: 'Upcoming meetups',       icon: Calendar },
  kb:            { href: '/kb',        label: 'Knowledge Base', desc: 'Guides & articles',     icon: BookOpen },
  courses:       { href: '/courses',   label: 'Courses',       desc: 'Structured learning',    icon: GraduationCap },
  webinars:      { href: '/webinars',  label: 'Webinars',      desc: 'Live & recorded',        icon: Video },
  chat:          { href: '/chat',      label: 'Chat',          desc: 'Real-time channels',     icon: MessageSquare },
  intelligence:  { href: '/intelligence', label: 'Intelligence', desc: 'Social monitoring',    icon: Lightbulb },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickLinks({
  enabledModules,
  lang,
}: {
  enabledModules: string[]
  lang?: string | null | undefined
}) {
  const isKo = lang === 'ko'

  const links = (enabledModules as ModuleKey[])
    .filter((m) => MODULE_LINKS[m])
    .map((m) => {
      const def = MODULE_LINKS[m]
      let label = def.label
      let desc = def.desc

      if (isKo) {
        if (m === 'forums') {
          label = '포럼 게시판'
          desc = '토론 및 답변 나누기'
        } else if (m === 'ideas') {
          label = '아이디어 건의'
          desc = '커뮤니티 건의 및 투표'
        } else if (m === 'events') {
          label = '이벤트/모임'
          desc = '온라인/오프라인 모임'
        } else if (m === 'kb') {
          label = '지식 베이스'
          desc = '유용한 가이드 및 기사'
        } else if (m === 'courses') {
          label = '온라인 강좌'
          desc = '체계적이고 검증된 학습'
        } else if (m === 'webinars') {
          label = '웨비나'
          desc = '라이브 방송 및 녹화 영상'
        } else if (m === 'chat') {
          label = '실시간 채팅'
          desc = '실시간 소통 채널'
        } else if (m === 'intelligence') {
          label = '인텔리전스'
          desc = '소셜 네트워크 모니터링'
        }
      }

      return { ...def, label, desc }
    })

  // Always append Members
  const allLinks = [
    ...links,
    {
      href: '/members',
      label: isKo ? '회원 목록' : 'Members',
      desc: isKo ? '커뮤니티 멤버들과 소통하기' : 'Connect with others',
      icon: Users,
    },
  ]

  return (
    <WidgetShell
      title={isKo ? '탐색' : 'Explore'}
      icon={<Compass className="h-4 w-4" />}
      size="sm"
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {allLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-center gap-3 px-5 py-3 hover:bg-muted transition-colors"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <link.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                {/* [LOG: 20260527_1215] */}
                <p className="text-xs font-semibold text-surface-foreground group-hover:text-brand transition-colors">
                  {link.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/40 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
