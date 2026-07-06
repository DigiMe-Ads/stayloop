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
