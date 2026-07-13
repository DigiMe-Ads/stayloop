'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { signOut } from '@/app/auth/actions'

type Profile = { display_name: string | null; is_admin: boolean | null } | null

export default function MobileNavMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the panel whenever the route actually changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-black hover:bg-gray-50"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-full z-50 max-h-[80vh] overflow-y-auto border-b border-black bg-white px-6 py-4 shadow-lg">
            <nav className="flex flex-col gap-1 text-[15px] font-medium text-gray-700">
              <Link href="/browse" className="rounded-lg px-3 py-2.5 hover:bg-gray-50">
                Browse homes
              </Link>
              <Link href="/how-it-works" className="rounded-lg px-3 py-2.5 hover:bg-gray-50">
                How Loops work
              </Link>
              <Link href="/dashboard" className="rounded-lg px-3 py-2.5 hover:bg-gray-50">
                Dashboard
              </Link>
              <Link href="/inbox" className="rounded-lg px-3 py-2.5 hover:bg-gray-50">
                Inbox
              </Link>
              {profile?.is_admin && (
                <Link href="/admin" className="rounded-lg px-3 py-2.5 hover:bg-gray-50">
                  Admin
                </Link>
              )}
            </nav>

            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-4">
              <Link
                href="/host/new"
                className="rounded-full bg-black px-5 py-2.5 text-center text-[15px] font-semibold text-white hover:bg-gray-800"
              >
                List your home
              </Link>
              {profile ? (
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-full border border-gray-200 px-5 py-2.5 text-[15px] font-medium text-red-600 hover:bg-gray-50"
                  >
                    Log out
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full border border-gray-200 px-5 py-2.5 text-center text-[15px] font-medium text-black hover:bg-gray-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-[#1FAA59] px-5 py-2.5 text-center text-[15px] font-semibold text-white hover:bg-[#188a48]"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
