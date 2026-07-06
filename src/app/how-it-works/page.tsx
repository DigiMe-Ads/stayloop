// src/app/page.tsx
import NavBar from '@/components/NavBar'
import LoopSystem from '@/components/howItWorks/LoopSystem'

export default function Home() {
  return (
    <main>
      <NavBar />
      <LoopSystem />
    </main>
  )
}