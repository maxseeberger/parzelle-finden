/**
 * BKD Scraper — Bundesverband der Kleingartenvereine Deutschlands
 *
 * Strategy: crawl the BKD Landesverbände hierarchy + gartenverein.de search
 * to build the most comprehensive Vereins database possible.
 *
 * Sources:
 * 1. kleingarten-bund.de — official federation, all Landesverbände
 * 2. gartenverein.de/suchmaschine — independent directory with city search
 * 3. Individual Landesverband websites (Berlin, Hamburg, Bayern, NRW, etc.)
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DELAY_MS = 1500
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 12000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; parzelle-finden.de/1.0; +https://parzelle-finden.de)',
        'Accept-Language': 'de-DE,de;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractText(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function extractLinks(html: string, base: string, pattern: RegExp): string[] {
  const links: string[] = []
  let m: RegExpExecArray | null
  const linkPattern = /href="([^"]+)"/g
  while ((m = linkPattern.exec(html)) !== null) {
    const href = m[1]
    if (pattern.test(href)) {
      const full = href.startsWith('http') ? href : `${base}${href.startsWith('/') ? '' : '/'}${href}`
      if (!links.includes(full)) links.push(full)
    }
  }
  return links
}

// --- Bundesland mapping ---
const BUNDESLAND_BY_KEYWORD: Record<string, string> = {
  'berlin': 'Berlin', 'hamburg': 'Hamburg', 'bremen': 'Bremen',
  'sachsen-anhalt': 'Sachsen-Anhalt', 'sachsen': 'Sachsen',
  'thüringen': 'Thüringen', 'thueringen': 'Thüringen',
  'brandenburg': 'Brandenburg', 'mecklenburg': 'Mecklenburg-Vorpommern',
  'niedersachsen': 'Niedersachsen', 'nordrhein': 'Nordrhein-Westfalen',
  'nrw': 'Nordrhein-Westfalen', 'hessen': 'Hessen', 'rheinland': 'Rheinland-Pfalz',
  'saarland': 'Saarland', 'bayern': 'Bayern', 'bavaria': 'Bayern',
  'württemberg': 'Baden-Württemberg', 'badenwuerttemberg': 'Baden-Württemberg',
  'schleswig': 'Schleswig-Holstein',
}

function guessBundesland(text: string): string {
  const lower = text.toLowerCase()
  for (const [key, val] of Object.entries(BUNDESLAND_BY_KEYWORD)) {
    if (lower.includes(key)) return val
  }
  return 'Deutschland'
}

// --- Source 1: BKD Landesverbände ---
async function scrapeBkdLandesverbaende(): Promise<void> {
  console.log('\n=== BKD Landesverbände ===')
  const rootHtml = await fetchHtml('https://www.kleingarten-bund.de/der-verband/landesverbaende/')
  if (!rootHtml) { console.log('BKD root unreachable'); return }

  const lvLinks = extractLinks(rootHtml, 'https://www.kleingarten-bund.de', /landesverbaende\/[a-z]/)
  console.log(`Found ${lvLinks.length} Landesverbände links`)

  for (const lvUrl of lvLinks) {
    const lvHtml = await fetchHtml(lvUrl)
    if (!lvHtml) continue
    const bundesland = guessBundesland(lvUrl + lvHtml.slice(0, 500))

    // Extract Kreisverband and Verein links from each Landesverband page
    const vereinLinks = extractLinks(lvHtml, 'https://www.kleingarten-bund.de', /verein|kgv|kleingart/)
    for (const vUrl of vereinLinks.slice(0, 50)) {
      await scrapeVereinPage(vUrl, bundesland)
      await delay(DELAY_MS)
    }
    await delay(DELAY_MS)
  }
}

// --- Source 2: gartenverein.de city search ---
const MAJOR_CITIES = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
  'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg',
  'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Karlsruhe',
  'Mannheim', 'Augsburg', 'Wiesbaden', 'Mönchengladbach', 'Gelsenkirchen', 'Aachen',
  'Braunschweig', 'Kiel', 'Chemnitz', 'Halle', 'Magdeburg', 'Freiburg', 'Erfurt',
  'Rostock', 'Kassel', 'Mainz', 'Saarbrücken', 'Potsdam', 'Lübeck',
]

async function scrapeGartenvereinDe(): Promise<void> {
  console.log('\n=== gartenverein.de city search ===')

  for (const city of MAJOR_CITIES) {
    const url = `https://www.gartenverein.de/suchmaschine/?city=${encodeURIComponent(city)}`
    const html = await fetchHtml(url)
    if (!html) { await delay(DELAY_MS); continue }

    // Extract Verein entries from search results
    const bundesland = await guessBundeslandByCity(city)
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []

    for (const row of rows) {
      const nameMatch = row.match(/<td[^>]*>([^<]{5,80})<\/td>/)
      const plzMatch = row.match(/(\d{5})/)
      const cityMatch = row.match(/\d{5}\s+([A-Za-zÄÖÜäöüß\s\-]+)/)
      const websiteMatch = row.match(/href="(https?:\/\/[^"]+)"/)

      if (nameMatch && nameMatch[1].toLowerCase().includes('garten')) {
        await upsertVerein({
          name: nameMatch[1].trim(),
          city: cityMatch?.[1]?.trim() ?? city,
          plz: plzMatch?.[1],
          bundesland,
          website: websiteMatch?.[1],
        })
      }
    }

    console.log(`  ${city}: processed`)
    await delay(DELAY_MS)
  }
}

// --- Source 3: individual Landesverband websites ---
const LANDESVERBÄNDE_DIRECT = [
  { url: 'https://www.gartenfreunde-berlin.de/kleingaerten/vereinssuche/', bundesland: 'Berlin' },
  { url: 'https://www.gartenfreunde-hh.de/vereine/', bundesland: 'Hamburg' },
  { url: 'https://www.kleingaertner-nrw.de/verbände/', bundesland: 'Nordrhein-Westfalen' },
  { url: 'https://www.kleingarten-bw.de/verbände/', bundesland: 'Baden-Württemberg' },
  { url: 'https://www.kleingaertner-nuernberg.de/vereine/', bundesland: 'Bayern' },
]

async function scrapeLandesverbändeDirect(): Promise<void> {
  console.log('\n=== Direkte Landesverbände ===')
  for (const lv of LANDESVERBÄNDE_DIRECT) {
    const html = await fetchHtml(lv.url)
    if (!html) { await delay(DELAY_MS); continue }

    // Extract club names, addresses from list pages
    const namePattern = /<(?:h[23]|td|li)[^>]*>([^<]*(?:KGV|Gartenverein|Kleingartenverein|Gartenfreunde)[^<]*)<\/(?:h[23]|td|li)>/gi
    let m: RegExpExecArray | null
    while ((m = namePattern.exec(html)) !== null) {
      const name = m[1].trim()
      if (name.length > 5 && name.length < 100) {
        await upsertVerein({ name, city: 'Unbekannt', bundesland: lv.bundesland })
      }
    }

    console.log(`  ${lv.bundesland}: processed`)
    await delay(DELAY_MS)
  }
}

async function scrapeVereinPage(url: string, bundesland: string): Promise<void> {
  const html = await fetchHtml(url)
  if (!html) return

  const name = extractText(html, 'h1') || extractText(html, 'h2')
  if (!name || name.length < 5) return

  const plzCityMatch = html.match(/(\d{5})\s+([A-Za-zÄÖÜäöüß\s\-]+)/)
  const emailMatch = html.match(/href="mailto:([^"]+)"/)
  const phoneMatch = html.match(/(?:Tel|Telefon)[.:]\s*([\d\s\+\-\/\(\)]{7,20})/)
  const websiteMatch = html.match(/href="(https?:\/\/(?!kleingarten-bund)[^"]+)"/)

  await upsertVerein({
    name,
    city: plzCityMatch?.[2]?.trim() ?? 'Unbekannt',
    plz: plzCityMatch?.[1],
    bundesland,
    email: emailMatch?.[1],
    phone: phoneMatch?.[1]?.trim(),
    website: websiteMatch?.[1],
  })
}

async function guessBundeslandByCity(city: string): Promise<string> {
  const map: Record<string, string> = {
    'Berlin': 'Berlin', 'Hamburg': 'Hamburg', 'Bremen': 'Bremen',
    'München': 'Bayern', 'Nürnberg': 'Bayern', 'Augsburg': 'Bayern',
    'Köln': 'Nordrhein-Westfalen', 'Düsseldorf': 'Nordrhein-Westfalen',
    'Dortmund': 'Nordrhein-Westfalen', 'Essen': 'Nordrhein-Westfalen',
    'Duisburg': 'Nordrhein-Westfalen', 'Bochum': 'Nordrhein-Westfalen',
    'Bielefeld': 'Nordrhein-Westfalen', 'Münster': 'Nordrhein-Westfalen',
    'Gelsenkirchen': 'Nordrhein-Westfalen', 'Aachen': 'Nordrhein-Westfalen',
    'Mönchengladbach': 'Nordrhein-Westfalen', 'Wuppertal': 'Nordrhein-Westfalen',
    'Frankfurt': 'Hessen', 'Wiesbaden': 'Hessen', 'Kassel': 'Hessen',
    'Stuttgart': 'Baden-Württemberg', 'Karlsruhe': 'Baden-Württemberg',
    'Mannheim': 'Baden-Württemberg', 'Freiburg': 'Baden-Württemberg',
    'Leipzig': 'Sachsen', 'Dresden': 'Sachsen', 'Chemnitz': 'Sachsen',
    'Hannover': 'Niedersachsen', 'Braunschweig': 'Niedersachsen',
    'Magdeburg': 'Sachsen-Anhalt', 'Halle': 'Sachsen-Anhalt',
    'Erfurt': 'Thüringen', 'Rostock': 'Mecklenburg-Vorpommern',
    'Kiel': 'Schleswig-Holstein', 'Lübeck': 'Schleswig-Holstein',
    'Potsdam': 'Brandenburg', 'Saarbrücken': 'Saarland', 'Mainz': 'Rheinland-Pfalz',
    'Bonn': 'Nordrhein-Westfalen',
  }
  return map[city] ?? 'Deutschland'
}

interface VereinData {
  name: string
  city: string
  plz?: string
  bundesland: string
  address?: string
  website?: string
  phone?: string
  email?: string
}

let upsertCount = 0

async function upsertVerein(v: VereinData): Promise<void> {
  if (!v.name || v.name.length < 4) return

  const { error } = await supabase.from('vereine').upsert({
    name: v.name.substring(0, 200),
    city: v.city,
    plz: v.plz,
    bundesland: v.bundesland,
    address: v.address,
    website: v.website,
    phone: v.phone,
    email: v.email,
    warteliste_status: 'unbekannt',
    last_updated: new Date().toISOString(),
  }, { onConflict: 'name,city', ignoreDuplicates: true })

  if (!error) {
    upsertCount++
    if (upsertCount % 50 === 0) console.log(`  → ${upsertCount} Vereine eingefügt`)
  }
}

async function main() {
  console.log('🌱 BKD Scraper gestartet —', new Date().toLocaleString('de-DE'))

  await scrapeBkdLandesverbaende()
  await scrapeGartenvereinDe()
  await scrapeLandesverbändeDirect()

  console.log(`\n✅ Fertig. ${upsertCount} Vereine in Supabase gespeichert.`)
}

main().catch(console.error)
