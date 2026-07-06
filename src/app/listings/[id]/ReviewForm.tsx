'use client'

import { useState, useTransition } from 'react'
import { submitReview } from './actions'

interface Props {
  listingId: string
}

export default function ReviewForm({ listingId }: Props) {
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <div className="rounded-2xl bg-secondary px-5 py-4 text-sm font-medium text-accent">
        ✓ Review submitted — thank you!
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await submitReview(listingId, rating, body.trim())
      if (res.ok) setDone(true)
      else setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border p-5">
      <h4 className="mb-4 font-bold text-foreground">Leave a review</h4>

      {/* Star picker */}
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            aria-label={`Rate ${s} star${s !== 1 ? 's' : ''}`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill={s <= rating ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary transition-transform hover:scale-110"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={4}
        placeholder="Share your experience staying here…"
        className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="mt-3 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}
