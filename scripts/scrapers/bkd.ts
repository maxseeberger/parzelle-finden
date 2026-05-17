/**
 * Vereins-Scraper — OpenStreetMap Overpass API
 *
 * Uses OSM's free Overpass API to get all German Kleingarten associations
 * (landuse=allotments) with names, coordinates, and contact data.
 * Much more reliable than scraping BKD/gartenverein.de websites.
 * Runs weekly via GitHub Actions.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DELAY_MS = 3000
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// Bundesland bounding boxes [south, west, north, east]
const BUNDESLAENDER: Array<{ name: string; bbox: string }> = [
  { name: 'Berlin', bbox: '52.338,13.088,52.677,13.761' },
  { name: 'Hamburg', bbox: '53.395,9.731,53.748,10.326' },
  { name: 'Bremen', bbox: '52.984,8.481,53.228,8.991' },
  { name: 'Nordrhein-Westfalen', bbox: '50.322,5.866,52.532,9.462' },
  { name: 'Bayern', bbox: '47.270,9.869,50.564,13.840' },
  { name: 'Baden-Württemberg', bbox: '47.533,7.511,49.791,10.496' },
  { name: 'Hessen', bbox: '49.395,7.773,51.659,10.237' },
  { name: 'Niedersachsen', bbox: '51.296,6.654,53.894,11.598' },
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
  const query = `[out:json][timeout:60];(relation["landuse"="allotments"]["name"](${bbox});way["landuse"="allotments"]["name"](${bbox});node["leisure"="garden"]["garden:type"="allotment"]["name"](${bbox}););out center tags;`
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 70000)
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'parzelle-finden.de/1.0 (+https://parzelle-finden.de)',
      },
    })
    if (!res.ok) { console.log(`Overpass HTTP ${res.status}`); return [] }
    const json = await res.json()
    return json.elements ?? []
  } catch (e) {
    console.log('Overpass error:', e)
    return []
  }
}

const GARDEN_KEYWORDS = ['garten', 'kgv', 'kleingarten', 'schrebergarten', 'parzelle', 'laube', 'gartenverein', 'gartenanlage']

function isGartenVerein(name: string): boolean {
  const lower = name.toLowerCase()
  return GARDEN_KEYWORDS.some(k => lower.includes(k))
}

let upsertCount = 0

async function upsertVerein(el: OsmElement, bundesland: string): Promise<void> {
  const tags = el.tags ?? {}
  const name = tags.name ?? tags['name:de']
  if (!name || name.length < 3 || !isGartenVerein(name)) return

  const city = tags['addr:city'] ?? tags['addr:suburb'] ?? tags['addr:town'] ?? tags['addr:village'] ?? 'Unbekannt'

  const { error } = await supabase.from('vereine').upsert({
    name: name.substring(0, 200),
    city,
    plz: tags['addr:postcode'],
    bundesland,
    website: tags.website ?? tags['contact:website'] ?? tags.url,
    phone: tags.phone ?? tags['contact:phone'],
    email: tags.email ?? tags['contact:email'],
    warteliste_status: 'unbekannt',
    last_updated: new Date().toISOString(),
  }, { onConflict: 'name,city', ignoreDuplicates: true })

  if (!error) {
    upsertCount++
    if (upsertCount % 100 === 0) console.log(`  → ${upsertCount} Vereine gespeichert`)
  }
}

async function main() {
  console.log('🌱 OSM Vereins-Scraper gestartet —', new Date().toLocaleString('de-DE'))

  // Clear old garbage data
  await supabase.from('vereine').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Alte Vereinsdaten gelöscht, starte neu...\n')

  for (const bl of BUNDESLAENDER) {
    console.log(`📍 ${bl.name}`)
    const elements = await queryOverpass(bl.bbox)
    console.log(`  ${elements.length} OSM-Elemente`)

    for (const el of elements) {
      await upsertVerein(el, bl.name)
    }
    await delay(DELAY_MS)
  }

  console.log(`\n✅ Fertig. ${upsertCount} Vereine in Supabase gespeichert.`)
}

main().catch(console.error)
