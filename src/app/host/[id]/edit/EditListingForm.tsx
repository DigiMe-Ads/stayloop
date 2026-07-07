'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setOptions as setMapOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/lib/supabase/client'
import {
  updateListingBasics,
  updateListingLocation,
  updateListingHostingOptions,
  recomputeListingValue,
  updateListingPrice,
  setListingStatus,
} from './actions'

type Basics = {
  title: string
  property_type: string
  description: string
  bedrooms: number
  beds: number
  max_guests: number
}

type HostingOptions = {
  openToSwap: boolean
  openToLoops: boolean
  amenities: string[]
}

type Photo = { id: string; storagePath: string; url: string }

const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'other', label: 'Other' },
]

const AMENITIES = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'pool', label: 'Pool' },
  { value: 'air_conditioning', label: 'Air conditioning' },
  { value: 'parking', label: 'Parking' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'washer', label: 'Washing machine' },
  { value: 'tv', label: 'TV' },
  { value: 'garden', label: 'Garden' },
  { value: 'sea_view', label: 'Sea view' },
  { value: 'ocean_view', label: 'Ocean view' },
]

const inputCls =
  'mt-1 block w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
const labelCls = 'block text-[13px] font-medium text-foreground'
const sectionCls = 'rounded-2xl border border-border bg-card p-6'
const saveBtnCls =
  'rounded-xl bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background transition hover:opacity-90 disabled:opacity-50'

function SectionStatus({ error, saved }: { error: string | null; saved: boolean }) {
  return (
    <>
      {error && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-[13px] text-destructive">{error}</p>
      )}
      {saved && !error && <p className="mt-3 text-[13px] font-medium text-primary">Saved ✓</p>}
    </>
  )
}

