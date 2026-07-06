'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type ConversationSummary = {
  id: string
  listingTitle: string | null
  cover: string | null
  otherName: string
  otherAvatar: string | null
  lastMessageAt: string | null
  lastReadAt: string | null
}

// Best-effort shape — read_messages() is a SECURITY DEFINER RPC whose exact
// return columns aren't visible without a live DB session; if the real
// column names differ from id/sender_id/body/created_at, this is the first
// place to check.
type Message = { id: string; sender_id: string; body: string; created_at: string }

export default function InboxClient({
  conversations,
  initialConversationId,
  currentUserId,
}: {
  conversations: ConversationSummary[]
  initialConversationId: string | null
  currentUserId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialConversationId)
  const [messages, setMessages] = useState<Message[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThread = useCallback(async (id: string) => {
    const { data, error } = await supabase.rpc('read_messages', { p_conversation: id, p_limit: 50 })
    if (!error && Array.isArray(data)) {
      setMessages([...(data as Message[])].reverse())
    }
  }, [supabase])

  useEffect(() => {
    // loadThread's setState runs after an internal await, not synchronously within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedId) loadThread(selectedId)
  }, [selectedId, loadThread])

  useEffect(() => {
    conversations.forEach(async (c) => {
      const { data } = await supabase.rpc('read_messages', { p_conversation: c.id, p_limit: 1 })
      const last = Array.isArray(data) ? (data as Message[])[0] : null
      if (last) setPreviews((prev) => ({ ...prev, [c.id]: last.body }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const channel = supabase.channel(`conversation:${selectedId}`, { config: { private: true } })
    channel.on('broadcast', { event: '*' }, () => loadThread(selectedId))
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedId, supabase, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!draft.trim() || !selectedId) return
    setSending(true)
    setSendError(null)
    const body = draft.trim()
    setDraft('')

    const optimisticId = `pending-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, sender_id: currentUserId, body, created_at: new Date().toISOString() },
    ])

    const { error } = await supabase.rpc('send_message', { p_conversation: selectedId, p_body: body })
    if (!error) {
      await loadThread(selectedId)
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setSendError(error.message)
      setDraft(body)
    }
    setSending(false)
  }

  function selectConversation(id: string) {
    setSelectedId(id)
    setSendError(null)
    router.replace(`/inbox?c=${id}`, { scroll: false })
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Inbox</h1>

      <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-2xl border border-border lg:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <div className="divide-y divide-border border-b border-border lg:max-h-[600px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {conversations.length === 0 ? (
            <p className="p-6 text-[14px] text-muted-foreground">No conversations yet.</p>
          ) : (
            conversations.map((c) => {
              const unread = !!c.lastMessageAt && (!c.lastReadAt || new Date(c.lastMessageAt) > new Date(c.lastReadAt))
              return (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted ${selectedId === c.id ? 'bg-muted' : ''}`}
                >
                  <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                    {c.cover && <Image src={c.cover} alt="" fill className="object-cover" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[14px] font-semibold text-foreground">{c.otherName}</p>
                      {unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                    </div>
                    {c.listingTitle && <p className="truncate text-[12px] text-muted-foreground">{c.listingTitle}</p>}
                    <p className="truncate text-[13px] text-muted-foreground">{previews[c.id] ?? '…'}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Thread */}
        <div className="flex h-[600px] flex-col">
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center text-[14px] text-muted-foreground">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-muted">
                  {selectedConversation.cover && (
                    <Image src={selectedConversation.cover} alt="" fill className="object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground">{selectedConversation.otherName}</p>
                  {selectedConversation.listingTitle && (
                    <p className="text-[12px] text-muted-foreground">{selectedConversation.listingTitle}</p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 text-[14px] ${
                        m.sender_id === currentUserId ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border p-4">
                {sendError && (
                  <p className="mb-2 text-[13px] text-destructive">Message failed to send: {sendError}</p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend()
                    }}
                    placeholder="Write a message…"
                    className="flex-1 rounded-full border border-border px-4 py-2.5 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
