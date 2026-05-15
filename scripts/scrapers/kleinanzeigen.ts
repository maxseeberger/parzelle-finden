/**
 * Kleinanzeigen Scraper — Strategy: deeplinks only (ToS-safe)
 *
 * We do NOT copy listing content. Instead we:
 * 1. Fetch the Kleinanzeigen category page for Kleingarten
 * 2. Extract listing IDs, titles, prices, and sizes from structured data / meta
 * 3. Store a deeplink back to Kleinanzeigen — user clicks through to contact seller
 * 4. Run daily via cron
 *
 * This approach is ToS-compatible: we're an index, not a mirror.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role for server scripts
const BASE_URL = 'https://www.kleinanzeigen.de/s-grundstuecke-garten/kleingarten/k0c207'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ScrapedListing {
  external_id: string
  title: string
  price_abloese?: number
  size_sqm?: number
  city: string
  plz?: string
  contact_url: string
  posted_at: string
}

async function fetchListingsPage(pageUrl: string): Promise<ScrapedListing[]> {
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; parzelle-finden.de aggregator; +https://parzelle-finden.de)',
      'Accept-Language': 'de-DE,de;q=0.9',
    },
  })

  if (!response.ok) {
    console.error(`Failed to fetch ${pageUrl}: ${response.status}`)
    return []
  }

  const html = await response.text()

  // Parse listing cards from HTML
  // Kleinanzeigen uses article[data-adid] elements
  const listings: ScrapedListing[] = []
  const adPattern = /data-adid="(\d+)"[\s\S]*?class="[^"]*ellipsis[^"]*"[^>]*>([^<]+)<[\s\S]*?(?:(\d+)\s*€)?[\s\S]*?(\d{5})\s+([A-ZÄÖÜa-zäöüß\s]+)/g

  // Simpler approach: extract JSON-LD structured data if present
  const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const json = JSON.parse(match.replace(/<script[^>]*>|<\/script>/g, ''))
        if (json['@type'] === 'ItemList' && json.itemListElement) {
          for (const item of json.itemListElement) {
            const el = item.item || item
            if (el.name && el.url) {
              const idMatch = el.url.match(/\/(\d+)\.html/)
              if (idMatch) {
                listings.push({
                  external_id: idMatch[1],
                  title: el.name,
                  price_abloese: el.offers?.price ? parseInt(el.offers.price) : undefined,
                  city: el.address?.addressLocality || 'Unbekannt',
                  plz: el.address?.postalCode,
                  contact_url: `https://www.kleinanzeigen.de${el.url.startsWith('/') ? '' : '/'}${el.url}`,
                  posted_at: el.datePosted || new Date().toISOString(),
                })
              }
            }
          }
        }
      } catch {
        // Skip malformed JSON-LD
      }
    }
  }

  // Fallback: extract from article elements using regex (brittle but functional)
  if (listings.length === 0) {
    const articlePattern = /data-adid="(\d+)"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<[\s\S]*?(?:(\d[\d.]*)\s*€[\s\S]*?)?(\d{5})\s+([A-Za-zÄÖÜäöüß\s\-]+?)(?:<|\n)/g
    let m: RegExpExecArray | null
    while ((m = articlePattern.exec(html)) !== null) {
      listings.push({
        external_id: m[1],
        title: m[3].trim(),
        price_abloese: m[4] ? parseInt(m[4].replace('.', '')) : undefined,
        city: m[6].trim(),
        plz: m[5],
        contact_url: `https://www.kleinanzeigen.de${m[2]}`,
        posted_at: new Date().toISOString(),
      })
    }
  }

  return listings
}

async function extractSizeFromTitle(title: string): Promise<number | undefined> {
  const match = title.match(/(\d+)\s*m²/i)
  return match ? parseInt(match[1]) : undefined
}

async function upsertListing(listing: ScrapedListing): Promise<void> {
  const size_sqm = listing.size_sqm ?? (await extractSizeFromTitle(listing.title))

  const { error } = await supabase.from('listings').upsert({
    source: 'kleinanzeigen',
    external_id: listing.external_id,
    title: listing.title,
    price_abloese: listing.price_abloese,
    size_sqm,
    city: listing.city,
    plz: listing.plz,
    contact_url: listing.contact_url,
    posted_at: listing.posted_at,
    scraped_at: new Date().toISOString(),
    active: true,
  }, { onConflict: 'source,external_id' })

  if (error) console.error('Upsert error:', error.message)
}

async function deactivateStaleListings(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('listings')
    .update({ active: false })
    .eq('source', 'kleinanzeigen')
    .lt('scraped_at', thirtyDaysAgo)

  if (error) console.error('Deactivation error:', error.message)
  else console.log('Deactivated stale listings older than 30 days')
}

export async function runKleinanzeigenScraper(): Promise<void> {
  console.log('Starting Kleinanzeigen scraper…')
  let page = 1
  let totalScraped = 0

  while (page <= 10) { // max 10 pages = ~500 listings per run
    const url = page === 1 ? BASE_URL : `${BASE_URL}/seite:${page}`
    console.log(`Scraping page ${page}: ${url}`)

    const listings = await fetchListingsPage(url)
    if (listings.length === 0) {
      console.log(`No listings found on page ${page}, stopping.`)
      break
    }

    for (const listing of listings) {
      await upsertListing(listing)
      totalScraped++
    }

    // Polite rate limiting — 2 seconds between pages
    await new Promise(r => setTimeout(r, 2000))
    page++
  }

  await deactivateStaleListings()
  console.log(`Scraper complete. Processed ${totalScraped} listings.`)
}

// Run directly: npx ts-node scripts/scrapers/kleinanzeigen.ts
if (require.main === module) {
  runKleinanzeigenScraper().catch(console.error)
}
