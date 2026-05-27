'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RichEditor } from '@/components/editor'
import { apiClientPost } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n-context'

interface IdeaCategory {
  id: string
  name: string
}

interface NewIdeaFormProps {
  categories: IdeaCategory[]
  token: string
  lang?: string | null | undefined
}

export function NewIdeaForm({
  categories,
  token: _token,
  lang: _lang,
}: NewIdeaFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow'
  const labelClass = 'block text-sm font-medium text-surface-foreground mb-1'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    if (!trimmedTitle) {
      setError(t('ideas.new.errorTitleRequired'))
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          title: trimmedTitle,
          body: trimmedBody,
        }
        if (category) payload.category = category

        const data = await apiClientPost<{ id: string }>('/api/ideas', payload)
        router.push(`/ideas/${data.id}`)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('ideas.new.errorGeneric')
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="idea-title" className={labelClass}>
            {t('ideas.new.fieldTitle')} <span className="text-red-500">*</span>
          </label>
          <input
            id="idea-title"
            type="text"
            required
            maxLength={300}
            placeholder={t('ideas.new.fieldTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Body */}
        <div>
          <label className={labelClass}>{t('ideas.new.fieldBody')}</label>
          <RichEditor
            value={body}
            onChange={setBody}
            placeholder={t('ideas.new.fieldBodyPlaceholder')}
            minHeight="200px"
            disabled={isPending}
          />
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div>
            <label htmlFor="idea-category" className={labelClass}>
              {t('ideas.new.fieldCategory')}
            </label>
            <select
              id="idea-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('ideas.new.fieldCategoryPlaceholder')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? t('ideas.new.submittingBtn') : t('ideas.new.submitBtn')}
        </button>
        <Link
          href="/ideas"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          {t('ideas.new.cancelBtn')}
        </Link>
      </div>
    </form>
  )
}

