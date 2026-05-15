/**
 * BKD Scraper — Bundesverband der Kleingartenvereine Deutschlands
 * Source: kleingarten-bund.de
 *
 * Scrapes the national federation's directory of Landesverbände → Kreisverbände → Vereine
 * This is the seed database for the Vereins directory.
 * Run weekly (data changes rarely).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BKD_BASE = 'https://www.kleingarten-bund.de'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ScrapedVerein {
  name: string
  address?: string
  city: string
  plz?: string
  bundesland: string
  website?: string
  phone?: string
  email?: string
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; parzelle-finden.de; +https://parzelle-finden.de)',
      'Accept-Language': 'de-DE',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

function extractVereinLinks(html: string): string[] {
  const links: string[] = []
  const pattern = /href="(\/[^"]*(?:verein|verband|kgv)[^"]*)"[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = pattern.exec(html)) !== null) {
    const url = m[1].startsWith('http') ? m[1] : `${BKD_BASE}${m[1]}`
    if (!links.includes(url)) links.push(url)
  }
  return links
}

function parseVereinFromHtml(html: string, sourceUrl: string): ScrapedVerein | null {
  // Extract structured contact data from typical Vereins page
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
  if (!nameMatch) return null

  const name = nameMatch[1].trim()

  // PLZ + city pattern common in German addresses
  const addressMatch = html.match(/(\d{5})\s+([A-Za-zÄÖÜäöüß\s\-]+)/)
  const plz = addressMatch?.[1]
  const city = addressMatch?.[2]?.trim() || 'Unbekannt'

  // Bundesland from URL or page content
  const bundeslandPatterns: Record<string, string> = {
    'berlin': 'Berlin', 'hamburg': 'Hamburg', 'bayern': 'Bayern',
    'sachsen': 'Sachsen', 'nrw': 'Nordrhein-Westfalen', 'hessen': 'Hessen',
    'niedersachsen': 'Niedersachsen', 'bw': 'Baden-Württemberg',
    'thueringen': 'Thüringen', 'sachsen-anhalt': 'Sachsen-Anhalt',
    'mecklenburg': 'Mecklenburg-Vorpommern', 'saarland': 'Saarland',
    'rheinland': 'Rheinland-Pfalz', 'bremen': 'Bremen', 'brandenburg': 'Brandenburg',
  }
  let bundesland = 'Deutschland'
  for (const [key, value] of Object.entries(bundeslandPatterns)) {
    if (sourceUrl.toLowerCase().includes(key) || html.toLowerCase().includes(key)) {
      bundesland = value
      break
    }
  }

  // Contact info
  const emailMatch = html.match(/href="mailto:([^"]+)"/)
  const phoneMatch = html.match(/(?:Tel|Telefon)[^:]*:\s*([\d\s\+\-\/\(\)]+)/)
  const websiteMatch = html.match(/href="(https?:\/\/(?!kleingarten-bund)[^"]+)"/)

  return {
    name,
    city,
    plz,
    bundesland,
    email: emailMatch?.[1],
    phone: phoneMatch?.[1]?.trim(),
    website: websiteMatch?.[1],
  }
}

async function upsertVerein(verein: ScrapedVerein): Promise<void> {
  const { error } = await supabase.from('vereine').upsert({
    name: verein.name,
    address: verein.address,
    city: verein.city,
    plz: verein.plz,
    bundesland: verein.bundesland,
    website: verein.website,
    phone: verein.phone,
    email: verein.email,
    warteliste_status: 'unbekannt',
    last_updated: new Date().toISOString(),
  }, { onConflict: 'name,city' })

  if (error) console.error(`Failed to upsert ${verein.name}:`, error.message)
}

export async function runBkdScraper(): Promise<void> {
  console.log('Starting BKD scraper…')

  let html: string
  try {
    html = await fetchPage(`${BKD_BASE}/der-verband/landesverbaende/`)
  } catch (e) {
    console.error('Failed to fetch BKD root:', e)
    return
  }

  const vereinLinks = extractVereinLinks(html)
  console.log(`Found ${vereinLinks.length} potential Verein links`)

  let processed = 0
  for (const link of vereinLinks.slice(0, 200)) { // cap at 200 per run
    try {
      const vereinHtml = await fetchPage(link)
      const verein = parseVereinFromHtml(vereinHtml, link)
      if (verein) {
        await upsertVerein(verein)
        processed++
      }
    } catch (e) {
      console.error(`Error processing ${link}:`, e)
    }
    // Polite delay
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log(`BKD scraper complete. Processed ${processed} Vereine.`)
}

if (require.main === module) {
  runBkdScraper().catch(console.error)
}
