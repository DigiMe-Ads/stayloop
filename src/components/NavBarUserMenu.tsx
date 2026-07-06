'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/auth/actions'

export default function NavBarUserMenu({
  displayName,
  avatarUrl,
  isAdmin,
}: {
  displayName: string | null
  avatarUrl: string | null
  isAdmin: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const initial = (displayName ?? '?').charAt(0).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 px-2 py-1.5 hover:bg-gray-50"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1FAA59] text-[13px] font-semibold text-white">
            {initial}
          </span>
        )}
        <span className="hidden text-[14px] font-medium text-black sm:inline">
          {displayName ?? 'Account'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
          <Link href="/dashboard" className="block px-4 py-2 text-[14px] text-black hover:bg-gray-50">
            Dashboard
          </Link>
          <Link href="/inbox" className="block px-4 py-2 text-[14px] text-black hover:bg-gray-50">
            Inbox
          </Link>
          {isAdmin && (
            <Link href="/admin" className="block px-4 py-2 text-[14px] text-black hover:bg-gray-50">
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="block w-full px-4 py-2 text-left text-[14px] text-red-600 hover:bg-gray-50">
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
