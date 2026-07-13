import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Admin</h1>
          <nav className="flex gap-2">
            <Link href="/admin" className="rounded-full border border-border px-4 py-2 text-[14px] font-semibold text-foreground hover:bg-muted">
              Overview
            </Link>
            <Link href="/admin/verifications" className="rounded-full border border-border px-4 py-2 text-[14px] font-semibold text-foreground hover:bg-muted">
              Verifications
            </Link>
          </nav>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}
