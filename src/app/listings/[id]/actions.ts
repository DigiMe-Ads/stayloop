'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(
  listingId: string,
  rating: number,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!body.trim()) return { ok: false, error: 'Review body is required.' }
  if (rating < 1 || rating > 5) return { ok: false, error: 'Rating must be between 1 and 5.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data: swap } = await supabase
    .from('swaps')
    .select('id')
    .eq('status', 'completed')
    .or(`host_listing_id.eq.${listingId},guest_listing_id.eq.${listingId}`)
    .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()

  if (!swap) {
    return { ok: false, error: 'You can only review a listing after a completed stay.' }
  }

  const { error } = await supabase.from('reviews').insert({
    listing_id: listingId,
    swap_id: swap.id,
    reviewer_id: user.id,
    rating,
    body,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/listings/${listingId}`)
  return { ok: true }
}

export async function messageHost(
  listingId: string,
  hostId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { error } = await supabase.rpc('start_conversation', {
    p_listing: listingId,
    p_other_user: hostId,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
