import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ChatRoom } from './chat-room'

export const metadata: Metadata = { title: 'Chat' }

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

  try {
    [channel, initialMessages, memberProfile] = await Promise.all([
      apiGet<Channel>(`/api/chat/channels/${channelId}`, token),
      apiGet<Message[]>(`/api/chat/channels/${channelId}/messages?limit=50`, token),
      apiGet<MemberProfile>('/api/me', token, 60),
    ])
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
      currentMemberName={memberProfile?.displayName ?? 'You'}
      currentMemberAvatarUrl={memberProfile?.avatarUrl ?? null}
    />
  )
}
