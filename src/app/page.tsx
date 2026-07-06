// src/app/page.tsx
import NavBar from '@/components/NavBar'
import Hero from '@/components/home/Hero'
import HowItWorks from '@/components/home/HowItWorks'
import FeaturedHomes from '@/components/home/FeaturedHomes'
import TrustStrip from '@/components/home/TrustStrip'

export default function Home() {
  return (
    <main>
      <NavBar />
      <Hero />
      <HowItWorks />
      <FeaturedHomes />
      <TrustStrip />
    </main>
  )
}