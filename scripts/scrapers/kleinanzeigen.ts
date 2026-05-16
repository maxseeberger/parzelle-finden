/**
 * Kleinanzeigen Scraper — Deeplink strategy (ToS-safe)
 *
 * We store title, price, size, city, PLZ + a deeplink back to Kleinanzeigen.
 * We do NOT copy full descriptions or contact details — users click through.
 * Runs daily via GitHub Actions cron.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = 'https://www.kleinanzeigen.de/s-grundstuecke-garten/kleingarten/k0c207'
const MAX_PAGES = 20
const DELAY_MS = 2500

// PLZ prefix → city mapping (German postal codes, first 3 digits)
const PLZ_TO_CITY: Record<string, string> = {
  // Berlin
  '100': 'Berlin', '101': 'Berlin', '102': 'Berlin', '103': 'Berlin', '104': 'Berlin',
  '105': 'Berlin', '106': 'Berlin', '107': 'Berlin', '108': 'Berlin', '109': 'Berlin',
  '110': 'Berlin', '111': 'Berlin', '112': 'Berlin', '113': 'Berlin', '114': 'Berlin',
  '115': 'Berlin', '116': 'Berlin', '117': 'Berlin', '118': 'Berlin', '119': 'Berlin',
  '120': 'Berlin', '121': 'Berlin', '122': 'Berlin', '123': 'Berlin', '124': 'Berlin',
  '125': 'Berlin', '126': 'Berlin', '127': 'Berlin', '128': 'Berlin', '129': 'Berlin',
  '130': 'Berlin', '131': 'Berlin', '132': 'Berlin', '133': 'Berlin', '134': 'Berlin',
  '135': 'Berlin', '136': 'Berlin', '137': 'Berlin', '138': 'Berlin', '139': 'Berlin',
  '140': 'Berlin', '141': 'Berlin', '142': 'Berlin', '143': 'Berlin', '144': 'Berlin',
  // Hamburg
  '200': 'Hamburg', '201': 'Hamburg', '202': 'Hamburg', '203': 'Hamburg', '204': 'Hamburg',
  '205': 'Hamburg', '206': 'Hamburg', '207': 'Hamburg', '208': 'Hamburg', '209': 'Hamburg',
  '210': 'Hamburg', '211': 'Hamburg', '212': 'Hamburg', '213': 'Hamburg', '214': 'Hamburg',
  '215': 'Hamburg', '216': 'Hamburg', '217': 'Hamburg', '218': 'Hamburg', '219': 'Hamburg',
  '220': 'Hamburg', '221': 'Hamburg', '222': 'Hamburg',
  // Bremen
  '280': 'Bremen', '281': 'Bremen', '282': 'Bremen', '283': 'Bremen', '284': 'Bremen', '285': 'Bremen',
  // Hannover
  '301': 'Hannover', '302': 'Hannover', '303': 'Hannover', '304': 'Hannover', '305': 'Hannover',
  // Leipzig
  '041': 'Leipzig', '042': 'Leipzig', '043': 'Leipzig', '044': 'Leipzig',
  // Dresden
  '010': 'Dresden', '011': 'Dresden', '012': 'Dresden', '013': 'Dresden',
  // Chemnitz
  '090': 'Chemnitz', '091': 'Chemnitz', '092': 'Chemnitz',
  // Erfurt
  '990': 'Erfurt', '991': 'Erfurt', '992': 'Erfurt',
  // Rostock
  '180': 'Rostock', '181': 'Rostock', '182': 'Rostock',
  // Magdeburg
  '390': 'Magdeburg', '391': 'Magdeburg', '392': 'Magdeburg',
  // Halle
  '060': 'Halle', '061': 'Halle',
  // Potsdam
  '144': 'Potsdam', '145': 'Potsdam', '146': 'Potsdam', '147': 'Potsdam',
  // Düsseldorf
  '401': 'Düsseldorf', '402': 'Düsseldorf', '403': 'Düsseldorf', '404': 'Düsseldorf', '405': 'Düsseldorf',
  // Köln
  '506': 'Köln', '507': 'Köln', '508': 'Köln', '509': 'Köln', '510': 'Köln', '511': 'Köln',
  // Bonn
  '531': 'Bonn', '532': 'Bonn', '533': 'Bonn',
  // Dortmund
  '440': 'Dortmund', '441': 'Dortmund', '442': 'Dortmund', '443': 'Dortmund', '444': 'Dortmund',
  // Essen
  '451': 'Essen', '452': 'Essen', '453': 'Essen',
  // Bochum
  '447': 'Bochum', '448': 'Bochum', '449': 'Bochum',
  // Münster
  '481': 'Münster', '482': 'Münster', '483': 'Münster',
  // Frankfurt
  '600': 'Frankfurt', '601': 'Frankfurt', '602': 'Frankfurt', '603': 'Frankfurt', '604': 'Frankfurt',
  '605': 'Frankfurt', '606': 'Frankfurt', '607': 'Frankfurt', '608': 'Frankfurt',
  // Stuttgart
  '700': 'Stuttgart', '701': 'Stuttgart', '702': 'Stuttgart', '703': 'Stuttgart', '704': 'Stuttgart',
  '705': 'Stuttgart', '706': 'Stuttgart', '707': 'Stuttgart',
  // Karlsruhe
  '760': 'Karlsruhe', '761': 'Karlsruhe', '762': 'Karlsruhe',
  // Mannheim
  '681': 'Mannheim', '682': 'Mannheim', '683': 'Mannheim',
  // München
  '800': 'München', '801': 'München', '802': 'München', '803': 'München', '804': 'München',
  '805': 'München', '806': 'München', '807': 'München', '808': 'München', '809': 'München',
  '810': 'München', '811': 'München', '812': 'München', '813': 'München', '814': 'München',
  '815': 'München', '816': 'München', '817': 'München', '818': 'München',
  // Augsburg
  '860': 'Augsburg', '861': 'Augsburg', '862': 'Augsburg',
  // Nürnberg
  '900': 'Nürnberg', '901': 'Nürnberg', '902': 'Nürnberg', '903': 'Nürnberg', '904': 'Nürnberg',
  '905': 'Nürnberg',
}

function cityFromPlz(plz: string): string | undefined {
  const prefix3 = plz.substring(0, 3)
  const prefix2 = plz.substring(0, 2)
  return PLZ_TO_CITY[prefix3] ?? PLZ_TO_CITY[prefix2]
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'de-DE,de;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.kleinanzeigen.de/',
      },
    })
    if (!res.ok) {
      console.log(`HTTP ${res.status} for ${url}`)
      return null
    }
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
  posted_at: string
}

const GERMAN_CITIES = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
  'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg',
  'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Karlsruhe',
  'Mannheim', 'Augsburg', 'Wiesbaden', 'Gelsenkirchen', 'Aachen', 'Braunschweig',
  'Kiel', 'Chemnitz', 'Halle', 'Magdeburg', 'Freiburg', 'Erfurt', 'Rostock',
  'Kassel', 'Mainz', 'Saarbrücken', 'Potsdam', 'Lübeck', 'Oldenburg', 'Osnabrück',
  'Heidelberg', 'Darmstadt', 'Regensburg', 'Paderborn', 'Würzburg', 'Ingolstadt',
  'Wolfsburg', 'Ulm', 'Heilbronn', 'Pforzheim', 'Göttingen', 'Recklinghausen',
  'Bottrop', 'Remscheid', 'Bremerhaven', 'Oberhausen', 'Hagen', 'Hamm',
  'Mülheim', 'Krefeld', 'Leverkusen', 'Solingen', 'Herne', 'Neuss',
]

function extractCityFromHtml(snippet: string): { city: string; plz?: string } {
  // Kleinanzeigen shows location as "PLZ Stadtname" in various elements
  const plzCity = snippet.match(/(\d{5})\s+([A-ZÄÖÜa-zäöüß][A-ZÄÖÜa-zäöüß\s\-]{2,30})/)
  if (plzCity) return { plz: plzCity[1], city: plzCity[2].trim() }

  // Location without PLZ: look for city-like text in location elements
  const locationEl = snippet.match(/(?:aditem-main--top--left|locality|location)[^>]*>([^<]{3,40})</)
  if (locationEl) {
    const raw = locationEl[1].trim()
    const plzOnly = raw.match(/^(\d{5})\s+(.+)/)
    if (plzOnly) return { plz: plzOnly[1], city: plzOnly[2].trim() }
    if (raw.length > 2 && !/\d{4,}/.test(raw)) return { city: raw }
  }

  return { city: 'Unbekannt' }
}

function extractCityFromText(text: string): string | undefined {
  const lower = text.toLowerCase()
  // Match against known city list (longest match wins to avoid "Hamburg" matching before "Hamburg-Mitte")
  for (const city of GERMAN_CITIES) {
    const re = new RegExp(`\\b${city.toLowerCase()}\\b`)
    if (re.test(lower)) return city
  }
  return undefined
}

function extractCityFromUrl(url: string): string | undefined {
  // Kleinanzeigen slugs: /s-anzeige/kleingarten-in-berlin-mitte/1234...
  // Split slug parts and test each against city list
  const slug = url.split('/').find(p => p.includes('-') && !/^\d+$/.test(p)) ?? ''
  const parts = slug.split('-')
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i, i + 2).join(' ')
    const city = extractCityFromText(candidate) ?? extractCityFromText(parts[i])
    if (city) return city
  }
  return undefined
}

function buildAdidLocationMap(html: string): Map<string, { city: string; plz?: string }> {
  // Build a map of adid → {city, plz} by scanning each article card in the HTML.
  // Each card has data-adid="..." and somewhere nearby a "PLZ Stadtname" text.
  const map = new Map<string, { city: string; plz?: string }>()
  const cardPattern = /data-adid="(\d+)"([\s\S]{0,2000}?)(?=data-adid="|$)/g
  let m: RegExpExecArray | null
  while ((m = cardPattern.exec(html)) !== null) {
    const adid = m[1]
    const snippet = m[2]
    // Prefer explicit PLZ + city
    const plzCity = snippet.match(/(\d{5})\s+([A-ZÄÖÜa-zäöüß][A-ZÄÖÜa-zäöüß\s\-]{1,25})(?:<|\s*[,·])/)
    if (plzCity) {
      map.set(adid, { plz: plzCity[1], city: plzCity[2].trim() })
      continue
    }
    // Fallback: look for PLZ anywhere in snippet
    const plzOnly = snippet.match(/(\d{5})/)
    if (plzOnly) {
      map.set(adid, { plz: plzOnly[1], city: 'Unbekannt' })
    }
  }
  return map
}

function parseListings(html: string, forcedCity?: string): ParsedListing[] {
  const listings: ParsedListing[] = []

  // Pre-build location map from HTML cards so we have city data for every ad
  const locationMap = buildAdidLocationMap(html)

  // Parse JSON-LD for title/price/date (most reliable structured data)
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])
      const items = json['@type'] === 'ItemList' ? json.itemListElement : [json]
      for (const item of items) {
        const el = item.item ?? item
        if (!el?.name || !el?.url) continue
        const idMatch = String(el.url).match(/\/(\d+)\.html/)
        if (!idMatch) continue
        const adid = idMatch[1]
        const price = el.offers?.price ? parseInt(String(el.offers.price).replace(/\D/g, '')) : undefined
        const title = String(el.name).trim()

        const loc = locationMap.get(adid)
        const plz = el.address?.postalCode ?? loc?.plz
        const city = forcedCity
          ?? el.address?.addressLocality
          ?? (loc?.city !== 'Unbekannt' ? loc?.city : undefined)
          ?? (plz ? cityFromPlz(plz) : undefined)
          ?? extractCityFromText(title)
          ?? 'Unbekannt'

        listings.push({
          external_id: adid,
          title,
          price_abloese: price && price > 0 ? price : undefined,
          city,
          plz,
          contact_url: `https://www.kleinanzeigen.de/s-anzeige/${adid}.html`,
          posted_at: el.datePosted ?? new Date().toISOString(),
        })
      }
    } catch { /* skip */ }
  }

  if (listings.length > 0) return listings

  // Fallback: parse article[data-adid] elements directly
  const articleMatches = [...html.matchAll(/data-adid="(\d+)"[\s\S]*?<a[^>]+href="(\/s-anzeige\/[^"]+)"[\s\S]*?class="[^"]*text-module-begin[^"]*"[^>]*>([\s\S]*?)<\/a>/g)]
  for (const m of articleMatches) {
    const title = m[3].replace(/<[^>]+>/g, '').trim()
    if (!title) continue

    const loc = locationMap.get(m[1])
    const city = forcedCity
      ?? (loc?.city !== 'Unbekannt' ? loc?.city : undefined)
      ?? (loc?.plz ? cityFromPlz(loc.plz) : undefined)
      ?? extractCityFromText(title)
      ?? 'Unbekannt'
    const snippet = html.slice(m.index ?? 0, (m.index ?? 0) + 1200)
    const priceMatch = snippet.match(/(\d[\d.]*)\s*€/)
    const price = priceMatch ? parseInt(priceMatch[1].replace('.', '')) : undefined

    listings.push({
      external_id: m[1],
      title,
      price_abloese: price && price > 0 && price < 100000 ? price : undefined,
      city,
      plz: loc?.plz,
      contact_url: `https://www.kleinanzeigen.de${m[2]}`,
      posted_at: new Date().toISOString(),
    })
  }

  return listings
}

