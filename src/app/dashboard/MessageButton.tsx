'use client'

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20l1-5.5A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
      </button>
    </form>
  )
}
