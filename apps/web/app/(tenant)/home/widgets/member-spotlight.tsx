import Link from 'next/link'
import { Users } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { WidgetShell } from './widget-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRow {
  id: string
  displayName: string
  username?: string
  avatarUrl?: string
  role: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function MemberSpotlight({
  token,
  lang,
}: {
  token: string | undefined
  lang?: string | null | undefined
}) {
  let members: MemberRow[] = []

  try {
    members = (await apiGet<MemberRow[]>('/api/members?limit=12', token, 120)) ?? []
  } catch {
    return null
  }

  if (members.length === 0) return null

  const isKo = lang === 'ko'

  return (
    <WidgetShell
      title={isKo ? '신규 가입 회원' : 'New Members'}
      icon={<Users className="h-4 w-4" />}
      href="/members"
      hrefLabel={isKo ? '전체 보기' : 'View all'}
      size="sm"
    >
      <div className="grid grid-cols-4 gap-3">
        {members.slice(0, 8).map((member) => (
          <Link
            key={member.id}
            href={`/members/${member.id}`}
            className="group flex flex-col items-center gap-1.5 text-center"
            title={member.displayName}
          >
            {/* [LOG: 20260527_1205] */}
            <div className="ring-2 ring-transparent group-hover:ring-brand/30 rounded-full transition-all">
              <Avatar
                src={member.avatarUrl ?? null}
                name={member.displayName}
                size="md"
              />
            </div>
            <span className="w-full text-[10px] text-muted-foreground truncate group-hover:text-brand transition-colors">
              {member.displayName.split(' ')[0]}
            </span>
          </Link>
        ))}
      </div>
    </WidgetShell>
  )
}
