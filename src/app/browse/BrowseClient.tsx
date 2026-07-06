'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { countryName } from '@/lib/countryNames'
import BrowseMap, { type MapPin } from './BrowseMap'

type Mode = 'all' | 'swap' | 'loops'

type ListingRow = {
  id: string
  title: string
  property_type: string
  beds: number
  bedrooms: number
  region_name: string | null
  country_code: string
  loops_per_night: number | null
  open_to_swap: boolean
  open_to_loops: boolean
  avg_rating: number | null
  geo: { coordinates: [number, number] } | null // PostGIS geojson: [lng, lat]
  owner: { display_name: string } | null
  cover_photo: string | null
}

function propertyTypeLabel(type: string) {
  return type.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function BrowseClient({
  initialRegion,
  initialMode,
}: {
  initialRegion: string
  initialMode: Mode
}) {
  const supabase = createClient()

  const [query, setQuery] = useState(initialRegion)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [minBedrooms, setMinBedrooms] = useState(0)
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async () => {
    setLoading(true)

    let req = supabase
      .from('listings')
      .select(`
        id, title, property_type, beds, bedrooms, region_name, country_code,
        loops_per_night, open_to_swap, open_to_loops, avg_rating,
        geo,
        owner:profiles!listings_owner_id_fkey ( display_name ),
        listing_photos ( storage_path, sort_order )
      `)
      .eq('status', 'live')

    if (query.trim()) {
      req = req.or(`region_name.ilike.%${query}%,title.ilike.%${query}%`)
    }
    if (mode === 'swap') req = req.eq('open_to_swap', true)
    if (mode === 'loops') req = req.eq('open_to_loops', true)
    if (minBedrooms > 0) req = req.gte('bedrooms', minBedrooms)

    const { data, error } = await req.order('created_at', { ascending: false })

    if (error) {
      console.error('Browse search failed:', error)
      setListings([])
      setLoading(false)
      return
    }

    setListings(
      (data ?? []).map((l) => {
        const photos = (l.listing_photos ?? []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
        )
        const cover = photos[0]?.storage_path
          ? supabase.storage.from('listing-photos').getPublicUrl(photos[0].storage_path).data.publicUrl
          : null
        return {
          ...l,
          owner: Array.isArray(l.owner) ? l.owner[0] ?? null : l.owner,
          cover_photo: cover,
        }
      })
    )
    setLoading(false)
  }, [supabase, query, mode, minBedrooms])

  // Debounced live search — re-runs 400ms after the user stops typing/filtering
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(runSearch, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [runSearch])

  const pins: MapPin[] = listings
    .filter((l) => l.geo?.coordinates)
    .map((l) => ({
      id: l.id,
      lat: l.geo!.coordinates[1],
      lng: l.geo!.coordinates[0],
      price: l.loops_per_night ?? 0,
    }))

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Header row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Homes available
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {loading ? 'Searching…' : `${listings.length} verified ${listings.length === 1 ? 'stay' : 'stays'} available`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-muted-foreground">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or country"
              className="w-44 border-none bg-transparent p-0 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border p-1">
            {(['all', 'swap', 'loops'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                  mode === m ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {m === 'swap' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                )}
                {m === 'loops' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
                  </svg>
                )}
                {m === 'all' ? 'All' : m === 'swap' ? 'Swap' : 'Loops'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main grid: listings + map/filters */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">
        {/* Listings */}
        <div>
          {!loading && listings.length === 0 ? (
            <EmptyResults />
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.id}`} className="group block">
                  <div className="relative h-[220px] w-full overflow-hidden rounded-2xl bg-muted">
                    {listing.cover_photo ? (
                      <Image src={listing.cover_photo} alt={listing.title} fill className="object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No photo yet</div>
                    )}
                    <div className="absolute left-3 top-3 flex gap-2">
                      {listing.open_to_swap && (
                        <span className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                          </svg>
                          Swap
                        </span>
                      )}
                      {listing.open_to_loops && listing.loops_per_night != null && (
                        <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground shadow-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
                          </svg>
                          {listing.loops_per_night} Loops/night
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[14px]">
                    <span className="text-muted-foreground">{listing.region_name ?? '—'}, {countryName(listing.country_code)}</span>
                    {listing.avg_rating != null && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {listing.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-[15px] font-bold text-foreground">{listing.title}</h3>
                  <div className="mt-1 flex items-center justify-between text-[13px] text-muted-foreground">
                    <span>{propertyTypeLabel(listing.property_type)} · {listing.beds} beds</span>
                    <span className="truncate">Host: {listing.owner?.display_name ?? 'Unknown'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Map + filters sidebar */}
        <div className="space-y-4">
          <div className="h-[400px] overflow-hidden rounded-2xl border border-border">
            <BrowseMap pins={pins} />
          </div>

          <div className="rounded-2xl border border-border p-5">
            <div className="mb-4 flex items-center gap-2 text-[15px] font-bold text-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              </svg>
              Filters
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span className="font-medium text-foreground">Bedrooms</span>
              <span className="text-muted-foreground">{minBedrooms === 0 ? 'Any' : `${minBedrooms}+`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(Number(e.target.value))}
              className="mt-3 w-full accent-primary"
            />
          </div>
        </div>
      </div>
    </main>
  )
}

function EmptyResults() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
      </span>
      <h3 className="mt-5 text-lg font-bold text-foreground">No homes match your search</h3>
      <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
        Try a different city, switch to All, or widen your bedroom filter.
      </p>
    </div>
  )
}