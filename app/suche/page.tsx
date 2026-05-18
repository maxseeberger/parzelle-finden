import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import type { Verein } from '@/lib/supabase'
import VereinCard from '@/components/VereinCard'

export const metadata: Metadata = {
  title: 'Vereine in deiner Nähe — parzelle-finden.de',
  description: 'Kleingartenvereine in deiner Nähe — sortiert nach Entfernung.',
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface PlzCoords { lat: number; lng: number; city: string; state: string }

async function fetchLatLng(plz: string): Promise<PlzCoords | null> {
  // Primary: zippopotam.us — covers all 8,000+ German PLZ
  try {
    const res = await fetch(`https://api.zippopotam.us/de/${plz}`, { next: { revalidate: 86400 } })
    if (res.ok) {
      const data = await res.json()
      if (data?.places?.[0]) {
        const lat = parseFloat(data.places[0].latitude)
        const lng = parseFloat(data.places[0].longitude)
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, city: data.places[0]['place name'] ?? '', state: data.places[0].state ?? '' }
        }
      }
    }
  } catch { /* fall through */ }

  // Fallback: Nominatim / OpenStreetMap
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${plz}&country=de&format=json&limit=1`,
      { headers: { 'User-Agent': 'parzelle-finden.de/1.0' }, next: { revalidate: 86400 } }
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, city: data[0].display_name?.split(',')[0] ?? '', state: '' }
        }
      }
    }
  } catch { /* ignore */ }

  return null
}

interface VereinWithDistance extends Verein { distanceKm: number }

function withDistance(vereine: Verein[], lat: number, lng: number): VereinWithDistance[] {
  return vereine
    .filter(v => v.lat != null && v.lng != null)
    .map(v => ({ ...v, distanceKm: haversineKm(lat, lng, v.lat!, v.lng!) }))
    .sort((a, b) => a.distanceKm - b.distanceKm || (b.quality_score ?? 0) - (a.quality_score ?? 0))
}

export default async function SuchePage({
  searchParams,
}: {
  searchParams: Promise<{ plz?: string }>
}) {
  const { plz } = await searchParams

  if (!plz || !/^\d{5}$/.test(plz)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Bitte eine gültige PLZ (5 Ziffern) angeben.</p>
      </div>
    )
  }

  const coords = await fetchLatLng(plz)

  if (!coords) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">PLZ nicht gefunden</h1>
        <p className="text-gray-500 mb-6">Die PLZ <strong>{plz}</strong> konnte nicht aufgelöst werden.</p>
        <a href="/vereine" className="text-sm font-medium underline" style={{ color: 'var(--green-primary)' }}>
          Alle Vereine durchsuchen →
        </a>
      </div>
    )
  }

  const { lat, lng, city: plzCity, state } = coords

  // 1. Try bounding box (~80 km)
  const { data: bboxData } = await supabase
    .from('vereine')
    .select('*')
    .gte('lat', lat - 0.72).lte('lat', lat + 0.72)
    .gte('lng', lng - 1.05).lte('lng', lng + 1.05)
    .order('quality_score', { ascending: false })
    .limit(300)

  let results = withDistance(bboxData ?? [], lat, lng).filter(v => v.distanceKm <= 80)

  // 2. If too few results with lat/lng, also pull by bundesland (catches vereine without coords)
  let fallbackLabel: string | null = null
  if (results.length < 5 && state) {
    const { data: blData } = await supabase
      .from('vereine')
      .select('*')
      .ilike('bundesland', `%${state}%`)
      .order('quality_score', { ascending: false })
      .limit(100)

    if (blData && blData.length > 0) {
      // Merge — prefer ones with distance, append bundesland ones without coords at end
      const withCoords = withDistance(blData, lat, lng)
      const withoutCoords = blData
        .filter(v => v.lat == null || v.lng == null)
        .map(v => ({ ...v, distanceKm: Infinity }))

      const merged = new Map<string, VereinWithDistance>()
      for (const v of [...results, ...withCoords, ...withoutCoords as VereinWithDistance[]]) {
        if (!merged.has(v.id)) merged.set(v.id, v)
      }
      results = Array.from(merged.values())
        .sort((a, b) => {
          if (a.distanceKm === Infinity && b.distanceKm === Infinity) return (b.quality_score ?? 0) - (a.quality_score ?? 0)
          if (a.distanceKm === Infinity) return 1
          if (b.distanceKm === Infinity) return -1
          return a.distanceKm - b.distanceKm
        })

      if (withCoords.length > 0 && withCoords[0].distanceKm > 80) {
        fallbackLabel = `Nächster Verein mit Koordinaten: ${withCoords[0].distanceKm.toFixed(0)} km entfernt`
      }
      if (results.length > 0 && !fallbackLabel) fallbackLabel = `Vereine in ${state}`
    }
  }

  const nearestKm = results.find(v => v.distanceKm < Infinity)?.distanceKm

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span>📍 {plz}{plzCity ? ` · ${plzCity}` : ''}{state ? `, ${state}` : ''}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {results.length} {results.length === 1 ? 'Verein' : 'Vereine'} in der Nähe
        </h1>
        {nearestKm != null && nearestKm < Infinity ? (
          <p className="text-gray-500">
            Nächster Verein: <strong>{nearestKm.toFixed(1).replace('.', ',')} km</strong>
            {fallbackLabel ? ` · ${fallbackLabel}` : ' · Sortiert nach Entfernung'}
          </p>
        ) : fallbackLabel ? (
          <p className="text-gray-500">{fallbackLabel}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {results.map(v => (
          <VereinCard
            key={v.id}
            verein={v}
            distanceKm={v.distanceKm < Infinity ? v.distanceKm : undefined}
          />
        ))}
      </div>
    </div>
  )
}
