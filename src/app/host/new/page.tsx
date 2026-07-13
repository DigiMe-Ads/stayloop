import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewListingWizard from './NewListingWizard'

export const metadata = { title: 'List your home — StayLoop' }

export default async function HostNewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/host/new')

  return (
    <main>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground">List your home</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Share your space and start earning Loops or arranging reciprocal swaps.
          </p>
        </div>
        <NewListingWizard />
      </div>
    </main>
  )
}
