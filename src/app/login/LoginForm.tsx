'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn, type AuthState } from '@/app/auth/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-[#1FAA59] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#188a48] disabled:opacity-60"
    >
      {pending ? 'Logging in…' : 'Log in'}
    </button>
  )
}

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(signIn, null)

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="redirect" value={redirectTo ?? '/dashboard'} />

      <div>
        <label htmlFor="email" className="text-[13px] font-medium text-foreground">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-xl border border-border px-4 py-3 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-[13px] font-medium text-foreground">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full rounded-xl border border-border px-4 py-3 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {state && 'error' in state && (
        <p className="text-[14px] text-destructive">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  )
}
