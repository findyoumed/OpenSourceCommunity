'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const htmlLang = typeof document === 'undefined' ? 'en' : document.documentElement.lang
  const isKo = htmlLang === 'ko'

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="text-base font-semibold text-surface-foreground">
        {isKo ? '문제가 발생했습니다' : 'Something went wrong'}
      </h2>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
      >
        {isKo ? '다시 시도' : 'Try again'}
      </button>
    </div>
  )
}
