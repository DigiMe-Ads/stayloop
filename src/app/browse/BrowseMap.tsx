'use client'

import { useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

export type MapPin = {
  id: string
  lat: number
  lng: number
  price: number
  title: string
  region: string | null
  country: string
  rating: number | null
  cover: string | null
}

const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 }

let optionsSet = false

function MarkerContent({ pin }: { pin: MapPin }) {
  return (
    <div className="group relative flex -translate-y-1/2 flex-col items-center">
      <div className="cursor-pointer rounded-full bg-foreground px-3 py-1.5 text-[13px] font-bold text-background shadow-md transition group-hover:scale-105">
        {pin.price}
      </div>

      {/* Hover summary card */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        <div className="relative h-24 w-full bg-muted">
          {pin.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pin.cover} alt={pin.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">No photo</div>
          )}
        </div>
        <div className="p-2.5">
          <p className="truncate text-[13px] font-bold text-foreground">{pin.title}</p>
          <div className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <span className="truncate">{pin.region ? `${pin.region}, ${pin.country}` : pin.country}</span>
            {pin.rating != null && (
              <span className="flex shrink-0 items-center gap-0.5 font-medium text-foreground">
                <Star size={10} className="fill-current" /> {pin.rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] font-semibold text-primary">{pin.price} Loops/night</p>
        </div>
      </div>
    </div>
  )
}

export default function BrowseMap({ pins }: { pins: MapPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const roots: Root[] = []

    if (!optionsSet) {
      setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY!, v: 'weekly' })
      optionsSet = true
    }

    Promise.all([importLibrary('maps'), importLibrary('marker')]).then(async () => {
      if (cancelled || !mapRef.current) return
      const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary
      const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary

      const map = new Map(mapRef.current, {
        center: SRI_LANKA_CENTER,
        zoom: 8,
        // DEMO_MAP_ID is Google's built-in test Map ID — Advanced Markers
        // require *some* registered Map ID to render, and no real one has
        // been created in Google Cloud Console for this project yet. Swap
        // this for a real Map ID (Maps Platform → Map Management) once one
        // exists, e.g. to apply custom map styling.
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: true,
        zoomControl: true,
      })

      pins.forEach((pin) => {
        const container = document.createElement('div')
        const root = createRoot(container)
        root.render(<MarkerContent pin={pin} />)
        roots.push(root)

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: pin.lat, lng: pin.lng },
          content: container,
          zIndex: 1,
        })

        container.addEventListener('mouseenter', () => { marker.zIndex = 999 })
        container.addEventListener('mouseleave', () => { marker.zIndex = 1 })
        container.addEventListener('click', () => router.push(`/listings/${pin.id}`))
      })
    })

    return () => {
      cancelled = true
      roots.forEach((r) => r.unmount())
    }
  }, [pins, router])

  return <div ref={mapRef} className="h-full w-full" />
}
