// [LOG: 20260527_1520]
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ChatRoom } from './chat-room'
import { t } from '@/lib/i18n'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string }>
}): Promise<Metadata> {
  const { channelId } = await params
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token
  let lang = 'en'
  let channelName = ''
  try {
    const [profile, channel] = await Promise.all([
      apiGet<{ language: string | null }>('/api/me', token, 60),
      apiGet<{ name: string }>(`/api/chat/channels/${channelId}`, token),
    ])
    lang = profile?.language ?? 'en'
    channelName = channel?.name ?? ''
  } catch {}
  
  const baseTitle = t('chat.title', lang)
  return { title: channelName ? `${channelName} — ${baseTitle}` : baseTitle }
}

interface Channel {
  id: string
  name: string
  description: string | null
}

interface Message {
  id: string
  channelId: string
  body: string
  createdAt: string | null
  editedAt: string | null
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
}

interface MemberProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  language: string | null
}

export default async function ChatChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const { channelId } = await params
  const supabase = await createClient()
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  let channel: Channel | null = null
  let initialMessages: Message[] = []
  let memberProfile: MemberProfile | null = null
  let userLanguage = 'en'

  try {
    const [cData, mData, pData] = await Promise.all([
      apiGet<Channel>(`/api/chat/channels/${channelId}`, token),
      apiGet<Message[]>(`/api/chat/channels/${channelId}/messages?limit=50`, token),
      apiGet<MemberProfile>('/api/me', token, 60),
    ])
    channel = cData
    initialMessages = mData
    memberProfile = pData
    userLanguage = pData?.language ?? 'en'
  } catch {
    notFound()
  }

  if (!channel) notFound()

  return (
    <ChatRoom
      channel={channel}
      initialMessages={initialMessages}
      token={token ?? ''}
      currentMemberId={memberProfile?.id ?? ''}
      currentMemberName={memberProfile?.displayName ?? t('chat.you', userLanguage)}
      currentMemberAvatarUrl={memberProfile?.avatarUrl ?? null}
    />
  )
}
