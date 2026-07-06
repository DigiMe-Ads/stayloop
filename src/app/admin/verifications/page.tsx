import { createClient } from '@/lib/supabase/server'
import VerificationReviewActions from './VerificationReviewActions'

type VerificationRow = {
  id: string
  doc_type: string
  status: string
  created_at: string
  user_id: string
  profile: { display_name: string | null } | null
}

export default async function AdminVerificationsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('verifications')
    .select('id, doc_type, status, created_at, user_id, profile:profiles!verifications_user_id_fkey ( display_name )')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const verifications = (data ?? []) as unknown as VerificationRow[]

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Pending verifications</h2>
      {verifications.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">Nothing to review.</p>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-4"
            >
              <div>
                <p className="text-[15px] font-bold text-foreground">{v.profile?.display_name ?? 'Unknown user'}</p>
                <p className="text-[13px] text-muted-foreground">
                  {v.doc_type} · submitted {new Date(v.created_at).toLocaleDateString()}
                </p>
              </div>
              <VerificationReviewActions verificationId={v.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
