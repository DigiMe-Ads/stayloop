import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { countryName } from '@/lib/countryNames'
import NavBar from '@/components/NavBar'
import PendingRequestActions from './PendingRequestActions'
import MessageButton from './MessageButton'

type Photo = { storage_path: string; sort_order: number }
type MiniListing = { id: string; title: string; region_name: string | null; country_code: string; listing_photos: Photo[] } | null
type MiniProfile = { display_name: string | null } | null

type SwapRow = {
  id: string
  kind: string
  status: string
  guest_id: string
  host_id: string
  check_in: string
  check_out: string
  nights: number
  total_loops: number | null
  loops_per_night: number | null
  created_at: string
  guest: MiniProfile
  host: MiniProfile
  guest_listing: MiniListing
  host_listing: MiniListing
}

function coverUrl(supabase: Awaited<ReturnType<typeof createClient>>, photos: Photo[] | undefined) {
  const sorted = [...(photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const path = sorted[0]?.storage_path
  return path ? supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl : null
}

function formatDateRange(checkIn: string, checkOut: string) {
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  const inStr = inDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const outStr = outDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${inStr} – ${outStr}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ swap?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/dashboard')
  const uid = user.id

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOfYear = new Date(new Date().getFullYear(), 0, 1)

  const [profileRes, balanceRes, listingsRes, swapsRes, transactionsRes, monthTransactionsRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle(),
    supabase.rpc('get_available_balance', { p_user: uid }),
    supabase
      .from('listings')
      .select('id, title, property_type, region_name, country_code, status, open_to_swap, open_to_loops, loops_per_night, listing_photos(storage_path, sort_order)')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false }),
    supabase
      .from('swaps')
      .select(`
        id, kind, status, guest_id, host_id, check_in, check_out, nights, total_loops, loops_per_night, created_at,
        guest:profiles!swaps_guest_id_fkey ( display_name ),
        host:profiles!swaps_host_id_fkey ( display_name ),
        guest_listing:listings!swaps_guest_listing_id_fkey ( id, title, region_name, country_code, listing_photos(storage_path, sort_order) ),
        host_listing:listings!swaps_host_listing_id_fkey ( id, title, region_name, country_code, listing_photos(storage_path, sort_order) )
      `)
      .or(`guest_id.eq.${uid},host_id.eq.${uid}`),
    supabase
      .from('loop_transactions')
      .select('id, amount, description, type, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('loop_transactions')
      .select('amount')
      .eq('user_id', uid)
      .gte('created_at', startOfMonth.toISOString()),
  ])

  const displayName = profileRes.data?.display_name ?? 'there'
  const balance: number = typeof balanceRes.data === 'number' ? balanceRes.data : 0
  const listings = listingsRes.data ?? []
  const swaps = (swapsRes.data ?? []) as unknown as SwapRow[]
  const recentActivity = transactionsRes.data ?? []
  const monthDelta = (monthTransactionsRes.data ?? []).reduce((sum, t) => (t.amount > 0 ? sum + t.amount : sum), 0)

  const now = new Date()
  const upcoming = swaps
    .filter((s) => ['accepted', 'confirmed'].includes(s.status) && new Date(s.check_in) >= now)
    .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())

  const pendingRequests = swaps
    .filter((s) => s.status === 'requested' && s.host_id === uid)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const hostedNightsThisYear = swaps
    .filter((s) => s.status === 'completed' && s.host_id === uid && new Date(s.check_in) >= startOfYear)
    .reduce((sum, s) => sum + (s.nights ?? 0), 0)

  function swapDisplay(s: SwapRow) {
    const isHost = s.host_id === uid
    const otherParty = isHost ? s.guest : s.host
    const travelling = !isHost || s.kind === 'swap'
    const place = travelling ? (isHost ? s.guest_listing : s.host_listing) : s.host_listing
    const badge = s.kind === 'swap' ? 'Reciprocal swap' : `${s.total_loops ?? 0} Loops`
    const otherListing = isHost ? s.guest_listing : s.host_listing
    return { isHost, otherParty, place, badge, otherListing }
  }

  return (
    <main>
      <NavBar />
      <div className="mx-auto max-w-7xl px-6 py-10">
        {sp.swap === 'requested' && (
          <div className="mb-6 rounded-2xl bg-secondary px-5 py-4 text-sm font-medium text-accent">
            ✓ Request sent — you&apos;ll hear back once the host responds.
          </div>
        )}
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[14px] text-muted-foreground">Welcome back</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Hi, {displayName} 👋
            </h1>
          </div>
          <Link
            href="/browse"
            className="rounded-full bg-foreground px-6 py-3 text-[15px] font-semibold text-background hover:opacity-90"
          >
            Find your next stay
          </Link>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
            <p className="flex items-center gap-2 text-[14px] font-medium opacity-90">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
              </svg>
              Loops balance
            </p>
            <p className="mt-3 text-4xl font-extrabold">{balance.toLocaleString()}</p>
          </div>

          <div className="rounded-2xl border border-border p-6">
            <p className="flex items-center gap-2 text-[14px] font-medium text-muted-foreground">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              Upcoming swaps
            </p>
            <p className="mt-3 text-4xl font-extrabold text-foreground">{upcoming.length}</p>
            {upcoming.length > 0 && (
              <p className="mt-1 truncate text-[14px] text-muted-foreground">
                {upcoming.map((s) => swapDisplay(s).place?.region_name ?? swapDisplay(s).place?.title).filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border p-6">
            <p className="flex items-center gap-2 text-[14px] font-medium text-muted-foreground">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" />
              </svg>
              Hosted nights
            </p>
            <p className="mt-3 text-4xl font-extrabold text-foreground">{hostedNightsThisYear}</p>
            <p className="mt-1 text-[14px] text-muted-foreground">this year</p>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-10">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  {listings.length === 1 ? 'Your listing' : 'Your listings'}
                </h2>
                <Link href="/host/new" className="flex items-center gap-1 text-[14px] font-semibold text-accent hover:text-primary">
                  + Add another home
                </Link>
              </div>

              {listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                  <h3 className="text-[16px] font-bold text-foreground">You haven&apos;t listed a home yet</h3>
                  <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">
                    List your home to start earning Loops or open it up for reciprocal swaps.
                  </p>
                  <Link href="/host/new" className="mt-5 rounded-full bg-foreground px-6 py-3 text-[14px] font-semibold text-background hover:opacity-90">
                    List your home
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing) => {
                    const cover = coverUrl(supabase, listing.listing_photos as Photo[])
                    return (
                      <div key={listing.id} className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:flex-row">
                        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-muted sm:w-56">
                          {cover ? (
                            <Image src={cover} alt={listing.title} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">No photo yet</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <p className="text-[14px] text-muted-foreground">
                              {listing.region_name ?? '—'}, {countryName(listing.country_code)}
                            </p>
                            <h3 className="mt-1 text-[17px] font-bold text-foreground">{listing.title}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${listing.status === 'live' ? 'bg-secondary text-accent' : 'bg-muted text-muted-foreground'}`}>
                                {listing.status === 'live' ? 'Live' : listing.status}
                              </span>
                              {listing.open_to_swap && (
                                <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-accent">Open to swap</span>
                              )}
                              {listing.open_to_loops && listing.loops_per_night != null && (
                                <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-accent">
                                  {listing.loops_per_night} Loops/night
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Link href={`/listings/${listing.id}`} className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted">
                              View
                            </Link>
                            <Link href={`/host/${listing.id}/edit`} className="rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background hover:opacity-90">
                              Edit listing
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-foreground">Upcoming swaps</h2>
              {upcoming.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">No upcoming swaps yet — browse homes to plan your next stay.</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s) => {
                    const { otherParty, place, badge, otherListing } = swapDisplay(s)
                    const cover = coverUrl(supabase, place?.listing_photos as Photo[] | undefined)
                    const otherUserId = s.host_id === uid ? s.guest_id : s.host_id
                    return (
                      <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-border p-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                          {cover && <Image src={cover} alt="" fill className="object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[15px] font-bold text-foreground">
                            {place?.region_name ?? place?.title ?? 'Stay'}{place?.country_code ? `, ${countryName(place.country_code)}` : ''}
                          </p>
                          <p className="text-[14px] text-muted-foreground">
                            {formatDateRange(s.check_in, s.check_out)} · with {otherParty?.display_name ?? 'a member'}
                          </p>
                        </div>
                        <span className="rounded-full bg-secondary px-3 py-1.5 text-[12px] font-semibold text-accent">{badge}</span>
                        <MessageButton listingId={(otherListing ?? place)?.id ?? ''} otherUserId={otherUserId} />
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-foreground p-6 text-background">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium opacity-80">Your Loops</p>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-primary">
                  <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
                </svg>
              </div>
              <p className="mt-3 text-4xl font-extrabold">{balance.toLocaleString()}</p>
              <p className="mt-1 text-[14px] opacity-80">{monthDelta >= 0 ? '+' : ''}{monthDelta.toLocaleString()} this month</p>
              <Link href="/how-it-works" className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:opacity-80">
                How Loops work →
              </Link>
            </div>

            <div className="rounded-2xl border border-border p-5">
              <h3 className="mb-3 text-[15px] font-bold text-foreground">Recent activity</h3>
              {recentActivity.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {recentActivity.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">{t.description ?? t.type}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-[14px] font-semibold ${t.amount >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {t.amount >= 0 ? '+' : ''}{t.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pendingRequests.length > 0 && (
              <div className="rounded-2xl border border-border bg-secondary p-5">
                <h3 className="mb-3 text-[15px] font-bold text-foreground">Pending requests</h3>
                <div className="space-y-3">
                  {pendingRequests.map((s) => {
                    const { otherParty, place, badge } = swapDisplay(s)
                    return (
                      <div key={s.id} className="rounded-xl bg-card p-4">
                        <p className="text-[15px] font-bold text-foreground">
                          {otherParty?.display_name ?? 'A member'} — {place?.region_name ?? place?.title ?? 'Stay'}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          {formatDateRange(s.check_in, s.check_out)} · {badge}
                        </p>
                        <PendingRequestActions swapId={s.id} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
