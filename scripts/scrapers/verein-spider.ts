/**
 * Verein Website Spider — scans individual Verein websites for "freie Parzellen"
 *
 * Reads all Vereine from DB that have a website URL.
 * Visits each site, looks for pages containing availability keywords.
 * Updates warteliste_status if signals are found.
 * Run weekly.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const OPEN_KEYWORDS = [
  'warteliste offen', 'aufnahme möglich', 'wir nehmen auf',
  'bewerben sie sich', 'jetzt bewerben', 'mitglied werden',
  'parzelle frei', 'freie parzelle', 'parzellen verfügbar',
  'garten abzugeben', 'garten frei',
]

const CLOSED_KEYWORDS = [
  'warteliste geschlossen', 'warteliste voll', 'keine aufnahme',
  'kein aufnahme', 'warteliste gesperrt', 'zur zeit keine',
  'derzeit keine aufnahme', 'aufnahmestopp',
]

function detectWartelisteStatus(html: string): 'offen' | 'geschlossen' | null {
  const lower = html.toLowerCase()
  for (const kw of OPEN_KEYWORDS) {
    if (lower.includes(kw)) return 'offen'
  }
  for (const kw of CLOSED_KEYWORDS) {
    if (lower.includes(kw)) return 'geschlossen'
  }
  return null
}

async function fetchSafe(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; parzelle-finden.de; +https://parzelle-finden.de)',
      },
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

export async function runVereinSpider(): Promise<void> {
  console.log('Starting Verein spider…')

  const { data: vereine, error } = await supabase
    .from('vereine')
    .select('id, name, website')
    .not('website', 'is', null)
    .limit(100)

  if (error || !vereine) {
    console.error('Failed to fetch vereine:', error)
    return
  }

  console.log(`Spidering ${vereine.length} Verein websites…`)
  let updated = 0

  for (const verein of vereine) {
    const html = await fetchSafe(verein.website)
    if (!html) continue

    const status = detectWartelisteStatus(html)
    if (status) {
      const { error: updateError } = await supabase
        .from('vereine')
        .update({ warteliste_status: status, last_updated: new Date().toISOString() })
        .eq('id', verein.id)

      if (!updateError) {
        console.log(`${verein.name}: ${status}`)
        updated++
      }
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`Spider complete. Updated ${updated} Vereine.`)
}

if (require.main === module) {
  runVereinSpider().catch(console.error)
}
