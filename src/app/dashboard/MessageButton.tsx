'use client'

import { MessageCircle } from 'lucide-react'
import { messageAboutSwap } from './actions'

export default function MessageButton({ listingId, otherUserId }: { listingId: string; otherUserId: string }) {
  const action = messageAboutSwap.bind(null, listingId, otherUserId)

  return (
    <form action={action}>
      <button
        type="submit"
        aria-label="Message"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <MessageCircle size={16} />
      </button>
    </form>
  )
}
