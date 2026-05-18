/**
 * Immowelt Scraper — Freizeitgrundstücke & Kleingärten
 *
 * Scrapes Immowelt listing pages for Freizeitgrundstück/Kleingarten listings.
 * Stores title, price, size, city, PLZ + deeplink back to Immowelt.
 * Runs daily via GitHub Actions.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DELAY_MS = 3000
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const SEARCH_URLS = [
  // Freizeitgrundstück by state
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/bayern/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/nordrhein-westfalen/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/sachsen/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/brandenburg/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/berlin/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/hamburg/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/niedersachsen/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/hessen/ad04de9',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/thueringen/ad04de9',
]

const KLEINGARTEN_KEYWORDS = [
  'kleingarten', 'schrebergarten', 'datsche', 'parzelle', 'gartenanlage',
  'gartenkolonie', 'freizeitgrundstück', 'wochenendgrundstück', 'erholungsgarten',
  'laube', 'gartenlaube', 'gartenverein', 'nachpächter',
]

const NEGATIVE_KEYWORDS = [
  'gartenhaus', 'holzhütte', 'blockhütte', 'geräteschuppen', 'gerätehaus',
  'holzhaus', 'blockhaus', 'satteldach', 'pultdach', 'bausatz',
  'kindergarten', 'gartenservice', 'gartenpflege',
]

function isRelevant(title: string): boolean {
  const lower = title.toLowerCase()
  if (NEGATIVE_KEYWORDS.some(k => lower.includes(k))) return false
  return KLEINGARTEN_KEYWORDS.some(k => lower.includes(k))
}

const PLZ_TO_CITY: Record<string, string> = {
  '10': 'Berlin', '11': 'Berlin', '12': 'Berlin', '13': 'Berlin', '14': 'Potsdam',
  '20': 'Hamburg', '21': 'Hamburg', '22': 'Hamburg',
  '28': 'Bremen',
  '30': 'Hannover', '38': 'Braunschweig',
  '04': 'Leipzig', '01': 'Dresden', '09': 'Chemnitz',
  '06': 'Halle', '39': 'Magdeburg',
  '40': 'Düsseldorf', '44': 'Dortmund', '45': 'Essen', '50': 'Köln', '53': 'Bonn',
  '60': 'Frankfurt', '65': 'Wiesbaden',
  '70': 'Stuttgart', '76': 'Karlsruhe', '79': 'Freiburg',
  '80': 'München', '81': 'München', '86': 'Augsburg', '90': 'Nürnberg',
  '99': 'Erfurt',
}

function cityFromPlz(plz: string): string | undefined {
  return PLZ_TO_CITY[plz.substring(0, 3)] ?? PLZ_TO_CITY[plz.substring(0, 2)]
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 20000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    })
    if (!res.ok) { console.log(`HTTP ${res.status} for ${url}`); return null }
    return await res.text()
  } catch (e) {
    console.log(`Fetch failed for ${url}:`, e)
    return null
  }
}

interface ParsedListing {
  external_id: string
  title: string
  price_abloese?: number
  size_sqm?: number
  city: string
  plz?: string
  contact_url: string
}

function parseImmoweltListings(html: string): ParsedListing[] {
  const listings: ParsedListing[] = []

  // Parse JSON-LD (Immowelt uses schema.org ItemList or Product)
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])
      const items = json['@type'] === 'ItemList'
        ? (json.itemListElement ?? []).map((el: { item?: unknown }) => el.item ?? el)
        : [json]

      for (const item of items) {
        if (!item?.name || !item?.url) continue
        const url = String(item.url)
        const idMatch = url.match(/\/expose\/([a-z0-9]+)/i)
        if (!idMatch) continue

        const title = String(item.name).trim()
        if (!isRelevant(title)) continue

        const price = item.offers?.price
          ? parseInt(String(item.offers.price).replace(/\D/g, ''))
          : undefined
        const plz = item.address?.postalCode
        const cityFromJson = item.address?.addressLocality
        const city = cityFromJson ?? (plz ? cityFromPlz(plz) : undefined) ?? 'Unbekannt'

        const sizeMatch = title.match(/(\d{2,5})\s*m²/i)
        const size_sqm = sizeMatch ? parseInt(sizeMatch[1]) : undefined

        listings.push({
          external_id: `immowelt_${idMatch[1]}`,
          title,
          price_abloese: price && price > 0 ? price : undefined,
          city,
          plz,
          size_sqm,
          contact_url: url.startsWith('http') ? url : `https://www.immowelt.de${url}`,
        })
      }
    } catch { /* skip */ }
  }

  if (listings.length > 0) return listings

  // Fallback: scan for expose links in HTML
  const exposeMatches = [...html.matchAll(/href="((?:https?:\/\/www\.immowelt\.de)?\/expose\/([a-z0-9]+)[^"]*)"[^>]*>([^<]{5,100})</gi)]
  for (const m of exposeMatches) {
    const title = m[3].trim()
    if (!isRelevant(title)) continue
    listings.push({
      external_id: `immowelt_${m[2]}`,
      title,
      contact_url: m[1].startsWith('http') ? m[1] : `https://www.immowelt.de${m[1]}`,
      city: 'Unbekannt',
    })
  }

  return listings
}

async function upsertListings(listings: ParsedListing[]): Promise<number> {
  let saved = 0
  for (const l of listings) {
    const { error } = await supabase.from('listings').upsert({
      source: 'kleinanzeigen' as const, // reuse existing enum value
      external_id: l.external_id,
      title: l.title.substring(0, 300),
      price_abloese: l.price_abloese,
      size_sqm: l.size_sqm,
      city: l.city,
      plz: l.plz,
      contact_url: l.contact_url,
      posted_at: new Date().toISOString(),
      scraped_at: new Date().toISOString(),
      active: true,
    }, { onConflict: 'external_id', ignoreDuplicates: true })
    if (!error) saved++
  }
  return saved
}

async function main() {
  console.log('🏡 Immowelt scraper started')
  let total = 0

  for (const url of SEARCH_URLS) {
    console.log(`\nFetching: ${url}`)
    const html = await fetchPage(url)
    if (!html) { await delay(DELAY_MS); continue }

    const listings = parseImmoweltListings(html)
    console.log(`  Found ${listings.length} listings`)

    if (listings.length > 0) {
      const saved = await upsertListings(listings)
      console.log(`  Saved ${saved}`)
      total += saved
    }

    await delay(DELAY_MS)
  }

  console.log(`\n✅ Immowelt scraper done — ${total} listings saved`)
}

main().catch(e => { console.error(e); process.exit(1) })
