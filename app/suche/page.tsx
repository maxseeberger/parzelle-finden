import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import type { Verein } from '@/lib/supabase'
import VereinCard from '@/components/VereinCard'

export const metadata: Metadata = {
  title: 'Vereine in deiner Nähe — parzelle-finden.de',
  description: 'Kleingartenvereine in 80 km Radius um deine PLZ.',
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface PlzResult {
  latitude: string
  longitude: string
}

async function fetchLatLng(plz: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://openplzapi.org/de/Localities?postalCode=${plz}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data: PlzResult[] = await res.json()
    if (!data || data.length === 0) return null
    const lat = parseFloat(data[0].latitude)
    const lng = parseFloat(data[0].longitude)
    if (isNaN(lat) || isNaN(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

interface VereinWithDistance extends Verein {
  distanceKm: number
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
        <p className="text-gray-500">Die PLZ <strong>{plz}</strong> konnte leider nicht aufgelöst werden. Bitte eine andere PLZ versuchen.</p>
      </div>
    )
  }

  const { lat, lng } = coords
  const latMin = lat - 0.72
  const latMax = lat + 0.72
  const lngMin = lng - 1.05
  const lngMax = lng + 1.05

  const { data, error } = await supabase
    .from('vereine')
    .select('*')
    .gte('lat', latMin)
    .lte('lat', latMax)
    .gte('lng', lngMin)
    .lte('lng', lngMax)
    .order('quality_score', { ascending: false })
    .limit(300)

  if (error) {
    console.error('Suche query error:', error.message)
  }

  const raw: Verein[] = data ?? []

  // Filter to exact 80 km radius and sort by distance
  const results: VereinWithDistance[] = raw
    .filter(v => v.lat != null && v.lng != null)
    .map(v => ({
      ...v,
      distanceKm: haversineKm(lat, lng, v.lat!, v.lng!),
    }))
    .filter(v => v.distanceKm <= 80)
    .sort((a, b) => a.distanceKm - b.distanceKm || (b.quality_score ?? 0) - (a.quality_score ?? 0))

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {results.length} {results.length === 1 ? 'Verein' : 'Vereine'} in 80 km um PLZ {plz}
        </h1>
        <p className="text-gray-500">Sortiert nach Entfernung · Radius 80 km</p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">Keine Vereine in diesem Radius gefunden.</p>
          <p className="text-gray-400 text-sm mt-2">Versuche eine andere PLZ oder schaue im <a href="/vereine" className="underline" style={{ color: 'var(--green-primary)' }}>gesamten Verzeichnis</a>.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(v => (
            <VereinCard key={v.id} verein={v} distanceKm={v.distanceKm} />
          ))}
        </div>
      )}
    </div>
  )
}