export default function EditListingForm({
  listingId,
  initialStatus,
  initialBasics,
  initialAddress,
  initialRegion,
  initialHostingOptions,
  initialBaseLoops,
  initialLoopsPrice,
  bandPct,
  initialPhotos,
}: {
  listingId: string
  initialStatus: string
  initialBasics: Basics
  initialAddress: string
  initialRegion: string
  initialHostingOptions: HostingOptions
  initialBaseLoops: number | null
  initialLoopsPrice: number | null
  bandPct: number
  initialPhotos: Photo[]
}) {
  const router = useRouter()
  const supabase = createClient()

  // Status
  const [status, setStatus] = useState(initialStatus)
  const [statusPending, setStatusPending] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  // Basics
  const [basics, setBasics] = useState(initialBasics)
  const [basicsPending, setBasicsPending] = useState(false)
  const [basicsError, setBasicsError] = useState<string | null>(null)
  const [basicsSaved, setBasicsSaved] = useState(false)

  // Location
  const [address, setAddress] = useState(initialAddress)
  const [region, setRegion] = useState(initialRegion)
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; placeId: string; address: string; region: string } | null>(null)
  const [locationPending, setLocationPending] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationSaved, setLocationSaved] = useState(false)
  const [placesStatus, setPlacesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [placesError, setPlacesError] = useState<string | null>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Hosting options
  const [hostingOptions, setHostingOptions] = useState(initialHostingOptions)
  const [hostingPending, setHostingPending] = useState(false)
  const [hostingError, setHostingError] = useState<string | null>(null)
  const [hostingSaved, setHostingSaved] = useState(false)

  // Pricing
  const [baseLoops, setBaseLoops] = useState(initialBaseLoops)
  const [loopsPrice, setLoopsPrice] = useState(initialLoopsPrice ?? initialBaseLoops ?? 150)
  const [pricingPending, setPricingPending] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingSaved, setPricingSaved] = useState(false)

  // Photos
  const [photos, setPhotos] = useState(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
    if (!apiKey) {
      setPlacesStatus('error')
      setPlacesError('Google Maps API key is not configured (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY).')
      return
    }
    let cancelled = false
    setPlacesStatus('loading')
    setMapOptions({ key: apiKey, v: 'weekly', libraries: ['places'] })
    importLibrary('places')
      .then(async () => {
        if (cancelled) return
        await new Promise<void>((r) => setTimeout(r, 0))
        if (cancelled || !locationInputRef.current) return
        const { Autocomplete } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
        const ac = new Autocomplete(locationInputRef.current, {
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'lk' },
          fields: ['place_id', 'geometry', 'formatted_address', 'address_components'],
        })
        autocompleteRef.current = ac
        setPlacesStatus('ready')
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place.geometry?.location) return
          const components = place.address_components ?? []
          const district = components.find((c) => c.types.includes('administrative_area_level_2'))
          const province = components.find((c) => c.types.includes('administrative_area_level_1'))
          const newRegion = district?.long_name ?? province?.long_name ?? ''
          const newAddress = place.formatted_address ?? ''
          setAddress(newAddress)
          setRegion(newRegion)
          setPendingLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id ?? '',
            address: newAddress,
            region: newRegion,
          })
          setLocationSaved(false)
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setPlacesStatus('error')
        setPlacesError(`Could not load Google Places: ${msg}`)
      })
    return () => { cancelled = true }
  }, [])

  async function handleSaveBasics() {
    if (!basics.title.trim()) { setBasicsError('Title is required.'); return }
    setBasicsPending(true); setBasicsError(null); setBasicsSaved(false)
    const res = await updateListingBasics(listingId, basics)
    if (res.ok) setBasicsSaved(true)
    else setBasicsError(res.error)
    setBasicsPending(false)
  }

  async function handleSaveLocation() {
    if (!pendingLocation) { setLocationError('Search and select an address from the suggestions first.'); return }
    setLocationPending(true); setLocationError(null); setLocationSaved(false)
    const res = await updateListingLocation(
      listingId, pendingLocation.lat, pendingLocation.lng,
      pendingLocation.placeId, pendingLocation.address, pendingLocation.region,
    )
    if (res.ok) { setLocationSaved(true); setPendingLocation(null) }
    else setLocationError(res.error)
    setLocationPending(false)
  }

  async function handleSaveHosting() {
    setHostingPending(true); setHostingError(null); setHostingSaved(false)
    const res = await updateListingHostingOptions(
      listingId, hostingOptions.openToSwap, hostingOptions.openToLoops, hostingOptions.amenities,
    )
    if (res.ok) setHostingSaved(true)
    else setHostingError(res.error)
    setHostingPending(false)
  }

  async function handleRecompute() {
    setPricingPending(true); setPricingError(null); setPricingSaved(false)
    const res = await recomputeListingValue(listingId)
    if (res.ok) { setBaseLoops(res.baseLoops); setLoopsPrice(res.baseLoops) }
    else setPricingError(res.error)
    setPricingPending(false)
  }

  async function handleSavePrice() {
    setPricingPending(true); setPricingError(null); setPricingSaved(false)
    const res = await updateListingPrice(listingId, loopsPrice)
    if (res.ok) setPricingSaved(true)
    else setPricingError(res.error)
    setPricingPending(false)
  }

  async function handleToggleStatus() {
    const next = status === 'live' ? 'draft' : 'live'
    setStatusPending(true); setStatusError(null)
    const res = await setListingStatus(listingId, next)
    if (res.ok) setStatus(next)
    else setStatusError(res.error)
    setStatusPending(false)
  }

  async function handleUploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true); setPhotoError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPhotoError('Not authenticated.'); setUploading(false); return }

    let nextSort = photos.length
    for (const file of Array.from(files).slice(0, 10 - photos.length)) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${listingId}/${Date.now()}_${nextSort}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) { setPhotoError(`Upload failed: ${uploadErr.message}`); break }

      const { data: row, error: insertErr } = await supabase
        .from('listing_photos')
        .insert({ listing_id: listingId, storage_path: path, sort_order: nextSort })
        .select('id, storage_path')
        .single()
      if (insertErr) { setPhotoError(`Save failed: ${insertErr.message}`); break }

      const url = supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl
      setPhotos((prev) => [...prev, { id: row.id, storagePath: row.storage_path, url }])
      nextSort += 1
    }
    setUploading(false)
  }

  async function handleDeletePhoto(photo: Photo) {
    setPhotoError(null)
    const { error: storageErr } = await supabase.storage.from('listing-photos').remove([photo.storagePath])
    if (storageErr) { setPhotoError(storageErr.message); return }
    const { error: rowErr } = await supabase.from('listing_photos').delete().eq('id', photo.id)
    if (rowErr) { setPhotoError(rowErr.message); return }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  const minLoops = baseLoops != null ? Math.round(baseLoops * (1 - bandPct)) : 80
  const maxLoops = baseLoops != null ? Math.round(baseLoops * (1 + bandPct)) : 320

  return (
    <div className="mt-8 space-y-6">
      {/* Status */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-foreground">Listing status</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {status === 'live' ? 'Your listing is live and visible in search.' : 'Your listing is hidden from search.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={statusPending}
            className={`rounded-full px-5 py-2.5 text-[14px] font-semibold transition disabled:opacity-50 ${
              status === 'live'
                ? 'border border-border text-foreground hover:bg-muted'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {statusPending ? '…' : status === 'live' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
        {statusError && <p className="mt-3 text-[13px] text-destructive">{statusError}</p>}
      </div>

      {/* Basics */}
      <div className={sectionCls}>
        <h2 className="mb-5 text-[16px] font-bold text-foreground">Property details</h2>
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Listing title *</label>
            <input
              type="text" className={inputCls}
              value={basics.title}
              onChange={(e) => setBasics({ ...basics, title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Property type</label>
            <select
              className={inputCls}
              value={basics.property_type}
              onChange={(e) => setBasics({ ...basics, property_type: e.target.value })}
            >
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={4} className={inputCls}
              value={basics.description}
              onChange={(e) => setBasics({ ...basics, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Bedrooms</label>
              <input
                type="number" min={1} max={20} className={inputCls}
                value={basics.bedrooms}
                onChange={(e) => setBasics({ ...basics, bedrooms: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>Total beds</label>
              <input
                type="number" min={1} max={20} className={inputCls}
                value={basics.beds}
                onChange={(e) => setBasics({ ...basics, beds: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>Max guests</label>
              <input
                type="number" min={1} max={30} className={inputCls}
                value={basics.max_guests}
                onChange={(e) => setBasics({ ...basics, max_guests: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <SectionStatus error={basicsError} saved={basicsSaved} />
        <button type="button" onClick={handleSaveBasics} disabled={basicsPending} className={`mt-4 ${saveBtnCls}`}>
          {basicsPending ? 'Saving…' : 'Save details'}
        </button>
      </div>

      {/* Location */}
      <div className={sectionCls}>
        <h2 className="mb-2 text-[16px] font-bold text-foreground">Location</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Search a new address only if you want to move this listing. Your exact address is never shown to guests.
        </p>
        {placesStatus === 'error' && placesError && (
          <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{placesError}</div>
        )}
        <label className={labelCls}>Address</label>
        <input
          ref={locationInputRef}
          type="text"
          defaultValue={address}
          disabled={placesStatus === 'error'}
          placeholder={placesStatus === 'error' ? 'Location search unavailable' : 'Start typing your address…'}
          className={inputCls}
        />
        {region && <p className="mt-2 text-[13px] text-muted-foreground">Region: {region}</p>}
        <SectionStatus error={locationError} saved={locationSaved} />
        <button
          type="button"
          onClick={handleSaveLocation}
          disabled={locationPending || !pendingLocation}
          className={`mt-4 ${saveBtnCls}`}
        >
          {locationPending ? 'Saving…' : 'Save location'}
        </button>
      </div>

      {/* Hosting options + amenities */}
      <div className={sectionCls}>
        <h2 className="mb-4 text-[16px] font-bold text-foreground">How would you like to host?</h2>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:bg-muted">
            <input
              type="checkbox"
              checked={hostingOptions.openToSwap}
              onChange={(e) => setHostingOptions({ ...hostingOptions, openToSwap: e.target.checked })}
              className="mt-0.5 h-5 w-5 flex-shrink-0"
            />
            <div>
              <p className="text-[15px] font-semibold text-foreground">Reciprocal swap</p>
              <p className="text-[13px] text-muted-foreground">Exchange homes simultaneously with another member</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:bg-muted">
            <input
              type="checkbox"
              checked={hostingOptions.openToLoops}
              onChange={(e) => setHostingOptions({ ...hostingOptions, openToLoops: e.target.checked })}
              className="mt-0.5 h-5 w-5 flex-shrink-0"
            />
            <div>
              <p className="text-[15px] font-semibold text-foreground">Loops stays</p>
              <p className="text-[13px] text-muted-foreground">Host guests who pay with Loops points</p>
            </div>
          </label>
        </div>

        <h3 className="mb-3 mt-6 text-[15px] font-semibold text-foreground">Amenities</h3>
        <div className="grid grid-cols-2 gap-2">
          {AMENITIES.map((a) => (
            <label
              key={a.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-[14px] text-foreground transition hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={hostingOptions.amenities.includes(a.value)}
                onChange={(e) =>
                  setHostingOptions({
                    ...hostingOptions,
                    amenities: e.target.checked
                      ? [...hostingOptions.amenities, a.value]
                      : hostingOptions.amenities.filter((v) => v !== a.value),
                  })
                }
                className="h-4 w-4 flex-shrink-0"
              />
              {a.label}
            </label>
          ))}
        </div>
        <SectionStatus error={hostingError} saved={hostingSaved} />
        <button type="button" onClick={handleSaveHosting} disabled={hostingPending} className={`mt-4 ${saveBtnCls}`}>
          {hostingPending ? 'Saving…' : 'Save hosting options'}
        </button>
      </div>

      {/* Photos */}
      <div className={sectionCls}>
        <h2 className="mb-4 text-[16px] font-bold text-foreground">Photos</h2>
        {photos.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(p)}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[14px] font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <label
          htmlFor="photos-input"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-8 text-center transition hover:bg-muted"
        >
          <p className="text-[14px] font-semibold text-foreground">
            {uploading ? 'Uploading…' : 'Click to add photos'}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">Up to {10 - photos.length} more</p>
        </label>
        <input
          id="photos-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={uploading || photos.length >= 10}
          onChange={(e) => handleUploadPhotos(e.target.files)}
        />
        {photoError && <p className="mt-3 text-[13px] text-destructive">{photoError}</p>}
      </div>

      {/* Pricing */}
      {hostingOptions.openToLoops && (
        <div className={sectionCls}>
          <h2 className="mb-4 text-[16px] font-bold text-foreground">Loops pricing</h2>
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-secondary p-4">
            <div>
              <p className="text-[13px] font-semibold text-accent">Suggested base price</p>
              <p className="text-[13px] text-muted-foreground">Allowed range: {minLoops}–{maxLoops} Loops / night</p>
            </div>
            <button
              type="button"
              onClick={handleRecompute}
              disabled={pricingPending}
              className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              Recalculate
            </button>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <label className={labelCls}>Your price</label>
            <span className="text-[15px] font-bold text-foreground">{loopsPrice} Loops / night</span>
          </div>
          <input
            type="range" min={minLoops} max={maxLoops} step={1}
            value={loopsPrice}
            onChange={(e) => setLoopsPrice(Number(e.target.value))}
            className="w-full"
          />
          <SectionStatus error={pricingError} saved={pricingSaved} />
          <button type="button" onClick={handleSavePrice} disabled={pricingPending} className={`mt-4 ${saveBtnCls}`}>
            {pricingPending ? 'Saving…' : 'Save price'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="text-[14px] font-semibold text-accent hover:text-primary"
      >
        ← Back to dashboard
      </button>
    </div>
  )
}
