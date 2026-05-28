'use client'

import { Search } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

// [LOG: 20260528_1443] Direct routing to forums page on Enter, completely skipping popups
export default function DashboardSearchButton({
  lang,
}: {
  lang?: string | null
}) {
  const isKo = lang === 'ko'
  const [localQuery, setLocalQuery] = useState('')
  const router = useRouter()

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localQuery.trim().length > 0) {
      // [LOG: 20260528_1508] Seamless full-page redirect to the global search page carrying the query, skipping modals
      router.push(`/search?q=${encodeURIComponent(localQuery.trim())}`)
    }
  }

  return (
    <div className="relative flex-1 w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Search className="h-4 w-4 text-white/40" />
      </div>
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isKo
            ? '토론, 건의사항, 멤버 검색 (입력 후 Enter)...'
            : 'Search discussions, ideas, members (Press Enter)…'
        }
        className="block w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/40 backdrop-blur-sm transition-all focus:border-white/30 focus:outline-none focus:ring-0"
      />
    </div>
  )
}
