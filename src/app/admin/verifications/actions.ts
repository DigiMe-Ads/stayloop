'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function reviewVerification(id: string, approve: boolean, reason: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('review_verification', {
    p_verification: id,
    p_approve: approve,
    p_reason: reason,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/verifications')
}

export async function getSignedDocUrl(verificationId: string): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return { error: 'Not authorized' }

  const { data: verification } = await supabase
    .from('verifications')
    .select('doc_storage_path')
    .eq('id', verificationId)
    .maybeSingle()

  if (!verification?.doc_storage_path) return { error: 'Document not found' }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('verification-docs')
    .createSignedUrl(verification.doc_storage_path, 60)

  if (error || !data) return { error: error?.message ?? 'Could not sign URL' }

  return { url: data.signedUrl }
}
