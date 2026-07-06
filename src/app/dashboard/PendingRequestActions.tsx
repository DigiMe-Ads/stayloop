'use client'

import { useFormStatus } from 'react-dom'
import { respondToSwap } from './actions'

function ActionButton({ children, variant }: { children: React.ReactNode; variant: 'accept' | 'decline' }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        variant === 'accept'
          ? 'flex-1 rounded-full bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60'
          : 'flex-1 rounded-full border border-border px-4 py-2 text-[14px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-60'
      }
    >
      {pending ? '…' : children}
    </button>
  )
}

export default function PendingRequestActions({ swapId }: { swapId: string }) {
  const acceptAction = respondToSwap.bind(null, swapId, 'accept')
  const declineAction = respondToSwap.bind(null, swapId, 'decline')

  return (
    <div className="mt-3 flex gap-2">
      <form action={acceptAction} className="flex-1">
        <ActionButton variant="accept">Accept</ActionButton>
      </form>
      <form action={declineAction} className="flex-1">
        <ActionButton variant="decline">Decline</ActionButton>
      </form>
    </div>
  )
}
