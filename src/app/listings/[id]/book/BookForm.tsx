'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSwapRequest } from './actions'

interface Props {
  hostListingId: string
  kind: 'swap' | 'loops'
  loopsPerNight: number | null
  initialCheckIn: string
  initialCheckOut: string
  myListings: { id: string; title: string; region_name: string | null }[]
  balance: number
}

export default function BookForm({
  hostListingId, kind, loopsPerNight, initialCheckIn, initialCheckOut, myListings, balance,
}: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [checkIn, setCheckIn] = useState(initialCheckIn)
  const [checkOut, setCheckOut] = useState(initialCheckOut)
  const [guestListingId, setGuestListingId] = useState(myListings[0]?.id ?? '')
  const [settleDifference, setSettleDifference] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 0
  const totalLoops = nights * (loopsPerNight ?? 0)
  const insufficientBalance = kind === 'loops' && totalLoops > balance

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await createSwapRequest({
        hostListingId,
        kind,
        checkIn,
        checkOut,
        guestListingId: kind === 'swap' ? guestListingId : undefined,
        settleDifference,
      })
      if (res.ok) router.push('/dashboard?swap=requested')
      else setError(res.error)
    })
  }

  if (kind === 'swap' && myListings.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <p className="font-semibold text-foreground">You need a live listing to offer a swap</p>
        <p className="mt-1 text-sm text-muted-foreground">
          List a home before requesting a reciprocal swap with another member.
        </p>
        <a
          href="/host/new"
          className="mt-4 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90"
        >
          List your home
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="px-4 py-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              min={today}
              required
              onChange={(e) => setCheckIn(e.target.value)}
              className="mt-1 w-full bg-transparent text-sm text-foreground focus:outline-none"
            />
          </div>
          <div className="px-4 py-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Check-out
            </label>
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              required
              onChange={(e) => setCheckOut(e.target.value)}
              className="mt-1 w-full bg-transparent text-sm text-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {kind === 'swap' && (
        <div>
          <label className="text-sm font-semibold text-foreground">Which of your homes are you offering?</label>
          <select
            value={guestListingId}
            onChange={(e) => setGuestListingId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {myListings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}{l.region_name ? ` — ${l.region_name}` : ''}
              </option>
            ))}
          </select>

          <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={settleDifference}
              onChange={(e) => setSettleDifference(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Settle any value difference with Loops
          </label>
        </div>
      )}

      {kind === 'loops' && (
        <div className="rounded-2xl bg-secondary p-4">
          <div className="flex items-center justify-between text-sm text-accent">
            <span>{loopsPerNight ?? 0} Loops × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="font-bold">{totalLoops.toLocaleString()} Loops</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-accent/15 pt-2 text-sm text-accent">
            <span>Your balance</span>
            <span className="font-semibold">{balance.toLocaleString()} Loops</span>
          </div>
          {insufficientBalance && (
            <p className="mt-2 text-sm font-medium text-destructive">
              You don&apos;t have enough Loops for this stay yet.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={pending || nights === 0 || insufficientBalance}
        className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Sending…' : kind === 'swap' ? 'Send swap request' : `Book with ${totalLoops.toLocaleString()} Loops`}
      </button>
    </form>
  )
}
