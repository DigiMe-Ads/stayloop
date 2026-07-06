import { createClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const [pendingVerifications, totalUsers, totalListings, totalSwaps] = await Promise.all([
    supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('swaps').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Pending verifications', value: pendingVerifications.count ?? 0 },
    { label: 'Total users', value: totalUsers.count ?? 0 },
    { label: 'Total listings', value: totalListings.count ?? 0 },
    { label: 'Total swaps', value: totalSwaps.count ?? 0 },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-border p-6">
          <p className="text-[14px] text-muted-foreground">{s.label}</p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">{s.value}</p>
        </div>
      ))}
    </div>
  )
}
