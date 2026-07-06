import BrowseClient from './BrowseClient'
import NavBar from '@/components/NavBar'

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; mode?: string; check_in?: string; check_out?: string }>
}) {
  const params = await searchParams
  return (
    <>
      <NavBar/>
      <BrowseClient
        initialRegion={params.region ?? ''}
        initialMode={(params.mode as 'all' | 'swap' | 'loops') ?? 'all'}
      />
    </>
  )
}