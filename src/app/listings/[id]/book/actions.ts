'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSwapRequest(input: {
  hostListingId: string
  kind: 'swap' | 'loops'
  checkIn: string
  checkOut: string
  guestListingId?: string
  settleDifference?: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { hostListingId, kind, checkIn, checkOut, guestListingId, settleDifference } = input

  if (!checkIn || !checkOut) return { ok: false, error: 'Pick check-in and check-out dates.' }
  if (new Date(checkOut) <= new Date(checkIn)) {
    return { ok: false, error: 'Check-out must be after check-in.' }
  }
  if (kind === 'swap' && !guestListingId) {
    return { ok: false, error: 'Choose which of your homes to offer in the swap.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  if (kind === 'swap' && guestListingId) {
    const { data: ownedListing } = await supabase
      .from('listings')
      .select('id')
      .eq('id', guestListingId)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!ownedListing) return { ok: false, error: 'You can only offer a home you own.' }
  }

  const { data: existing } = await supabase
    .from('swaps')
    .select('id, kind')
    .eq('host_listing_id', hostListingId)
    .eq('guest_id', user.id)
    .in('status', ['requested', 'accepted', 'confirmed', 'active'])
    .limit(1)
    .maybeSingle()

  if (existing) {
    return {
      ok: false,
      error: 'You already have a pending or active request for this home — cancel or wait for a response before sending another.',
    }
  }

  const { error } = await supabase.rpc('request_swap', {
    p_host_listing: hostListingId,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_kind: kind,
    ...(kind === 'swap' ? { p_guest_listing: guestListingId } : {}),
    p_settle_difference: !!settleDifference,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true }
}
