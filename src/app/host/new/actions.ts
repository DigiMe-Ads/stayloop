'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createDraftListing(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, error: 'Title is required' }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      owner_id: user.id,
      title,
      property_type: String(formData.get('property_type') ?? 'house'),
      description: String(formData.get('description') ?? '').trim() || null,
      bedrooms: Math.max(1, Number(formData.get('bedrooms') ?? 1)),
      beds: Math.max(1, Number(formData.get('beds') ?? 1)),
      max_guests: Math.max(1, Number(formData.get('max_guests') ?? 2)),
      country_code: 'LK',
      status: 'draft',
      open_to_swap: false,
      open_to_loops: false,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}

export async function setListingLocation(
  listingId: string,
  lat: number,
  lng: number,
  placeId: string,
  address: string,
  region: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

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
  return { ok: true }
}

export async function updateListingOptions(
  listingId: string,
  openToSwap: boolean,
  openToLoops: boolean,
  amenities: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error: updateError } = await supabase
    .from('listings')
    .update({ open_to_swap: openToSwap, open_to_loops: openToLoops })
    .eq('id', listingId)
    .eq('owner_id', user.id)

  if (updateError) return { ok: false, error: updateError.message }

  if (amenities.length > 0) {
    const { error: amenityError } = await supabase
      .from('listing_amenities')
      .insert(amenities.map((amenity) => ({ listing_id: listingId, amenity })))
    if (amenityError) return { ok: false, error: amenityError.message }
  }

  return { ok: true }
}

export async function computeListingValue(
  listingId: string,
): Promise<{ ok: true; baseLoops: number; bandPct: number } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error: computeError } = await supabase.rpc('compute_listing_value', {
    p_listing: listingId,
  })
  if (computeError) return { ok: false, error: computeError.message }

  const [listingRes, configRes] = await Promise.all([
    supabase.from('listings').select('base_loops_per_night').eq('id', listingId).single(),
    supabase.from('app_config').select('value').eq('key', 'price_band_pct').maybeSingle(),
  ])

  if (listingRes.error) return { ok: false, error: listingRes.error.message }

  const baseLoops = (listingRes.data.base_loops_per_night as number | null) ?? 150
  const bandPct = configRes.data ? Number(configRes.data.value) : 0.2

  return { ok: true, baseLoops, bandPct }
}

export async function publishListing(
  listingId: string,
  loops: number | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  if (loops !== null) {
    const { error: priceError } = await supabase.rpc('set_listing_price', {
      p_listing: listingId,
      p_price: loops,
    })
    if (priceError) return { ok: false, error: priceError.message }
  }

  const { error: publishError } = await supabase
    .from('listings')
    .update({ status: 'live' })
    .eq('id', listingId)
    .eq('owner_id', user.id)

  if (publishError) return { ok: false, error: publishError.message }

  revalidatePath('/dashboard')
  return { ok: true }
}
