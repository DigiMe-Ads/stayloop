import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { countryName } from '@/lib/countryNames'
import BookForm from './BookForm'

type Photo = { storage_path: string; sort_order: number }

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; check_in?: string; check_out?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const qs = new URLSearchParams()
  if (sp.type) qs.set('type', sp.type)
  if (sp.check_in) qs.set('check_in', sp.check_in)
  if (sp.check_out) qs.set('check_out', sp.check_out)
  const returnPath = `/listings/${id}/book${qs.toString() ? `?${qs}` : ''}`

  if (!user) redirect(`/login?redirect=${encodeURIComponent(returnPath)}`)

  const kind = sp.type === 'loops' ? 'loops' : sp.type === 'swap' ? 'swap' : null
  if (!kind) redirect(`/listings/${id}`)

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      id, title, owner_id, region_name, country_code,
      loops_per_night, open_to_swap, open_to_loops,
      listing_photos ( storage_path, sort_order )
    `)
    .eq('id', id)
    .eq('status', 'live')
    .single()

  if (!listing) notFound()
  if (listing.owner_id === user.id) redirect(`/listings/${id}`)
  if (kind === 'swap' && !listing.open_to_swap) redirect(`/listings/${id}`)
  if (kind === 'loops' && (!listing.open_to_loops || listing.loops_per_night == null)) redirect(`/listings/${id}`)

  const photos = [...(listing.listing_photos as Photo[] ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const cover = photos[0]?.storage_path
    ? supabase.storage.from('listing-photos').getPublicUrl(photos[0].storage_path).data.publicUrl
    : null

  let myListings: { id: string; title: string; region_name: string | null }[] = []
  let balance = 0
  if (kind === 'swap') {
    const { data } = await supabase
      .from('listings')
      .select('id, title, region_name')
      .eq('owner_id', user.id)
      .eq('status', 'live')
    myListings = data ?? []
  } else {
    const { data } = await supabase.rpc('get_available_balance', { p_user: user.id })
    balance = typeof data === 'number' ? data : 0
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 pb-24">
        <Link
          href={`/listings/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to listing
        </Link>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
          {kind === 'swap' ? 'Request a reciprocal swap' : 'Book with Loops'}
        </h1>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border p-4">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
            {cover && <Image src={cover} alt={listing.title} fill className="object-cover" />}
          </div>
          <div>
            <h2 className="font-bold text-foreground">{listing.title}</h2>
            <p className="text-sm text-muted-foreground">
              {listing.region_name}, {countryName(listing.country_code)}
            </p>
            {kind === 'loops' && listing.loops_per_night != null && (
              <p className="mt-1 text-sm font-semibold text-primary">{listing.loops_per_night} Loops / night</p>
            )}
          </div>
        </div>

        <BookForm
          hostListingId={listing.id}
          kind={kind}
          loopsPerNight={listing.loops_per_night}
          initialCheckIn={sp.check_in ?? ''}
          initialCheckOut={sp.check_out ?? ''}
          myListings={myListings}
          balance={balance}
        />
    </main>
  )
}
