/**
 * Immowelt Scraper — Freizeitgrundstücke & Kleingärten
 *
 * Scrapes Immowelt listing pages for Kleingarten / Freizeitgrundstück offers.
 * Covers all 16 German states.
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

// ── Search URLs ────────────────────────────────────────────────────────────────
// Two search types per state:
//   1. /kaufen/grundstueck/freizeitgrundstueck/  — "Freizeitgrundstück" category (main Kleingarten bucket)
//   2. /kaufen/grundstueck/                      — general land, searched with ?q=kleingarten in title
// All 16 German federal states.

const SEARCH_URLS: string[] = [
  // ── Freizeitgrundstück by state (all 16) ──────────────────────────────────
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/berlin',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/hamburg',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/bremen',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/schleswig-holstein',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/mecklenburg-vorpommern',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/niedersachsen',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/nordrhein-westfalen',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/hessen',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/rheinland-pfalz',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/saarland',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/thueringen',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/sachsen',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/sachsen-anhalt',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/brandenburg',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/bavaria',
  'https://www.immowelt.de/suche/kaufen/grundstueck/freizeitgrundstueck/baden-wuerttemberg',

  // ── Same states with the old filter code (belt-and-suspenders) ────────────
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

// ── Keyword filtering ─────────────────────────────────────────────────────────

const KLEINGARTEN_KEYWORDS = [
  'kleingarten', 'schrebergarten', 'datsche', 'parzelle', 'gartenanlage',
  'gartenkolonie', 'freizeitgrundstück', 'wochenendgrundstück', 'erholungsgarten',
  'laube', 'gartenlaube', 'gartenverein', 'nachpächter', 'gartenparzelle',
  'laubengrundstück', 'freizeitgarten', 'wochenendsiedlung',
]

const NEGATIVE_KEYWORDS = [
  'gartenhaus', 'holzhütte', 'blockhütte', 'geräteschuppen', 'gerätehaus',
  'holzhaus', 'blockhaus', 'satteldach', 'pultdach', 'bausatz',
  'kindergarten', 'gartenservice', 'gartenpflege',
  ' mm ', 'x300', 'x400', 'x200',
]

function isRelevant(title: string): boolean {
  const lower = title.toLowerCase()
  if (NEGATIVE_KEYWORDS.some(k => lower.includes(k))) return false
  return KLEINGARTEN_KEYWORDS.some(k => lower.includes(k))
}

// ── City lookup ───────────────────────────────────────────────────────────────

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
  '99': 'Erfurt', '07': 'Gera', '18': 'Rostock', '19': 'Schwerin',
  '24': 'Kiel', '23': 'Lübeck', '66': 'Saarbrücken', '55': 'Mainz',
  '67': 'Kaiserslautern', '56': 'Koblenz',
}

function cityFromPlz(plz: string): string | undefined {
  return PLZ_TO_CITY[plz.substring(0, 3)] ?? PLZ_TO_CITY[plz.substring(0, 2)]
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

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

// ── Parsing ───────────────────────────────────────────────────────────────────

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

  // 1. Parse JSON-LD (Immowelt uses schema.org ItemList or Product)
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

  // 2. Try embedded __NEXT_DATA__ / window.__state__ JSON
  const nextMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1])
      const ads: unknown[] = []
      const tryPath = (obj: unknown, ...keys: string[]) => {
        let cur: unknown = obj
        for (const k of keys) {
          if (!cur || typeof cur !== 'object') return
          cur = (cur as Record<string, unknown>)[k]
        }
        if (Array.isArray(cur)) ads.push(...cur)
      }
      tryPath(data, 'props', 'pageProps', 'searchResult', 'results')
      tryPath(data, 'props', 'pageProps', 'listings')

      for (const ad of ads) {
        if (!ad || typeof ad !== 'object') continue
        const a = ad as Record<string, unknown>
        const id = String(a.globalObjectKey ?? a.id ?? '').replace(/\D/g, '')
        const title = String(a.title ?? a.name ?? '').trim()
        if (!id || !title || !isRelevant(title)) continue

        const priceObj = a.purchasePrice ?? a.price
        const price = typeof priceObj === 'number' ? priceObj
          : typeof priceObj === 'object' && priceObj
            ? parseInt(String((priceObj as Record<string, unknown>).value ?? 0))
            : undefined

        const addrObj = a.address ?? a.location
        const plz = typeof addrObj === 'object' && addrObj
          ? String((addrObj as Record<string, unknown>).zipCode ?? (addrObj as Record<string, unknown>).postalCode ?? '')
          : ''
        const cityName = typeof addrObj === 'object' && addrObj
          ? String((addrObj as Record<string, unknown>).city ?? (addrObj as Record<string, unknown>).addressLocality ?? '')
          : ''

        listings.push({
          external_id: `immowelt_${id}`,
          title,
          price_abloese: price && price > 0 ? price : undefined,
          city: cityName || (plz ? cityFromPlz(plz) : undefined) || 'Unbekannt',
          plz: plz || undefined,
          contact_url: `https://www.immowelt.de/expose/${id}`,
        })
      }
    } catch { /* skip */ }
  }

  if (listings.length > 0) return listings

  // 3. Fallback: scan for expose links in HTML
  const exposeMatches = [
    ...html.matchAll(/href="((?:https?:\/\/www\.immowelt\.de)?\/expose\/([a-z0-9]+)[^"]*)"[^>]*>([^<]{5,100})/gi),
  ]
  for (const m of exposeMatches) {
    const title = m[3].trim()
    if (!isRelevant(title)) continue

    const snippet = html.slice(Math.max(0, (m.index ?? 0) - 400), (m.index ?? 0) + 800)
    const plzCity = snippet.match(/(\d{5})\s+([A-ZÄÖÜa-zäöüß][A-ZÄÖÜa-zäöüß\s\-]{2,25})/)
    const priceMatch = snippet.match(/(\d[\d.,]+)\s*[€$]/)
    const price = priceMatch ? parseInt(priceMatch[1].replace(/[.,]/g, '')) : undefined

    listings.push({
      external_id: `immowelt_${m[2]}`,
      title,
      price_abloese: price && price > 0 ? price : undefined,
      city: plzCity?.[2]?.trim() ?? 'Unbekannt',
      plz: plzCity?.[1],
      contact_url: m[1].startsWith('http') ? m[1] : `https://www.immowelt.de${m[1]}`,
    })
  }

  return listings
}

