'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClientPost, apiClientPut, apiClientDelete, apiClientGet } from '@/lib/api-client'
import { useTranslation, type DictionaryKey } from '@/lib/i18n-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'

const ALL_EVENTS = [
  { value: 'forums:thread.created', labelKey: 'admin.webhooks.event.forumsThreadCreated' },
  { value: 'forums:post.created', labelKey: 'admin.webhooks.event.forumsPostCreated' },
  { value: 'forums:thread.resolved', labelKey: 'admin.webhooks.event.forumsThreadResolved' },
  { value: 'ideas:idea.created', labelKey: 'admin.webhooks.event.ideaCreated' },
  { value: 'ideas:idea.voted', labelKey: 'admin.webhooks.event.ideaVoted' },
  { value: 'ideas:idea.status_changed', labelKey: 'admin.webhooks.event.ideaStatusChanged' },
  { value: 'events:event.published', labelKey: 'admin.webhooks.event.eventPublished' },
  { value: 'events:event.rsvp', labelKey: 'admin.webhooks.event.eventRsvp' },
  { value: 'courses:course.completed', labelKey: 'admin.webhooks.event.courseCompleted' },
  { value: 'courses:lesson.completed', labelKey: 'admin.webhooks.event.lessonCompleted' },
  { value: 'kb:article.published', labelKey: 'admin.webhooks.event.kbArticlePublished' },
  { value: 'social-intel:alert.triggered', labelKey: 'admin.webhooks.event.socialIntelAlert' },
  { value: 'social-intel:mention.received', labelKey: 'admin.webhooks.event.socialMentionReceived' },
  { value: 'core:member.joined', labelKey: 'admin.webhooks.event.memberJoined' },
  { value: 'core:member.role_changed', labelKey: 'admin.webhooks.event.memberRoleChanged' },
] satisfies Array<{ value: string; labelKey: DictionaryKey }>

interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  enabled: boolean
  createdAt: string
}

interface Delivery {
  id: string
  eventType: string
  status: string
  attempts: number
  responseStatus: number | null
  createdAt: string
}

interface Props {
  initialWebhooks: Webhook[]
  token: string
  apiUrl: string
}

export function WebhooksClient({ initialWebhooks, token: _token, apiUrl: _apiUrl }: Props) {
  const { t } = useTranslation()
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [newSecret, setNewSecret] = useState('')

  async function createWebhook() {
    if (!newUrl || newEvents.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const created = await apiClientPost<Webhook>('/api/admin/webhooks', {
        url: newUrl,
        events: newEvents,
        secret: newSecret || undefined,
      })
      setWebhooks(prev => [created, ...prev])
      setShowCreate(false)
      setNewUrl('')
      setNewEvents([])
      setNewSecret('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.webhooks.error.create'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    try {
      const updated = await apiClientPut<Webhook>(`/api/admin/webhooks/${id}`, { enabled })
      setWebhooks(prev => prev.map(w => w.id === id ? updated : w))
    } catch {
      // silent — user can retry
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm(t('admin.webhooks.confirmDelete'))) return
    try {
      await apiClientDelete(`/api/admin/webhooks/${id}`)
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch {
      // silent — user can retry
    }
  }

  async function loadDeliveries(id: string) {
    if (deliveries[id]) { setExpandedId(expandedId === id ? null : id); return }
    try {
      const data = await apiClientGet<Delivery[]>(`/api/admin/webhooks/${id}/deliveries`)
      setDeliveries(prev => ({ ...prev, [id]: data }))
    } catch {
      // silent
    }
    setExpandedId(expandedId === id ? null : id)
  }

  function toggleEvent(val: string) {
    setNewEvents(prev =>
      prev.includes(val) ? prev.filter(e => e !== val) : [...prev, val]
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {webhooks.length === 1
            ? t('admin.webhooks.count.one')
            : t('admin.webhooks.count.many').replace('{count}', String(webhooks.length))}
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> {t('admin.webhooks.add')}
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState
          icon={<Webhook className="h-6 w-6" />}
          title={t('admin.webhooks.empty.title')}
          description={t('admin.webhooks.empty.description')}
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> {t('admin.webhooks.add')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map(hook => (
            <Card key={hook.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-foreground">{hook.url}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {hook.events.map(e => (
                        <Badge key={e} variant="secondary" className="text-[10px]">
                          {ALL_EVENTS.find(ev => ev.value === e)?.labelKey
                            ? t(ALL_EVENTS.find(ev => ev.value === e)!.labelKey)
                            : e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={hook.enabled ? 'success' : 'secondary'}>
                      {hook.enabled ? t('admin.webhooks.status.active') : t('admin.webhooks.status.paused')}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWebhook(hook.id, !hook.enabled)}
                    >
                      {hook.enabled ? t('admin.webhooks.action.pause') : t('admin.webhooks.action.resume')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteWebhook(hook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => loadDeliveries(hook.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-surface-foreground"
                    >
                      {t('admin.webhooks.action.deliveries')} {expandedId === hook.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {expandedId === hook.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">{t('admin.webhooks.deliveries.recent')}</p>
                    {(deliveries[hook.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('admin.webhooks.deliveries.empty')}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {deliveries[hook.id]!.map(d => (
                          <div key={d.id} className="flex items-center gap-3 text-xs">
                            <Badge
                              variant={d.status === 'success' ? 'success' : d.status === 'failed' ? 'destructive' : 'secondary'}
                              className="text-[10px]"
                            >
                              {d.status}
                            </Badge>
                            <span className="font-mono text-muted-foreground">{d.eventType}</span>
                            {d.responseStatus && (
                              <span className="text-muted-foreground">HTTP {d.responseStatus}</span>
                            )}
                            <span className="ml-auto text-muted-foreground">
                              {new Date(d.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.webhooks.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.webhooks.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-foreground">
                {t('admin.webhooks.field.endpoint')}
              </label>
              <Input
                type="url"
                placeholder="https://your-app.com/webhooks/community"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-foreground">
                {t('admin.webhooks.field.secret')}{' '}
                <span className="text-muted-foreground font-normal">{t('admin.webhooks.field.optionalAuto')}</span>
              </label>
              <Input
                type="text"
                placeholder={t('admin.webhooks.field.secretPlaceholder')}
                value={newSecret}
                onChange={e => setNewSecret(e.target.value)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-surface-foreground">{t('admin.webhooks.field.events')}</p>
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border p-3">
                {ALL_EVENTS.map(ev => (
                  <label key={ev.value} className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={newEvents.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                      className="h-3.5 w-3.5 rounded accent-brand"
                    />
                    {t(ev.labelKey)}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('admin.webhooks.action.cancel')}</Button>
            <Button onClick={createWebhook} disabled={saving || !newUrl || newEvents.length === 0}>
              {saving ? t('admin.webhooks.action.creating') : t('admin.webhooks.action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
