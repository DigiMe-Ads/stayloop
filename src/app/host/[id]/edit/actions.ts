'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function assertOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('owner_id', userId)
    .maybeSingle()
  return !!data
}

export async function updateListingBasics(
  listingId: string,
  input: {
    title: string
    property_type: string
    description: string
    bedrooms: number
    beds: number
    max_guests: number
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!(await assertOwner(supabase, listingId, user.id))) return { ok: false, error: 'Not your listing.' }

  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Title is required.' }

  const { error } = await supabase
    .from('listings')
    .update({
      title,
      property_type: input.property_type,
      description: input.description.trim() || null,
      bedrooms: Math.max(1, input.bedrooms),
      beds: Math.max(1, input.beds),
      max_guests: Math.max(1, input.max_guests),
    })
    .eq('id', listingId)
    .eq('owner_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/host/${listingId}/edit`)
  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}

export async function updateListingLocation(
  listingId: string,
  lat: number,
  lng: number,
  placeId: string,
  address: string,
  region: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!(await assertOwner(supabase, listingId, user.id))) return { ok: false, error: 'Not your listing.' }

  const { error } = await supabase.rpc('set_listing_location', {
    p_listing: listingId,
    p_lat: lat,
    p_lng: lng,
    p_place_id: placeId,
    p_formatted_address: address,
    p_region_name: region,
    p_country_code: 'LK',
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/host/${listingId}/edit`)
  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}

export async function updateListingHostingOptions(
  listingId: string,
  openToSwap: boolean,
  openToLoops: boolean,
  amenities: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!(await assertOwner(supabase, listingId, user.id))) return { ok: false, error: 'Not your listing.' }
  if (!openToSwap && !openToLoops) return { ok: false, error: 'Select at least one hosting option.' }

  const { error: updateError } = await supabase
    .from('listings')
    .update({ open_to_swap: openToSwap, open_to_loops: openToLoops })
    .eq('id', listingId)
    .eq('owner_id', user.id)
  if (updateError) return { ok: false, error: updateError.message }

  const { error: deleteError } = await supabase
    .from('listing_amenities')
    .delete()
    .eq('listing_id', listingId)
  if (deleteError) return { ok: false, error: deleteError.message }

  if (amenities.length > 0) {
    const { error: insertError } = await supabase
      .from('listing_amenities')
      .insert(amenities.map((amenity) => ({ listing_id: listingId, amenity })))
    if (insertError) return { ok: false, error: insertError.message }
  }

  revalidatePath(`/host/${listingId}/edit`)
  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}

export async function recomputeListingValue(
  listingId: string,
): Promise<{ ok: true; baseLoops: number; bandPct: number } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!(await assertOwner(supabase, listingId, user.id))) return { ok: false, error: 'Not your listing.' }

  const { error: computeError } = await supabase.rpc('compute_listing_value', { p_listing: listingId })
  if (computeError) return { ok: false, error: computeError.message }

  const [listingRes, configRes] = await Promise.all([
    supabase.from('listings').select('base_loops_per_night').eq('id', listingId).single(),
    supabase.from('app_config').select('value').eq('key', 'price_band_pct').maybeSingle(),
  ])
  if (listingRes.error) return { ok: false, error: listingRes.error.message }

  const baseLoops = (listingRes.data.base_loops_per_night as number | null) ?? 150
  const bandPct = configRes.data ? Number(configRes.data.value) : 0.2

  revalidatePath(`/host/${listingId}/edit`)
  return { ok: true, baseLoops, bandPct }
}

export async function updateListingPrice(
  listingId: string,
  loops: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!(await assertOwner(supabase, listingId, user.id))) return { ok: false, error: 'Not your listing.' }

  const { error } = await supabase.rpc('set_listing_price', { p_listing: listingId, p_price: loops })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/host/${listingId}/edit`)
  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}

export async function setListingStatus(
  listingId: string,
  status: 'live' | 'draft',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }
  if (!(await assertOwner(supabase, listingId, user.id))) return { ok: false, error: 'Not your listing.' }

  const { error } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', listingId)
    .eq('owner_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  revalidatePath(`/host/${listingId}/edit`)
  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}
