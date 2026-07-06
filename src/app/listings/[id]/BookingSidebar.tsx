'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { messageHost } from './actions'

interface Props {
  listingId: string
  loopsPerNight: number | null
  avgRating: number | null
  reviewCount: number
  openToSwap: boolean
  openToLoops: boolean
  maxGuests: number
  bedrooms: number
  beds: number
  isOwner: boolean
  isLoggedIn: boolean
  hostId: string | null
}

export default function BookingSidebar({
  listingId, loopsPerNight, avgRating, reviewCount,
  openToSwap, openToLoops, maxGuests, bedrooms, beds,
  isOwner, isLoggedIn, hostId,
}: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [msgPending, startMsg] = useTransition()
  const [msgError, setMsgError] = useState<string | null>(null)

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 0
  const totalLoops = nights * (loopsPerNight ?? 0)

  function handleBook(type: 'swap' | 'loops') {
    if (!isLoggedIn) { router.push('/login'); return }
    const p = new URLSearchParams({ type, ...(checkIn && { check_in: checkIn }), ...(checkOut && { check_out: checkOut }) })
    router.push(`/listings/${listingId}/book?${p}`)
  }

  function handleMessage() {
    if (!isLoggedIn) { router.push('/login'); return }
    startMsg(async () => {
      const res = await messageHost(listingId, hostId!)
      if (res.ok) router.push('/inbox')
      else setMsgError(res.error)
    })
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      {/* Price + rating */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-extrabold text-foreground">
            {loopsPerNight ?? '—'}
          </span>
          <span className="text-sm text-muted-foreground">Loops / night</span>
        </div>
        {avgRating != null && (
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">
            ★ {avgRating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Date pickers */}
      {!isOwner && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Check-in
              </p>
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm text-foreground focus:outline-none"
              />
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Check-out
              </p>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isOwner ? (
        <p className="py-3 text-center text-sm text-muted-foreground">This is your listing.</p>
      ) : (
        <div className="space-y-3">
          {openToSwap && (
            <button
              onClick={() => handleBook('swap')}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <SwapSvg /> Request a reciprocal swap
            </button>
          )}
          {openToLoops && loopsPerNight != null && (
            <button
              onClick={() => handleBook('loops')}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground py-3.5 text-sm font-semibold text-foreground hover:bg-foreground/5"
            >
              <LoopsSvg />
              {nights > 0 ? `Book with ${totalLoops.toLocaleString()} Loops` : 'Book with Loops'}
            </button>
          )}
          <button
            onClick={handleMessage}
            disabled={msgPending || !hostId}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-accent hover:opacity-90 disabled:opacity-50"
          >
            <MsgSvg /> Message host
          </button>
          {msgError && <p className="text-xs text-destructive">{msgError}</p>}
        </div>
      )}

      {/* Property summary */}
      <div className="mt-5 space-y-2.5 border-t border-border pt-5">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <GuestsSvg /> Up to {maxGuests} guests
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <BedSvg /> {bedrooms} bedroom{bedrooms !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <BedSvg /> {beds} bed{beds !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

function SwapSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function LoopsSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
    </svg>
  )
}

function MsgSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function GuestsSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BedSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" /><path d="M6 8v9" />
    </svg>
  )
}
