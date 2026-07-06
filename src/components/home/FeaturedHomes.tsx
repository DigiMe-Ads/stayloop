import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { countryName } from '@/lib/countryNames'

type FeaturedListing = {
  id: string
  title: string
  property_type: string
  beds: number
  region_name: string | null
  country_code: string
  loops_per_night: number | null
  open_to_swap: boolean
  open_to_loops: boolean
  avg_rating: number | null
  owner: { display_name: string } | null
  cover_photo: string | null
}

async function getFeaturedListings(): Promise<FeaturedListing[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id,
      title,
      property_type,
      beds,
      region_name,
      country_code,
      loops_per_night,
      open_to_swap,
      open_to_loops,
      avg_rating,
      owner:profiles!listings_owner_id_fkey ( display_name ),
      listing_photos ( storage_path, sort_order )
    `)
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(6)

  if (error || !data) {
    console.error('Failed to load featured listings:', error)
    return []
  }

  return data.map((listing) => {
    const photos = (listing.listing_photos ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    )
    const cover = photos[0]?.storage_path
      ? supabase.storage.from('listing-photos').getPublicUrl(photos[0].storage_path).data.publicUrl
      : null

    return {
      id: listing.id,
      title: listing.title,
      property_type: listing.property_type,
      beds: listing.beds,
      region_name: listing.region_name,
      country_code: listing.country_code,
      loops_per_night: listing.loops_per_night,
      open_to_swap: listing.open_to_swap,
      open_to_loops: listing.open_to_loops,
      avg_rating: listing.avg_rating,
      owner: Array.isArray(listing.owner) ? listing.owner[0] ?? null : listing.owner,
      cover_photo: cover,
    }
  })
}

function propertyTypeLabel(type: string) {
  return type
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

export default async function FeaturedHomes() {
  const listings = await getFeaturedListings()

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
      {/* Header row */}
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-[40px]">
            Featured homes across Asia
          </h2>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Hand-picked stays from verified hosts in Sri Lanka, Bali, Japan and more.
          </p>
        </div>

        <Link
          href="/browse"
          className="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-semibold text-accent hover:text-primary"
        >
          See all homes
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {/* Grid or empty state */}
      {listings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="group block"
            >
              {/* Image + badges */}
              <div className="relative h-[320px] w-full overflow-hidden rounded-2xl bg-muted">
                {listing.cover_photo ? (
                  <Image
                    src={listing.cover_photo}
                    alt={listing.title}
                    fill
                    className="object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No photo yet
                  </div>
                )}

                <div className="absolute left-3 top-3 flex gap-2">
                  {listing.open_to_swap && (
                    <span className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[13px] font-semibold text-foreground shadow-sm">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      Swap
                    </span>
                  )}
                  {listing.open_to_loops && listing.loops_per_night != null && (
                    <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-sm">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
                      </svg>
                      {listing.loops_per_night} Loops/night
                    </span>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="mt-3 flex items-center justify-between text-[14px]">
                <span className="text-muted-foreground">
                  {listing.region_name ?? '—'}, {countryName(listing.country_code)}
                </span>
                {listing.avg_rating != null && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {listing.avg_rating.toFixed(1)}
                  </span>
                )}
              </div>

              <h3 className="mt-1 truncate text-[16px] font-bold text-foreground">
                {listing.title}
              </h3>

              <div className="mt-1 flex items-center justify-between text-[14px] text-muted-foreground">
                <span>{propertyTypeLabel(listing.property_type)} · {listing.beds} beds</span>
                <span className="truncate">Host: {listing.owner?.display_name ?? 'Unknown'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </span>
      <h3 className="mt-5 text-lg font-bold text-foreground">No homes listed yet</h3>
      <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
        Be the first to list your home on StayLoop and start earning Loops, or
        check back soon as more verified hosts join.
      </p>
      <Link
        href="/host/new"
        className="mt-6 rounded-full bg-foreground px-6 py-3 text-[15px] font-semibold text-background hover:opacity-90"
      >
        List your home
      </Link>
    </div>
  )
}