// ── DB upsert ─────────────────────────────────────────────────────────────────

async function upsertListings(listings: ParsedListing[]): Promise<number> {
  let saved = 0
  for (const l of listings) {
    const { error } = await supabase.from('listings').upsert({
      source: 'immowelt',   // enum value added by migration 20260519_spider_improvements.sql
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
    }, { onConflict: 'source,external_id' })
    if (!error) saved++
    else if (!error.message?.includes('duplicate')) {
      console.error('Upsert error:', error.message)
    }
  }
  return saved
}

async function deactivateStale(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('listings').update({ active: false })
    .eq('source', 'immowelt').lt('scraped_at', cutoff)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏡 Immowelt Scraper gestartet —', new Date().toLocaleString('de-DE'))
  const seenIds = new Set<string>()
  let total = 0

  for (const url of SEARCH_URLS) {
    console.log(`\nFetching: ${url}`)
    const html = await fetchPage(url)
    if (!html) { await delay(DELAY_MS); continue }

    const raw = parseImmoweltListings(html)
    // Deduplicate across search URL runs
    const listings = raw.filter(l => !seenIds.has(l.external_id))
    listings.forEach(l => seenIds.add(l.external_id))

    console.log(`  Found ${raw.length} (${listings.length} new)`)

    if (listings.length > 0) {
      const saved = await upsertListings(listings)
      console.log(`  Saved ${saved}`)
      total += saved
    }

    await delay(DELAY_MS)
  }

  await deactivateStale()
  console.log(`\n✅ Immowelt Scraper fertig — ${total} Inserate gespeichert`)
}

main().catch(e => { console.error(e); process.exit(1) })
