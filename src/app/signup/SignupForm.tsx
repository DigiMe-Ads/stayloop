'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signUp, type AuthState } from '@/app/auth/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-[#1FAA59] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#188a48] disabled:opacity-60"
    >
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  )
}

export default function SignupForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(signUp, null)

  if (state && 'checkEmail' in state) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-bold text-foreground">Check your email</h2>
        <p className="mt-2 text-[14px] text-muted-foreground">
          We&apos;ve sent you a confirmation link. Click it to activate your account, then come back and log in.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="display_name" className="text-[13px] font-medium text-foreground">Full name</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          autoComplete="name"
          className="mt-1 block w-full rounded-xl border border-border px-4 py-3 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

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
          minLength={6}
          autoComplete="new-password"
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