function extractSizeFromTitle(title: string): number | undefined {
  const m = title.match(/(\d{2,4})\s*m²/i)
  return m ? parseInt(m[1]) : undefined
}

async function upsertListing(l: ParsedListing): Promise<boolean> {
  const { error } = await supabase.from('listings').upsert({
    source: 'kleinanzeigen',
    external_id: l.external_id,
    title: l.title.substring(0, 300),
    price_abloese: l.price_abloese,
    size_sqm: l.size_sqm ?? extractSizeFromTitle(l.title),
    city: l.city,
    plz: l.plz,
    contact_url: l.contact_url,
    posted_at: l.posted_at,
    scraped_at: new Date().toISOString(),
    active: true,
  }, { onConflict: 'source,external_id' })

  if (error) { console.error('Upsert error:', error.message); return false }
  return true
}

async function deactivateStale(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('listings')
    .update({ active: false })
    .eq('source', 'kleinanzeigen')
    .lt('scraped_at', cutoff)
  if (!error) console.log('Stale listings deactivated')
}

async function main() {
  console.log('🔍 Kleinanzeigen Scraper gestartet —', new Date().toLocaleString('de-DE'))

  let total = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}/seite:${page}`
    console.log(`Seite ${page}/${MAX_PAGES}: ${url}`)

    const html = await fetchPage(url)
    if (!html) { console.log('Keine Antwort, stoppe.'); break }

    const listings = parseListings(html)
    console.log(`  → ${listings.length} Inserate gefunden`)

    if (listings.length === 0) { console.log('Keine Inserate, stoppe.'); break }

    for (const listing of listings) {
      await upsertListing(listing)
      total++
    }

    await delay(DELAY_MS)
  }

  await deactivateStale()
  console.log(`\n✅ Fertig. ${total} Inserate verarbeitet.`)
}

main().catch(console.error)
