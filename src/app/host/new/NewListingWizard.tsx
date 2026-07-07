'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setOptions as setMapOptions, importLibrary } from '@googlemaps/js-api-loader'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AMENITY_ICONS } from '@/lib/amenityIcons'
import {
  createDraftListing,
  setListingLocation,
  updateListingOptions,
  computeListingValue,
  publishListing,
} from './actions'

type Basics = {
  title: string
  property_type: string
  description: string
  bedrooms: number
  beds: number
  max_guests: number
}

type LocationData = {
  placeId: string
  address: string
  region: string
  lat: number
  lng: number
}

type HostingOptions = {
  openToSwap: boolean
  openToLoops: boolean
  amenities: string[]
}

type PricingInfo = { baseLoops: number; bandPct: number }

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

const STEP_LABELS = ['Property details', 'Location', 'Availability', 'Photos', 'Pricing']

const inputCls =
  'mt-1 block w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
const labelCls = 'block text-[13px] font-medium text-foreground'

export default function NewListingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [listingId, setListingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [basics, setBasics] = useState<Basics>({
    title: '',
    property_type: 'house',
    description: '',
    bedrooms: 1,
    beds: 1,
    max_guests: 2,
  })

  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [placesStatus, setPlacesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [placesError, setPlacesError] = useState<string | null>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const [hostingOptions, setHostingOptions] = useState<HostingOptions>({
    openToSwap: true,
    openToLoops: true,
    amenities: [],
  })

  const [photos, setPhotos] = useState<File[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null)
  const [loopsPrice, setLoopsPrice] = useState(150)

  // Load Google Places autocomplete when on step 2
  useEffect(() => {
    if (step !== 2) return
    if (autocompleteRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
    if (!apiKey) {
      setPlacesStatus('error')
      setPlacesError('Google Maps API key is not configured (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY).')
      return
    }

    let cancelled = false
    setPlacesStatus('loading')

    setMapOptions({ key: apiKey, v: 'weekly', libraries: ['places'] })

    // Mirror the BrowseMap.tsx pattern: use loader to trigger script load,
    // then use the global google.maps.importLibrary for the actual import
    importLibrary('places')
      .then(async () => {
        if (cancelled) return

        // Wait one tick to ensure locationInputRef is attached after render
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
          const region = district?.long_name ?? province?.long_name ?? ''
          setLocationData({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id ?? '',
            address: place.formatted_address ?? '',
            region,
          })
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setPlacesStatus('error')
        setPlacesError(`Could not load Google Places: ${msg}. Make sure the Places API is enabled for your API key in Google Cloud Console.`)
      })

    return () => { cancelled = true }
  }, [step])

  // Generate object URLs for photo previews
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPhotoUrls(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])

  function clearError() {
    setError(null)
  }

  async function handleStep1() {
    if (!basics.title.trim()) { setError('Title is required'); return }
    setLoading(true); clearError()
    const fd = new FormData()
    fd.append('title', basics.title)
    fd.append('property_type', basics.property_type)
    fd.append('description', basics.description)
    fd.append('bedrooms', String(basics.bedrooms))
    fd.append('beds', String(basics.beds))
    fd.append('max_guests', String(basics.max_guests))
    try {
      const res = await createDraftListing(null, fd)
      if (!res.ok) { setError(res.error); return }
      setListingId(res.id)
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2() {
    if (!locationData) { setError('Please select a location from the suggestions.'); return }
    if (!listingId) return
    setLoading(true); clearError()
    try {
      const res = await setListingLocation(
        listingId,
        locationData.lat,
        locationData.lng,
        locationData.placeId,
        locationData.address,
        locationData.region,
      )
      if (!res.ok) { setError(res.error); return }
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  async function handleStep3() {
    if (!hostingOptions.openToSwap && !hostingOptions.openToLoops) {
      setError('Please select at least one hosting option.')
      return
    }
    if (!listingId) return
    setLoading(true); clearError()
    try {
      const res = await updateListingOptions(
        listingId,
        hostingOptions.openToSwap,
        hostingOptions.openToLoops,
        hostingOptions.amenities,
      )
      if (!res.ok) { setError(res.error); return }
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  async function handleStep4() {
    if (!listingId) return
    setLoading(true); clearError()
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated'); return }

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${user.id}/${listingId}/${Date.now()}_${i}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('listing-photos')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (uploadErr) { setError(`Photo upload failed: ${uploadErr.message}`); return }

        const { error: insertErr } = await supabase
          .from('listing_photos')
          .insert({ listing_id: listingId, storage_path: path, sort_order: i })
        if (insertErr) { setError(`Photo save failed: ${insertErr.message}`); return }
      }

      if (hostingOptions.openToLoops) {
        const res = await computeListingValue(listingId)
        if (!res.ok) { setError(res.error); return }
        setPricingInfo({ baseLoops: res.baseLoops, bandPct: res.bandPct })
        setLoopsPrice(res.baseLoops)
      }

      setStep(5)
    } finally {
      setLoading(false)
    }
  }

  async function handleStep5() {
    if (!listingId) return
    setLoading(true); clearError()
    try {
      const res = await publishListing(
        listingId,
        hostingOptions.openToLoops && pricingInfo ? loopsPrice : null,
      )
      if (!res.ok) { setError(res.error); return }
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (step === 1) handleStep1()
    else if (step === 2) handleStep2()
    else if (step === 3) handleStep3()
    else if (step === 4) handleStep4()
    else handleStep5()
  }

  const minLoops = pricingInfo ? Math.round(pricingInfo.baseLoops * (1 - pricingInfo.bandPct)) : 80
  const maxLoops = pricingInfo ? Math.round(pricingInfo.baseLoops * (1 + pricingInfo.bandPct)) : 320

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const done = step > n
          const active = step === n
          return (
            <div key={n} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors ${
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                    ? 'bg-foreground text-background'
                    : 'border border-border text-muted-foreground'
                }`}
              >
                {done ? <Check size={14} /> : n}
              </div>
              <span className={`hidden text-[12px] sm:inline ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div className={`mx-1 h-px w-6 flex-shrink-0 ${step > n ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-6 text-[18px] font-bold text-foreground">{STEP_LABELS[step - 1]}</h2>

        {/* Step 1 — Property details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Listing title *</label>
              <input
                type="text"
                placeholder="e.g. Cozy villa in Galle Fort"
                className={inputCls}
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
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                rows={4}
                placeholder="Tell guests what makes your home special..."
                className={inputCls}
                value={basics.description}
                onChange={(e) => setBasics({ ...basics, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Bedrooms</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputCls}
                  value={basics.bedrooms}
                  onChange={(e) => setBasics({ ...basics, bedrooms: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Bathrooms</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputCls}
                  value={basics.beds}
                  onChange={(e) => setBasics({ ...basics, beds: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Max guests</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className={inputCls}
                  value={basics.max_guests}
                  onChange={(e) => setBasics({ ...basics, max_guests: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="text-[14px] text-muted-foreground">
              Search for your property address. Your exact address is never shown to guests — only the approximate area is visible on the map.
            </p>

            {placesStatus === 'error' && placesError && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                <p className="font-semibold">Location search unavailable</p>
                <p className="mt-1">{placesError}</p>
              </div>
            )}

            <div>
              <label className={labelCls}>
                Address
                {placesStatus === 'loading' && (
                  <span className="ml-2 text-[12px] font-normal text-muted-foreground">Loading Maps…</span>
                )}
              </label>
              <input
                ref={locationInputRef}
                type="text"
                placeholder={placesStatus === 'error' ? 'Location search unavailable' : 'Start typing your address…'}
                className={inputCls}
                disabled={placesStatus === 'error'}
                defaultValue={locationData?.address}
              />
              {placesStatus === 'ready' && (
                <p className="mt-1 text-[12px] text-muted-foreground">Type to search — Sri Lanka addresses only</p>
              )}
            </div>

            {locationData && (
              <div className="rounded-xl bg-secondary p-4">
                <p className="text-[13px] font-semibold text-accent">{locationData.address}</p>
                {locationData.region && (
                  <p className="mt-1 text-[13px] text-muted-foreground">Region: {locationData.region}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Availability & amenities */}
        {step === 3 && (
          <div className="space-y-7">
            <div>
              <h3 className="mb-3 text-[15px] font-semibold text-foreground">How would you like to host?</h3>
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
                    <p className="text-[13px] text-muted-foreground">Host guests who pay with Loops points — you earn Loops in return</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-[15px] font-semibold text-foreground">Amenities</h3>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map((a) => {
                  const Icon = AMENITY_ICONS[a.value]
                  return (
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
                      {Icon && <Icon size={16} className="shrink-0 text-muted-foreground" />}
                      {a.label}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Photos */}
        {step === 4 && (
          <div className="space-y-5">
            <p className="text-[14px] text-muted-foreground">
              Add photos of your home. The first photo will be the cover image shown in search results. You can add more later.
            </p>
            <label
              htmlFor="photos-input"
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-10 text-center transition hover:bg-muted"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-3 text-muted-foreground">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-[15px] font-semibold text-foreground">Click to upload photos</p>
              <p className="mt-1 text-[13px] text-muted-foreground">JPEG or PNG — up to 10 photos</p>
            </label>
            <input
              id="photos-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 10))}
            />
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photoUrls.map((url, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[14px] font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[13px] text-muted-foreground">Photos are optional — you can skip this step and add them later.</p>
          </div>
        )}

        {/* Step 5 — Pricing */}
        {step === 5 && (
          <div className="space-y-6">
            {hostingOptions.openToLoops && pricingInfo ? (
              <>
                <p className="text-[14px] text-muted-foreground">
                  Based on your property and location, here&apos;s your suggested Loops price. You can adjust it within the allowed range.
                </p>
                <div className="rounded-2xl bg-secondary p-5">
                  <p className="text-[13px] font-semibold text-accent">Suggested base price</p>
                  <p className="mt-1 text-3xl font-extrabold text-foreground">
                    {pricingInfo.baseLoops}{' '}
                    <span className="text-[16px] font-medium">Loops / night</span>
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Allowed range: {minLoops}–{maxLoops} Loops / night
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className={labelCls}>Your price</label>
                    <span className="text-[15px] font-bold text-foreground">{loopsPrice} Loops / night</span>
                  </div>
                  <input
                    type="range"
                    min={minLoops}
                    max={maxLoops}
                    step={1}
                    value={loopsPrice}
                    onChange={(e) => setLoopsPrice(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-secondary p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-[17px] font-bold text-foreground">Ready to publish</h3>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  {hostingOptions.openToSwap
                    ? 'Your listing will be open for reciprocal swaps.'
                    : 'Your listing details are complete.'}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { clearError(); setStep(step - 1) }}
              disabled={loading}
              className="rounded-xl border border-border px-5 py-3 text-[15px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="rounded-xl bg-foreground px-6 py-3 text-[15px] font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Saving…' : step === 5 ? 'Publish listing' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
