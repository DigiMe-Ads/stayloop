import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import EditListingForm from './EditListingForm'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/host/${id}/edit`)

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      id, owner_id, title, property_type, description, bedrooms, beds, max_guests,
      formatted_address, region_name, country_code, status,
      open_to_swap, open_to_loops, base_loops_per_night, loops_per_night,
      listing_amenities ( amenity ),
      listing_photos ( id, storage_path, sort_order )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!listing) notFound()
  if (listing.owner_id !== user.id) redirect('/dashboard')

  const { data: bandConfig } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'price_band_pct')
    .maybeSingle()
  const bandPct = bandConfig ? Number(bandConfig.value) : 0.2

  const photos = [...(listing.listing_photos ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
  )
  const photoUrls = photos.map((p: { id: string; storage_path: string }) => ({
    id: p.id,
    storagePath: p.storage_path,
    url: supabase.storage.from('listing-photos').getPublicUrl(p.storage_path).data.publicUrl,
  }))

  return (
    <main>
      <NavBar />
      <div className="mx-auto max-w-2xl px-6 py-10 pb-24">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Edit listing</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{listing.title}</p>

        <EditListingForm
          listingId={listing.id}
          initialStatus={listing.status}
          initialBasics={{
            title: listing.title,
            property_type: listing.property_type,
            description: listing.description ?? '',
            bedrooms: listing.bedrooms,
            beds: listing.beds,
            max_guests: listing.max_guests,
          }}
          initialAddress={listing.formatted_address ?? ''}
          initialRegion={listing.region_name ?? ''}
          initialHostingOptions={{
            openToSwap: listing.open_to_swap,
            openToLoops: listing.open_to_loops,
            amenities: (listing.listing_amenities ?? []).map((a: { amenity: string }) => a.amenity),
          }}
          initialBaseLoops={listing.base_loops_per_night}
          initialLoopsPrice={listing.loops_per_night}
          bandPct={bandPct}
          initialPhotos={photoUrls}
        />
      </div>
    </main>
  )
}
