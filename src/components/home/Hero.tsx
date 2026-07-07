import Image from 'next/image'
import HeroSearch from './HeroSearch'

export default function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left: copy + search */}
        <div>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#E8F8EE] px-4 py-1.5 text-[13px] font-medium text-[#15803D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1FAA59]" />
            Home swapping for Sri Lanka &amp; Asia
          </span>

          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-black sm:text-6xl">
            Swap your home.
            <br />
            Travel the world
            <br />
            <span className="text-[#1FAA59]">differently.</span>
          </h1>

          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-gray-500">
            Trade homes with verified members across Galle, Bali, Kyoto and beyond
            — or earn Loops by hosting and spend them anywhere.
          </p>

          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>

        {/* Right: hardcoded photo collage */}
        <div className="hidden grid-cols-2 gap-4 md:grid">
          <div className="relative h-[420px] overflow-hidden rounded-3xl">
            <Image src="/images/house-4.webp" alt="Colonial villa bedroom" fill className="object-cover" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="relative h-[200px] overflow-hidden rounded-3xl">
              <Image src="/images/house-2.jpg" alt="Infinity pool over the ocean" fill className="object-cover" />
            </div>
            <div className="relative h-[200px] overflow-hidden rounded-3xl">
              <Image src="/images/house-3.jpg" alt="Kyoto street at dusk" fill className="object-cover" />
            </div>
          </div>
        </div>
      </div>

      {/* Fourth photo, bottom-left under the tall one, matching the screenshot's offset stack */}
      <div className="mt-1 hidden md:grid md:grid-cols-1">
        <div className="relative h-[260px] w-full max-w-[480px] overflow-hidden rounded-3xl justify-self-end">
          <Image src="/images/house-1.webp" alt="Reflective pool at night" fill className="object-cover" />
        </div>
      </div>
    </section>
  )
}