'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type BookingMode = 'swap' | 'loops'

export default function HeroSearch() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<BookingMode>('swap')
  const [regions, setRegions] = useState<string[]>([])
  const [where, setWhere] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [loading, setLoading] = useState(false)

  // Populate the "Where" suggestions from real regions, e.g. Galle, Colombo...
  useEffect(() => {
    supabase
      .from('location_tiers')
      .select('region_name')
      .eq('country_code', 'LK')
      .order('tourist_tier', { ascending: true })
      .then(({ data }) => {
        if (data) setRegions([...new Set(data.map((r) => r.region_name))])
      })
  }, [supabase])

  async function handleSearch() {
    setLoading(true)

    // Resolve the typed region to a lat/lng via location_tiers + a small lookup table,
    // or — once Places is wired into the search bar itself — use the picked place's coords directly.
    const { data: region } = await supabase
      .from('location_tiers')
      .select('region_name')
      .ilike('region_name', `%${where}%`)
      .limit(1)
      .maybeSingle()

    const params = new URLSearchParams({
      mode,
      region: region?.region_name ?? where,
      check_in: checkIn,
      check_out: checkOut,
    })

    setLoading(false)
    router.push(`/browse?${params.toString()}`)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode('swap')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === 'swap' ? 'bg-[#E8F8EE] text-[#15803D]' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          Reciprocal swap
        </button>
        <button
          onClick={() => setMode('loops')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === 'loops' ? 'bg-[#E8F8EE] text-[#15803D]' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
          </svg>
          Pay with Loops
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-gray-100 sm:flex-row">
        <div className="flex-1 px-4 py-3">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Where</label>
          <input
            list="region-options"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Galle, Bali, Kyoto…"
            className="block w-full border-none p-0 text-[15px] text-black placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
          <datalist id="region-options">
            {regions.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>

        <div className="flex-1 border-t border-gray-100 px-4 py-3 sm:border-t-0 sm:border-l">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Check-in</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="block w-full border-none p-0 text-[15px] text-black focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex-1 border-t border-gray-100 px-4 py-3 sm:border-t-0 sm:border-l">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Check-out</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="block w-full border-none p-0 text-[15px] text-black focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center p-2">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#1FAA59] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#188a48] disabled:opacity-60 sm:w-auto"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  )
}