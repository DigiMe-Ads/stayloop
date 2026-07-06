'use client'

import { useState, useTransition } from 'react'
import { reviewVerification, getSignedDocUrl } from './actions'

export default function VerificationReviewActions({ verificationId }: { verificationId: string }) {
  const [pending, startTransition] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [viewError, setViewError] = useState<string | null>(null)

  function approve() {
    startTransition(async () => {
      await reviewVerification(verificationId, true, null)
    })
  }

  function reject() {
    startTransition(async () => {
      await reviewVerification(verificationId, false, reason || null)
      setRejecting(false)
    })
  }

  async function viewDoc() {
    setViewError(null)
    const result = await getSignedDocUrl(verificationId)
    if ('url' in result) {
      window.open(result.url, '_blank')
    } else {
      setViewError(result.error)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={viewDoc}
          className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted"
        >
          View document
        </button>
        <button
          onClick={approve}
          disabled={pending}
          className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          Approve
        </button>
        <button
          onClick={() => setRejecting((v) => !v)}
          disabled={pending}
          className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        >
          Reject
        </button>
      </div>

      {rejecting && (
        <div className="flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="rounded-full border border-border px-3 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={reject}
            disabled={pending}
            className="rounded-full bg-destructive px-4 py-1.5 text-[13px] font-semibold text-destructive-foreground disabled:opacity-60"
          >
            Confirm reject
          </button>
        </div>
      )}

      {viewError && <p className="text-[12px] text-destructive">{viewError}</p>}
    </div>
  )
}
