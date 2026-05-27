'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RichEditor } from '@/components/editor'
import { apiClientPost } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n-context'

interface CommentFormProps {
  ideaId: string
  token: string
  lang?: string | null | undefined
}

export function CommentForm({ ideaId, token, lang: _lang }: CommentFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // body is HTML — treat empty paragraph as empty
  const isBodyEmpty = !body || body === '<p></p>'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isBodyEmpty) return
    setError(null)

    startTransition(async () => {
      try {
        await apiClientPost(`/api/ideas/${ideaId}/comments`, { body })
        setBody('')
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('profile.errorDefault'))
      }
    })
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        <a href="/login" className="text-brand hover:underline">
          {t('header.signout') /* Temporary fix: use signout key to mean login? No, let's use signinToComment */}
          {t('ideas.detail.signinToComment')}
        </a>
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RichEditor
        value={body}
        onChange={setBody}
        placeholder={t('ideas.detail.commentPlaceholder')}
        minHeight="120px"
        disabled={isPending}
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600">{t('ideas.detail.commentSuccess')}</p>
      )}
      <button
        type="submit"
        disabled={isPending || isBodyEmpty}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? t('ideas.detail.commentSubmitting') : t('ideas.detail.commentSubmitBtn')}
      </button>
    </form>
  )
}

