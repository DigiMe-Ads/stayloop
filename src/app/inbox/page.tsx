import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InboxClient, { type ConversationSummary } from './InboxClient'

type Photo = { storage_path: string; sort_order: number }
type ParticipantRow = {
  user_id: string
  profile: { display_name: string | null; avatar_url: string | null } | null
}
type ConversationJoin = {
  id: string
  last_message_at: string | null
  listing: { title: string | null; listing_photos: Photo[] } | null
  participants: ParticipantRow[]
}
type Row = {
  conversation_id: string
  last_read_at: string | null
  conversation: ConversationJoin | null
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const { c } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/inbox')

  const { data } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id, last_read_at,
      conversation:conversations!conversation_participants_conversation_id_fkey (
        id, last_message_at,
        listing:listings!conversations_listing_id_fkey ( title, listing_photos(storage_path, sort_order) ),
        participants:conversation_participants!conversation_participants_conversation_id_fkey (
          user_id, profile:profiles!conversation_participants_user_id_fkey ( display_name, avatar_url )
        )
      )
    `)
    .eq('user_id', user.id)

  const rows = (data ?? []) as unknown as Row[]

  const conversations: ConversationSummary[] = rows
    .map((row) => {
      const conv = row.conversation
      if (!conv) return null
      const other = (conv.participants ?? []).find((p) => p.user_id !== user.id)
      const photos = [...(conv.listing?.listing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      const cover = photos[0]?.storage_path
        ? supabase.storage.from('listing-photos').getPublicUrl(photos[0].storage_path).data.publicUrl
        : null

      return {
        id: conv.id,
        listingTitle: conv.listing?.title ?? null,
        cover,
        otherName: other?.profile?.display_name ?? 'Member',
        otherAvatar: other?.profile?.avatar_url ?? null,
        lastMessageAt: conv.last_message_at,
        lastReadAt: row.last_read_at,
      }
    })
    .filter((c): c is ConversationSummary => c !== null)
    .sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime())

  return (
    <main>
      <InboxClient
        conversations={conversations}
        initialConversationId={c ?? conversations[0]?.id ?? null}
        currentUserId={user.id}
      />
    </main>
  )
}
