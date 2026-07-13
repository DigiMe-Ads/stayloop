// src/app/page.tsx
import Hero from '@/components/home/Hero'
import HowItWorks from '@/components/home/HowItWorks'
import FeaturedHomes from '@/components/home/FeaturedHomes'
import TrustStrip from '@/components/home/TrustStrip'

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <FeaturedHomes />
      <TrustStrip />
    </main>
  )
}