'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TranslationProvider } from '@/lib/i18n-context'

/**
 * Client-side providers wrapper.
 *
 * Houses TanStack Query (and any future context providers) so that the root
 * layout itself can remain a Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per session — stable across re-renders via useState.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data fresh for 30 s before background-refetch
            staleTime: 30_000,
            // Retry once on failure (avoids hammering a flaky edge)
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* [LOG: 20260528_1357] Enable automatic browser language detection */}
      <TranslationProvider initialLang={null}>{children}</TranslationProvider>
    </QueryClientProvider>
  )
}
