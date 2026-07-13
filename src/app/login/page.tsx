import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect: redirectTo } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(redirectTo ?? '/dashboard')

  return (
    <main>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Log in to manage your listings, swaps and Loops.
        </p>

        <LoginForm redirectTo={redirectTo} />

        <p className="mt-6 text-center text-[14px] text-muted-foreground">
          New to StayLoop?{' '}
          <Link href="/signup" className="font-semibold text-accent hover:text-primary">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
