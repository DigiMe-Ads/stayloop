import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import SignupForm from './SignupForm'

export default async function SignupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main>
      <NavBar />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Join StayLoop to swap homes or host for Loops, Sri Lanka-wide.
        </p>

        <SignupForm />

        <p className="mt-6 text-center text-[14px] text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-accent hover:text-primary">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
