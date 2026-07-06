'use client'

import { useEffect, useRef } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { useRouter } from 'next/navigation'

export type MapPin = { id: string; lat: number; lng: number; price: number }

const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 }

let optionsSet = false

export default function BrowseMap({ pins }: { pins: MapPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

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
        mapId: 'STAYLOOP_BROWSE_MAP',
        disableDefaultUI: true,
        zoomControl: true,
      })

      pins.forEach((pin) => {
        const pinEl = document.createElement('div')
        pinEl.className =
          'cursor-pointer rounded-full bg-foreground px-3 py-1.5 text-[13px] font-bold text-background shadow-md'
        pinEl.textContent = String(pin.price)

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: pin.lat, lng: pin.lng },
          content: pinEl,
        })

        marker.addListener('click', () => router.push(`/listings/${pin.id}`))
      })
    })

    return () => {
      cancelled = true
    }
  }, [pins, router])

  return <div ref={mapRef} className="h-full w-full" />
}