'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { apiClientPut } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslation } from '@/lib/i18n-context'

interface EventPref {
  eventType: string
  enabled: boolean
  frequency: 'instant' | 'daily' | 'weekly' | 'never'
}

interface Props {
  initialPrefs: Record<string, EventPref>
  token: string
  apiUrl: string
  lang?: string | null | undefined
}

const EVENT_GROUPS = [
  {
    key: 'forums',
    events: [
      { value: 'forums:post.created', labelKey: 'New reply to your thread' }, // Fix: these labels are still hardcoded in DB or logic, but UI needs keys
      { value: 'forums:thread.resolved', labelKey: 'Your thread is resolved' },
    ],
  },
  {
    key: 'ideas',
    events: [
      { value: 'ideas:idea.status_changed', labelKey: 'Your idea status changes' },
      { value: 'ideas:idea.voted', labelKey: 'Someone votes on your idea' },
    ],
  },
  {
    key: 'events',
    events: [
      { value: 'events:event.published', labelKey: 'New event published' },
    ],
  },
  {
    key: 'kb',
    events: [
      { value: 'kb:article.published', labelKey: 'New article published' },
    ],
  },
  {
    key: 'community',
    events: [
      { value: 'core:member.joined', labelKey: 'New member joins' },
    ],
  },
]

export function NotificationsClient({ initialPrefs, token: _token, apiUrl: _apiUrl, lang: _lang }: Props) {
  const { t } = useTranslation()

  const [prefs, setPrefs] = useState<Record<string, EventPref>>(() => {
    const defaults: Record<string, EventPref> = {}
    for (const group of EVENT_GROUPS) {
      for (const ev of group.events) {
        defaults[ev.value] = initialPrefs[ev.value] ?? {
          eventType: ev.value,
          enabled: true,
          frequency: 'instant',
        }
      }
    }
    return defaults
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const FREQ_OPTIONS: { value: 'instant' | 'daily' | 'weekly' | 'never'; labelKey: string }[] = [
    { value: 'instant', labelKey: 'settings.notifications.freq.instant' },
    { value: 'daily', labelKey: 'settings.notifications.freq.daily' },
    { value: 'weekly', labelKey: 'settings.notifications.freq.weekly' },
    { value: 'never', labelKey: 'settings.notifications.freq.never' },
  ]

  // Actual event labels (English fallback)
  const EVENT_LABELS: Record<string, string> = {
    'forums:post.created': t('settings.notifications.group.forums') === '포럼 게시판' ? '내 글에 새로운 답글이 달렸을 때' : 'New reply to your thread',
    'forums:thread.resolved': t('settings.notifications.group.forums') === '포럼 게시판' ? '내 글이 해결됨(Solved)으로 표시될 때' : 'Your thread is resolved',
    'ideas:idea.status_changed': t('settings.notifications.group.ideas') === '아이디어 건의' ? '내 아이디어의 상태가 변경되었을 때' : 'Your idea status changes',
    'ideas:idea.voted': t('settings.notifications.group.ideas') === '아이디어 건의' ? '누군가 내 아이디어를 추천했을 때' : 'Someone votes on your idea',
    'events:event.published': t('settings.notifications.group.events') === '이벤트/모임' ? '새로운 이벤트가 등록되었을 때' : 'New event published',
    'kb:article.published': t('settings.notifications.group.kb') === '지식 베이스' ? '새로운 가이드/아티클이 게시되었을 때' : 'New article published',
    'core:member.joined': t('settings.notifications.group.community') === '커뮤니티 활동' ? '새로운 멤버가 커뮤니티에 가입했을 때' : 'New member joins',
  }

  function setFrequency(eventType: string, frequency: 'instant' | 'daily' | 'weekly' | 'never') {
    setPrefs(prev => ({
      ...prev,
      [eventType]: { ...prev[eventType]!, eventType, enabled: frequency !== 'never', frequency },
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await apiClientPut('/api/me/email-preferences', { preferences: Object.values(prefs) })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.notifications.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {saved && (
        <Alert variant="success">
          <AlertDescription>{t('settings.notifications.saved')}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {EVENT_GROUPS.map(group => (
        <Card key={group.key}>
          <CardHeader>
            <CardTitle>{t(`settings.notifications.group.${group.key}` as any)}</CardTitle>
            <CardDescription>{t(`settings.notifications.desc.${group.key}` as any)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.events.map(ev => {
                const pref = prefs[ev.value]!
                return (
                  <div key={ev.value} className="flex items-center justify-between gap-4">
                    <p className="text-sm text-surface-foreground">{EVENT_LABELS[ev.value] || ev.value}</p>
                    <select
                      value={pref.frequency}
                      onChange={e => setFrequency(ev.value, e.target.value as 'instant' | 'daily' | 'weekly' | 'never')}
                      className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {FREQ_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey as any)}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? t('profile.saving') : t('settings.notifications.saveBtn')}
        </Button>
      </div>
    </div>
  )
}

