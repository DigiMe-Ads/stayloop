'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function respondToSwap(swapId: string, action: 'accept' | 'decline') {
  const supabase = await createClient()
  const { error } = await supabase.rpc('transition_swap', { p_swap: swapId, p_action: action })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function messageAboutSwap(listingId: string, otherUserId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('start_conversation', {
    p_listing: listingId,
    p_other_user: otherUserId,
  })
  if (error) throw new Error(error.message)
  redirect(`/inbox?c=${data}`)
}
