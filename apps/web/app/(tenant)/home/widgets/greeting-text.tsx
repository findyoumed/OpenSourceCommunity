'use client'

import { useEffect, useState } from 'react'

// [LOG: 20260528_1423] Client-side greeting helper
function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function GreetingText({
  displayName,
  lang,
}: {
  displayName: string
  lang?: string | null
}) {
  const [greeting, setGreeting] = useState(() => {
    // Safe default to avoid server-client hydration mismatch
    return lang === 'ko' ? '좋은 하루입니다' : 'Good day'
  })

  useEffect(() => {
    const hour = new Date().getHours()
    const isKo = lang === 'ko'
    const computedGreeting = isKo
      ? (hour < 12 ? '좋은 아침입니다' : hour < 17 ? '즐거운 오후입니다' : '행복한 저녁입니다')
      : greetingFor(hour)
    setGreeting(computedGreeting)
  }, [lang])

  return (
    <span>
      {greeting}{displayName ? ` · ${displayName}` : ''}
    </span>
  )
}
