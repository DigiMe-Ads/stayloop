import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBarUserMenu from './NavBarUserMenu'
import MobileNavMenu from './MobileNavMenu'

type SessionProfile = { display_name: string | null; avatar_url: string | null; is_admin: boolean | null } | null

async function getSessionProfile(): Promise<SessionProfile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return profile ?? { display_name: null, avatar_url: null, is_admin: false }
}

function NavContent({ profile }: { profile: SessionProfile }) {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1FAA59] text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M7 7h8a4 4 0 0 1 4 4v1" />
            <path d="M11 4l-4 3 4 3" />
            <path d="M17 17H9a4 4 0 0 1-4-4v-1" />
            <path d="M13 20l4-3-4-3" />
          </svg>
        </span>
        <span className="text-lg font-semibold text-black">StayLoop</span>
      </Link>

      {/* Center links */}
      <div className="hidden items-center gap-8 text-[15px] text-gray-500 md:flex">
        <Link href="/browse" className="hover:text-black">Browse homes</Link>
        <Link href="/how-it-works" className="hover:text-black">How Loops work</Link>
        <Link href="/dashboard" className="hover:text-black">Dashboard</Link>
        <Link href="/inbox" className="hover:text-black">Inbox</Link>
      </div>

      {/* Right actions — full row on desktop, hamburger on mobile */}
      <div className="hidden items-center gap-3 md:flex">
        {profile ? (
          <NavBarUserMenu
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            isAdmin={!!profile.is_admin}
          />
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border border-gray-200 px-5 py-2.5 text-[15px] font-medium text-black hover:bg-gray-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-black px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-gray-800"
            >
              Sign up
            </Link>
          </>
        )}
        <Link
          href="/host/new"
          className="rounded-full bg-black px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-gray-800"
        >
          List your home
        </Link>
      </div>

      <MobileNavMenu profile={profile} />
    </nav>
  )
}

export default async function NavBar() {
  const profile = await getSessionProfile()

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black bg-white">
        <NavContent profile={profile} />
      </header>
      {/* Spacer reserving the fixed header's height so page content isn't hidden under it */}
      <div className="invisible border-b border-black" aria-hidden="true">
        <NavContent profile={profile} />
      </div>
    </>
  )
}
