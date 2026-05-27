'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n-context'

export function ModerationActions({ reportId, token }: { reportId: string; token: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  const [busy, setBusy] = useState<string | null>(null)

  async function resolve(status: 'removed' | 'dismissed') {
    setBusy(status)
    try {
      await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-shrink-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => resolve('removed')}
        disabled={busy !== null}
        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
      >
        {busy === 'removed' ? '...' : t('admin.moderation.action.remove')}
      </button>
      <button
        type="button"
        onClick={() => resolve('dismissed')}
        disabled={busy !== null}
        className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        {busy === 'dismissed' ? '...' : t('admin.moderation.action.dismiss')}
      </button>
    </div>
  )
}
