/**
 * Quoka Scraper — Schrebergärten / Kleingarten category
 *
 * Deeplink strategy (ToS-safe): stores title, price, city + link back.
 * URL: https://www.quoka.de/anzeigen/immobilienmarkt/immobilien/schrebergaerten-wochenendhaeuser/
 * Pagination: ?pag=N
 * Runs daily via GitHub Actions alongside Kleinanzeigen scraper.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = 'https://www.quoka.de/anzeigen/immobilienmarkt/immobilien/schrebergaerten-wochenendhaeuser/'
const MAX_PAGES = 10
const DELAY_MS = 2000

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
        'Referer': 'https://www.quoka.de/',
      },
    })
    if (!res.ok) { console.log(`HTTP ${res.status} for ${url}`); return null }
    return await res.text()
  } catch (e) {
    console.log(`Fetch failed: ${e}`)
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

function parseQuokaListings(html: string): ParsedListing[] {
  const listings: ParsedListing[] = []

  // Quoka listing cards: <article class="..."> with data-adid or href pattern
  // Try JSON-LD first
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])
      const items = json['@type'] === 'ItemList' ? json.itemListElement : [json]
      for (const item of items) {
        const el = item.item ?? item
        if (!el?.name || !el?.url) continue
        const idMatch = String(el.url).match(/\/(\d+)\.html/) ?? String(el.url).match(/quoka\.de\/.*?-(\d+)/)
        if (!idMatch) continue
        const price = el.offers?.price ? parseInt(String(el.offers.price).replace(/\D/g, '')) : undefined
        listings.push({
          external_id: `quoka_${idMatch[1]}`,
          title: String(el.name).trim(),
          price_abloese: price && price > 0 && price < 50000 ? price : undefined,
          city: el.address?.addressLocality ?? 'Unbekannt',
          plz: el.address?.postalCode,
          contact_url: String(el.url),
        })
      }
    } catch { /* skip */ }
  }

  if (listings.length > 0) return listings

  // Fallback: try both absolute and relative quoka listing URLs
  const absLinks = [...html.matchAll(/href="(https?:\/\/www\.quoka\.de\/[^"]+\.html)"/g)]
  const relLinks = [...html.matchAll(/href="(\/(?:de_detail[^"]+|p-[^"]+)\.html)"/g)]
    .map(m => ({ ...m, 1: `https://www.quoka.de${m[1]}` }) as RegExpExecArray)
  const allLinks = [...absLinks, ...relLinks]

  // Collect title candidates from any heading/span with title-like class names
  const titleCandidates = [...html.matchAll(/<(?:h[1-4]|span|strong|a)[^>]*class="[^"]*(?:title|headline|name|subject|ad-title)[^"]*"[^>]*>([^<]{5,150})<\//g)]
    .map(m => m[1].trim())

  for (let i = 0; i < allLinks.length; i++) {
    const url = allLinks[i][1]
    const idMatch = url.match(/[~_-](\d{6,})/) ?? url.match(/adId~(\d+)/) ?? url.match(/-(\d+)\.html$/)
    if (!idMatch) continue

    const title = titleCandidates[i]?.trim() ?? 'Kleingarten Angebot'
    const idx = allLinks[i].index ?? 0
    const snippet = html.slice(Math.max(0, idx - 300), idx + 600)
    const plzCity = snippet.match(/(\d{5})\s+([A-ZÄÖÜa-zäöüß][a-zäöüß\s\-]{2,25})/)
    const priceMatch = snippet.match(/(\d[\d.,]+)\s*(?:€|EUR)/)
    const price = priceMatch ? parseInt(priceMatch[1].replace(/[.,]/g, '')) : undefined

    listings.push({
      external_id: `quoka_${idMatch[1]}`,
      title,
      price_abloese: price && price > 0 && price < 50000 ? price : undefined,
      city: plzCity?.[2]?.trim() ?? 'Unbekannt',
      plz: plzCity?.[1],
      contact_url: url,
    })
  }

  return listings
}

function extractSizeFromTitle(title: string): number | undefined {
  const m = title.match(/(\d{2,4})\s*m²/i)
  return m ? parseInt(m[1]) : undefined
}

const KLEINGARTEN_KEYWORDS = [
  'kleingarten', 'schrebergarten', 'parzelle', 'laube', 'kgv', 'gartenverein',
  'gartenanlage', 'zu verpachten', 'zu pachten', 'gartenparzelle',
  'freizeitgrundstück', 'wochenendgrundstück', 'datsche',
  'gartenkolonie', 'gartenlaube', 'erholungsgarten', 'freizeitgarten',
  'nachpächter', 'laubengrundstück', 'pachtgarten',
]

const NEGATIVE_KEYWORDS = [
  'kindergarten', 'gartenservice', 'gartenpflege', 'gartenbau',
  'gartenmöbel', 'gartengeräte', 'caravan', 'wohnwagen', 'campingplatz', 'stellplatz',
]

function isKleingarten(title: string): boolean {
  const lower = title.toLowerCase()
  if (NEGATIVE_KEYWORDS.some(kw => lower.includes(kw))) return false
  return KLEINGARTEN_KEYWORDS.some(kw => lower.includes(kw))
}

async function upsertListing(l: ParsedListing): Promise<void> {
  const { error } = await supabase.from('listings').upsert({
    source: 'quoka',
    external_id: l.external_id,
    title: l.title.substring(0, 300),
    price_abloese: l.price_abloese,
    size_sqm: l.size_sqm ?? extractSizeFromTitle(l.title),
    city: l.city,
    plz: l.plz,
    contact_url: l.contact_url,
    posted_at: new Date().toISOString(),
    scraped_at: new Date().toISOString(),
    active: true,
  }, { onConflict: 'source,external_id' })
  if (error) console.error('Upsert error:', error.message)
}

async function deactivateStale(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('listings').update({ active: false })
    .eq('source', 'quoka').lt('scraped_at', cutoff)
}

async function main() {
  console.log('🌿 Quoka Scraper gestartet —', new Date().toLocaleString('de-DE'))
  let total = 0

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}?pag=${page}`
    console.log(`Seite ${page}: ${url}`)

    const html = await fetchPage(url)
    if (!html) { console.log('Keine Antwort, stoppe.'); break }

    const listings = parseQuokaListings(html)
    console.log(`  → ${listings.length} Einträge gefunden`)

    if (listings.length === 0) { console.log('Leer, stoppe.'); break }

    for (const l of listings) {
      if (!isKleingarten(l.title)) continue
      await upsertListing(l)
      total++
    }

    await delay(DELAY_MS)
  }

  await deactivateStale()
  console.log(`\n✅ Fertig. ${total} Quoka-Inserate verarbeitet.`)
}

main().catch(console.error)
