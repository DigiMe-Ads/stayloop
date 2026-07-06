import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { createClient } from '@/lib/supabase/server'
import { countryName } from '@/lib/countryNames'
import BookingSidebar from './BookingSidebar'
import AvailabilityCalendar from './AvailabilityCalendar'
import ReviewForm from './ReviewForm'

type Owner = {
  id: string
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
  created_at: string
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      id, title, description, property_type,
      bedrooms, beds, max_guests,
      loops_per_night, open_to_swap, open_to_loops,
      avg_rating, region_name, country_code,
      owner:profiles!listings_owner_id_fkey (
        id, display_name, avatar_url, is_verified, created_at
      ),
      listing_photos ( storage_path, sort_order ),
      listing_amenities ( amenity )
    `)
    .eq('id', id)
    .eq('status', 'live')
    .single()

  if (error || !listing) notFound()

  const owner: Owner | null = Array.isArray(listing.owner)
    ? (listing.owner[0] as Owner) ?? null
    : (listing.owner as Owner) ?? null

  const photos = [...(listing.listing_photos ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
  )
  const photoUrls = photos.map((p: { storage_path: string }) =>
    supabase.storage.from('listing-photos').getPublicUrl(p.storage_path).data.publicUrl,
  )

  const amenities = (listing.listing_amenities ?? []).map((a: { amenity: string }) => a.amenity)

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, body, created_at,
      reviewer:profiles!reviews_reviewer_id_fkey ( display_name, avatar_url )
    `)
    .eq('listing_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const todayStr = new Date().toISOString().split('T')[0]
  const sixMonthsStr = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
  const { data: availability } = await supabase
    .from('listing_availability')
    .select('date')
    .eq('listing_id', id)
    .gte('date', todayStr)
    .lte('date', sixMonthsStr)

  const { data: similar } = await supabase
    .from('listings')
    .select(`
      id, title, region_name, country_code, loops_per_night,
      listing_photos ( storage_path, sort_order )
    `)
    .eq('status', 'live')
    .eq('region_name', listing.region_name ?? '')
    .neq('id', id)
    .limit(3)

  const similarCards = (similar ?? []).map((s) => {
    const sp = [...(s.listing_photos ?? [])].sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
    )
    const cover = sp[0]?.storage_path
      ? supabase.storage.from('listing-photos').getPublicUrl(sp[0].storage_path).data.publicUrl
      : null
    return { id: s.id, title: s.title, region_name: s.region_name, country_code: s.country_code, loops_per_night: s.loops_per_night, cover }
  })

  let canReview = false
  let alreadyReviewed = false
  if (user && owner && user.id !== owner.id) {
    const { data: completedSwap } = await supabase
      .from('swaps')
      .select('id')
      .eq('status', 'completed')
      .or(`host_listing_id.eq.${id},guest_listing_id.eq.${id}`)
      .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle()
    canReview = !!completedSwap
    if (canReview) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('listing_id', id)
        .eq('reviewer_id', user.id)
        .maybeSingle()
      alreadyReviewed = !!existing
    }
  }

  const isOwner = user?.id === owner?.id
  const reviewList = reviews ?? []
  const blockedDates = (availability ?? []).map((d: { date: string }) => d.date)

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-6 py-8 pb-20">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to homes
        </Link>

        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-foreground sm:text-4xl">
          {listing.title}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {listing.avg_rating != null && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <StarSvg />
              {listing.avg_rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                · {reviewList.length} review{reviewList.length !== 1 ? 's' : ''}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <PinSvg />
            {listing.region_name}, {countryName(listing.country_code)}
          </span>
          {owner?.is_verified && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <ShieldCheckSvg /> Verified host
            </span>
          )}
        </div>

        {/* Photo grid */}
        <div className="mt-6 grid h-[400px] grid-cols-[2fr_1fr] gap-2 overflow-hidden rounded-3xl">
          <div className="relative bg-muted">
            {photoUrls[0] && (
              <Image src={photoUrls[0]} alt={listing.title} fill className="object-cover" />
            )}
          </div>
          <div className="grid grid-cols-2 grid-rows-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative bg-muted">
                {photoUrls[i] && (
                  <Image src={photoUrls[i]} alt="" fill className="object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content + sidebar */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* Left */}
          <div>
            {/* Host row */}
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {propertyTypeLabel(listing.property_type)} hosted by{' '}
                  {owner?.display_name ?? 'Host'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {listing.max_guests} guests · {listing.bedrooms} bedrooms · {listing.beds} beds
                </p>
                {owner?.created_at && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Member since {new Date(owner.created_at).getFullYear()}
                  </p>
                )}
              </div>
              {owner?.avatar_url ? (
                <Image
                  src={owner.avatar_url}
                  alt={owner.display_name ?? ''}
                  width={56}
                  height={56}
                  className="shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold text-accent">
                  {(owner?.display_name ?? 'H')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Trust flags */}
            <div className="space-y-5 border-b border-border py-6">
              {owner?.is_verified && (
                <TrustRow
                  icon={<ShieldCheckSvg size={22} />}
                  title="ID verified host"
                  desc="Government ID and email confirmed by StayLoop."
                />
              )}
              {listing.open_to_swap && (
                <TrustRow
                  icon={<SwapSvg size={22} />}
                  title="Open to reciprocal swaps"
                  desc="Will travel to your home in return for hosting."
                />
              )}
              {listing.open_to_loops && listing.loops_per_night && (
                <TrustRow
                  icon={<LoopsSvg size={22} />}
                  title="Loops also accepted"
                  desc={`Stay without a return swap from ${listing.loops_per_night} Loops / night.`}
                />
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="border-b border-border py-6">
                <h3 className="mb-3 text-lg font-bold text-foreground">About this home</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="border-b border-border py-6">
                <h3 className="mb-4 text-lg font-bold text-foreground">What this home offers</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {amenities.map((a: string) => (
                    <div
                      key={a}
                      className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm font-medium text-accent"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      {amenityLabel(a)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="border-b border-border py-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Availability</h3>
              <AvailabilityCalendar blockedDates={blockedDates} />
            </div>

            {/* Reviews */}
            <div className="py-6">
              <h3 className="mb-5 text-lg font-bold text-foreground">
                {listing.avg_rating != null && `★ ${listing.avg_rating.toFixed(1)} · `}
                {reviewList.length} review{reviewList.length !== 1 ? 's' : ''}
              </h3>

              {reviewList.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {reviewList.map((r: any) => {
                    const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer
                    return (
                      <div key={r.id} className="rounded-2xl border border-border p-4">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-accent">
                            {(reviewer?.display_name ?? 'G')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {reviewer?.display_name ?? 'Guest'}
                            </p>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg
                                  key={i}
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill={i < r.rating ? 'currentColor' : 'none'}
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="text-primary"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Be the first after your stay!
                </p>
              )}

              {canReview && !alreadyReviewed && (
                <div className="mt-8">
                  <ReviewForm listingId={id} />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <BookingSidebar
              listingId={listing.id}
              loopsPerNight={listing.loops_per_night}
              avgRating={listing.avg_rating}
              reviewCount={reviewList.length}
              openToSwap={listing.open_to_swap}
              openToLoops={listing.open_to_loops}
              maxGuests={listing.max_guests}
              bedrooms={listing.bedrooms}
              beds={listing.beds}
              isOwner={isOwner}
              isLoggedIn={!!user}
              hostId={owner?.id ?? null}
            />
          </div>
        </div>

        {/* Similar listings */}
        {similarCards.length > 0 && (
          <section className="mt-16 border-t border-border pt-12">
            <h2 className="mb-6 text-2xl font-bold text-foreground">More homes you might love</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarCards.map((s) => (
                <Link key={s.id} href={`/listings/${s.id}`} className="group block">
                  <div className="relative h-56 overflow-hidden rounded-2xl bg-muted">
                    {s.cover && (
                      <Image
                        src={s.cover}
                        alt={s.title}
                        fill
                        className="object-cover transition group-hover:scale-[1.02]"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.region_name}, {countryName(s.country_code)}
                  </p>
                  <h3 className="mt-0.5 truncate font-bold text-foreground group-hover:text-primary">
                    {s.title}
                  </h3>
                  {s.loops_per_night && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {s.loops_per_night} Loops / night
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}

function TrustRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function propertyTypeLabel(type: string) {
  return type.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function amenityLabel(key: string) {
  const map: Record<string, string> = {
    wifi: 'Wi-Fi', pool: 'Pool', garden: 'Garden',
    air_conditioning: 'AC', kitchen: 'Kitchen', workspace: 'Workspace',
    parking: 'Parking', washer: 'Washer', tv: 'TV',
    sea_view: 'Sea view', ocean_view: 'Ocean view',
  }
  return map[key] ?? key.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function StarSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function PinSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ShieldCheckSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function SwapSvg({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function LoopsSvg({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
    </svg>
  )
}
