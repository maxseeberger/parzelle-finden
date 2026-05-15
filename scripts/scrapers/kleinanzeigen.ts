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
const MAX_PAGES = 15
const DELAY_MS = 2500

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

function parseListings(html: string): ParsedListing[] {
  const listings: ParsedListing[] = []

  // Try JSON-LD first (most reliable for title/url/price)
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
        const price = el.offers?.price ? parseInt(String(el.offers.price).replace(/\D/g, '')) : undefined
        const title = String(el.name).trim()

        // JSON-LD on list pages rarely has address — extract from URL slug or title
        const city = el.address?.addressLocality
          ?? extractCityFromUrl(String(el.url))
          ?? extractCityFromText(title)
          ?? 'Unbekannt'

        listings.push({
          external_id: idMatch[1],
          title,
          price_abloese: price && price > 0 ? price : undefined,
          city,
          plz: el.address?.postalCode,
          contact_url: `https://www.kleinanzeigen.de/s-anzeige/${idMatch[1]}.html`,
          posted_at: el.datePosted ?? new Date().toISOString(),
        })
      }
    } catch { /* skip */ }
  }

  if (listings.length > 0) return listings

  // Fallback: parse article[data-adid] elements
  const articleMatches = [...html.matchAll(/data-adid="(\d+)"[\s\S]*?<a[^>]+href="(\/s-anzeige\/[^"]+)"[\s\S]*?class="[^"]*text-module-begin[^"]*"[^>]*>([\s\S]*?)<\/a>/g)]
  for (const m of articleMatches) {
    const title = m[3].replace(/<[^>]+>/g, '').trim()
    if (!title) continue

    const snippet = html.slice(m.index ?? 0, (m.index ?? 0) + 1200)
    const { city, plz } = extractCityFromHtml(snippet)
    const cityFinal = city !== 'Unbekannt' ? city : (extractCityFromUrl(`https://www.kleinanzeigen.de${m[2]}`) ?? extractCityFromText(title) ?? 'Unbekannt')
    const priceMatch = snippet.match(/(\d[\d.]*)\s*€/)
    const price = priceMatch ? parseInt(priceMatch[1].replace('.', '')) : undefined

    listings.push({
      external_id: m[1],
      title,
      price_abloese: price && price > 0 && price < 100000 ? price : undefined,
      city: cityFinal,
      plz,
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
