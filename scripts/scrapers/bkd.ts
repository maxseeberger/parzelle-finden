/**
 * Vereins-Scraper — OpenStreetMap Overpass API
 *
 * Uses OSM's free Overpass API to get all German Kleingarten associations.
 * Runs weekly via GitHub Actions.
 *
 * Key design decisions:
 * - NEVER deletes existing records — uses upsert with ignoreDuplicates:false to update
 * - Large states (Bayern, NRW, BW, Niedersachsen) are split into sub-regions
 *   to avoid Overpass timeout (60s limit)
 * - Stores lat/lng from OSM so radius search works
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DELAY_MS = 2500
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// Split large states into smaller sub-regions to avoid Overpass timeout.
// Each bbox: [south, west, north, east]
const REGIONS: Array<{ name: string; bbox: string }> = [
  // ── City states (small, one query each) ──
  { name: 'Berlin', bbox: '52.338,13.088,52.677,13.761' },
  { name: 'Hamburg', bbox: '53.395,9.731,53.748,10.326' },
  { name: 'Bremen', bbox: '52.984,8.481,53.228,8.991' },

  // ── Bayern — split into 4 sub-regions ──
  { name: 'Bayern', bbox: '47.270,9.869,48.500,11.500' },   // Allgäu + Oberbayern West (incl. München)
  { name: 'Bayern', bbox: '47.270,11.500,48.500,13.840' },  // Oberbayern Ost + Niederbayern Süd
  { name: 'Bayern', bbox: '48.500,9.869,50.564,11.500' },   // Franken West + Schwaben Nord
  { name: 'Bayern', bbox: '48.500,11.500,50.564,13.840' },  // Oberpfalz + Franken Ost

  // ── Nordrhein-Westfalen — split into 3 ──
  { name: 'Nordrhein-Westfalen', bbox: '50.322,5.866,51.200,7.500' },  // Aachen, Köln, Bonn
  { name: 'Nordrhein-Westfalen', bbox: '51.200,5.866,52.532,7.500' },  // Ruhrgebiet West, Münster
  { name: 'Nordrhein-Westfalen', bbox: '50.322,7.500,52.532,9.462' },  // Dortmund, Bielefeld, OWL

  // ── Baden-Württemberg — split into 2 ──
  { name: 'Baden-Württemberg', bbox: '47.533,7.511,48.700,9.000' },   // Süd: Freiburg, Konstanz
  { name: 'Baden-Württemberg', bbox: '48.700,7.511,49.791,10.496' },  // Nord: Stuttgart, Mannheim, Heidelberg

  // ── Niedersachsen — split into 2 ──
  { name: 'Niedersachsen', bbox: '51.296,6.654,52.600,9.500' },   // Süd: Göttingen, Hannover
  { name: 'Niedersachsen', bbox: '52.600,6.654,53.894,11.598' },  // Nord: Osnabrück, Oldenburg, Lüneburg

  // ── Medium states (single query) ──
  { name: 'Hessen', bbox: '49.395,7.773,51.659,10.237' },
  { name: 'Sachsen', bbox: '50.171,11.872,51.685,15.042' },
  { name: 'Sachsen-Anhalt', bbox: '51.044,10.561,53.042,13.186' },
  { name: 'Thüringen', bbox: '50.204,9.876,51.648,12.654' },
  { name: 'Brandenburg', bbox: '51.360,11.267,53.558,14.765' },
  { name: 'Mecklenburg-Vorpommern', bbox: '53.109,10.593,54.684,14.412' },
  { name: 'Rheinland-Pfalz', bbox: '48.967,6.113,50.942,8.508' },
  { name: 'Saarland', bbox: '49.113,6.359,49.639,7.404' },
  { name: 'Schleswig-Holstein', bbox: '53.359,8.007,55.058,11.312' },
]

interface OsmElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function queryOverpass(bbox: string): Promise<OsmElement[]> {
  const query = `[out:json][timeout:55];(relation["landuse"="allotments"]["name"](${bbox});way["landuse"="allotments"]["name"](${bbox});node["leisure"="garden"]["garden:type"="allotment"]["name"](${bbox}););out center tags;`
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 65000)
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'parzelle-finden.de/1.0 (+https://parzelle-finden.de)',
      },
    })
    if (!res.ok) { console.log(`Overpass HTTP ${res.status} for bbox ${bbox}`); return [] }
    const json = await res.json()
    return json.elements ?? []
  } catch (e) {
    console.log(`Overpass error for bbox ${bbox}:`, e)
    return []
  }
}

const GARDEN_KEYWORDS = ['garten', 'kgv', 'kleingarten', 'schrebergarten', 'parzelle', 'laube', 'gartenverein', 'gartenanlage']

function isGartenVerein(name: string): boolean {
  return GARDEN_KEYWORDS.some(k => name.toLowerCase().includes(k))
}

let upsertCount = 0

async function upsertVerein(el: OsmElement, bundesland: string): Promise<void> {
  const tags = el.tags ?? {}
  const name = tags.name ?? tags['name:de']
  if (!name || name.length < 3 || !isGartenVerein(name)) return

  // Extract coordinates — OSM returns either direct lat/lon (nodes) or center (ways/relations)
  const lat = el.lat ?? el.center?.lat ?? null
  const lng = el.lon ?? el.center?.lon ?? null

  const city = tags['addr:city'] ?? tags['addr:suburb'] ?? tags['addr:town'] ?? tags['addr:village'] ?? 'Unbekannt'

  const { error } = await supabase.from('vereine').upsert({
    name: name.substring(0, 200),
    city,
    plz: tags['addr:postcode'] ?? null,
    bundesland,
    lat,
    lng,
    website: tags.website ?? tags['contact:website'] ?? tags.url ?? null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    email: tags.email ?? tags['contact:email'] ?? null,
    warteliste_status: 'unbekannt',
    last_updated: new Date().toISOString(),
  }, {
    onConflict: 'name,city',
    ignoreDuplicates: false,  // always update to get latest coords + contact info
  })

  if (error) {
    // Silently skip duplicates / constraint errors
    if (!error.message.includes('duplicate')) {
      console.error(`  Upsert error for "${name}":`, error.message)
    }
  } else {
    upsertCount++
    if (upsertCount % 100 === 0) console.log(`  → ${upsertCount} Vereine gespeichert`)
  }
}

async function main() {
  console.log('🌱 OSM Vereins-Scraper gestartet —', new Date().toLocaleString('de-DE'))
  console.log(`  ${REGIONS.length} Regionen werden abgefragt\n`)

  // ⚠️  NEVER delete existing records — upsert only
  // This ensures city pages stay populated even if a region temporarily times out

  for (const region of REGIONS) {
    console.log(`📍 ${region.name} (bbox: ${region.bbox})`)
    const elements = await queryOverpass(region.bbox)
    console.log(`  ${elements.length} OSM-Elemente gefunden`)

    for (const el of elements) {
      await upsertVerein(el, region.name)
    }

    await delay(DELAY_MS)
  }

  console.log(`\n✅ Fertig. ${upsertCount} Vereine upserted.`)
}

main().catch(console.error)
