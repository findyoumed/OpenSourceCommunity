'use client'

import { useState, useTransition } from 'react'
import { useTranslation } from '@/lib/i18n-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterButtonProps {
  webinarId: string
  initialIsRegistered: boolean
  registrationCount: number
  maxAttendees: number | null
  token: string
  lang?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { apiClientPost, apiClientDelete } from '@/lib/api-client'

async function postRegister(webinarId: string): Promise<void> {
  await apiClientPost(`/api/webinars/${webinarId}/register`, {})
}

async function deleteRegister(webinarId: string): Promise<void> {
  await apiClientDelete(`/api/webinars/${webinarId}/register`)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterButton({
  webinarId,
  initialIsRegistered,
  registrationCount,
  maxAttendees,
  token: _token,
  lang: _lang,
}: RegisterButtonProps) {
  const { t } = useTranslation()
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered)
  const [count, setCount] = useState(registrationCount)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const seatsLeft = maxAttendees != null ? maxAttendees - count : null
  const isFull = seatsLeft != null && seatsLeft <= 0 && !isRegistered

  async function handleToggle() {
    const prevRegistered = isRegistered
    const prevCount = count

    // Optimistic update
    setIsRegistered(!prevRegistered)
    setCount((n) => (prevRegistered ? n - 1 : n + 1))
    setError(null)

    startTransition(async () => {
      try {
        if (prevRegistered) {
          await deleteRegister(webinarId)
        } else {
          await postRegister(webinarId)
        }
      } catch (err) {
        // Roll back
        setIsRegistered(prevRegistered)
        setCount(prevCount)
        setError(err instanceof Error ? err.message : t('profile.errorDefault'))
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Seat count */}
      {maxAttendees != null && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-surface-foreground">{count.toLocaleString()}</span>
          {' / '}
          {maxAttendees.toLocaleString()} {t('webinars.detail.seatsFilled')}
          {seatsLeft != null && seatsLeft > 0 && (
            <span className="ml-1 text-emerald-600">({seatsLeft} {t('webinars.detail.seatsLeft')})</span>
          )}
          {seatsLeft === 0 && !isRegistered && (
            <span className="ml-1 text-rose-600">({t('webinars.detail.full')})</span>
          )}
        </p>
      )}

      {maxAttendees == null && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-surface-foreground">{count.toLocaleString()}</span> {t('webinars.registered')}
        </p>
      )}

      <button
        type="button"
        disabled={isPending || isFull}
        onClick={handleToggle}
        className={[
          'w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60',
          isRegistered
            ? 'border border-border bg-card text-surface-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            : 'bg-brand text-white hover:opacity-90',
        ].join(' ')}
      >
        {isPending
          ? isRegistered
            ? t('webinars.detail.cancellingBtn')
            : t('webinars.detail.registeringBtn')
          : isRegistered
            ? t('webinars.detail.cancelBtn')
            : isFull
              ? t('webinars.detail.fullBtn')
              : t('webinars.detail.registerBtn')}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

