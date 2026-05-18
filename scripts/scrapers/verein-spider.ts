/**
 * Verein Website Spider v2 — deep sub-page crawl
 *
 * For every Verein that has a website URL we:
 *   1. Fetch the homepage
 *   2. Score all internal links by URL path + anchor text (waitlist-relevant keywords)
 *   3. Fetch the top-4 highest-scoring sub-pages
 *   4. Analyse ALL pages combined for:
 *        - warteliste_status  (offen / geschlossen)
 *        - warteliste_url     — the specific page where you can actually register / see free plots
 *        - email / phone      — if not already in DB
 *        - parzellen_anzahl   — how many plots the association has
 *        - warteliste_laenge  — how many people are on the waiting list
 *        - jahresbeitrag      — annual membership / allotment fee
 *   5. Upsert only the fields we found (never overwrite existing data with null)
 *
 * Run weekly via GitHub Actions.
 * Processes ALL vereine with websites — no artificial cap.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FETCH_TIMEOUT_MS       = 7000
const DELAY_BETWEEN_PAGES_MS = 400   // between sub-pages of the same site
const MAX_SUBPAGES           = 3     // per Verein (homepage + 3 sub-pages)
const CONCURRENCY            = 8     // process N Vereine simultaneously (all different domains — safe)
const BATCH_SIZE             = 50    // log progress every N vereine

// ── Keywords that score a sub-page as worth crawling ──────────────────────────

const SUBPAGE_KEYWORDS = [
  'parzell', 'warteliste', 'aufnahme', 'mitglied', 'frei',
  'anmeld', 'bewerb', 'beitritt', 'vakant', 'verfügbar',
  'anfrage', 'neuaufnahme', 'gartenangebot', 'gartenangebote',
  'warte', 'interessent', 'bewerbung', 'kontakt', 'verein',
]

// ── Status detection keywords ──────────────────────────────────────────────────

const OPEN_KEYWORDS = [
  // Explicit open signals
  'warteliste offen', 'warteliste ist offen', 'aufnahme möglich',
  'aufnahme ist möglich', 'aufnahmen möglich', 'wir nehmen auf',
  'wir nehmen neue mitglieder', 'neue mitglieder aufgenommen',
  'bewerben sie sich', 'jetzt bewerben', 'mitglied werden',
  'mitgliedschaft beantragen', 'aufnahmeantrag',
  // Free plots
  'parzelle frei', 'freie parzelle', 'freie parzellen',
  'parzellen verfügbar', 'parzellen frei', 'garten abzugeben',
  'garten frei', 'garten zu vergeben', 'garten wird abgegeben',
  'zu verpachten', 'zu vergeben', 'nachpächter gesucht',
  'nachpächterin gesucht', 'pächter gesucht', 'pächterin gesucht',
  'ist frei', 'steht frei', 'aktuell frei', 'stehen zur verfügung',
  'steht zur verfügung', 'ist verfügbar', 'sind verfügbar',
  // Registration
  'bewerbungen', 'anmeldung möglich', 'anmeldungen möglich',
  'interesse? melden', 'interesse melden', 'melden sie sich',
  'formular ausfüllen', 'anfrage stellen', 'anfrage senden',
]

const CLOSED_KEYWORDS = [
  'warteliste geschlossen', 'warteliste ist geschlossen',
  'warteliste voll', 'warteliste ist voll',
  'keine aufnahme', 'kein aufnahme', 'warteliste gesperrt',
  'zur zeit keine aufnahme', 'derzeit keine aufnahme',
  'momentan keine aufnahme', 'zurzeit keine aufnahme',
  'aufnahmestopp', 'aufnahme gestoppt', 'aufnahme eingestellt',
  'keine freien parzellen', 'keine parzellen frei',
  'keine freie parzelle', 'keine freien gärten',
  'leider keine freien', 'keine aufnahmemöglichkeit',
  'keine aufnahme möglich',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchSafe(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; parzelle-finden.de/spider; +https://parzelle-finden.de)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    })
    clearTimeout(tid)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/** Strip HTML tags and decode common entities for plain-text analysis */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö')
    .replace(/&Uuml;/g, 'Ü').replace(/&szlig;/g, 'ß')
    .replace(/\s{2,}/g, ' ').trim()
}

/** Extract all unique internal links from a page, with anchor text */
function extractInternalLinks(
  html: string,
  pageUrl: string,
): Array<{ url: string; anchor: string }> {
  let origin: string
  try {
    origin = new URL(pageUrl).origin
  } catch {
    return []
  }

  const seen = new Set<string>()
  const links: Array<{ url: string; anchor: string }> = []

  // Match href="..." with up to 200 chars of following text as anchor
  const re = /href="([^"#?]{1,300})"[^>]*>([^<]{0,120})/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    const anchor = stripHtml(m[2]).trim()

    let resolved: string
    try {
      resolved = raw.startsWith('http') ? raw : new URL(raw, pageUrl).href
    } catch {
      continue
    }

    // Internal only — same origin
    try {
      if (new URL(resolved).origin !== origin) continue
    } catch {
      continue
    }

    // Skip obvious non-content
    if (/\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|xml|zip|docx?|xlsx?)$/i.test(resolved)) continue
    if (/mailto:|tel:|javascript:/i.test(resolved)) continue

    const clean = resolved.split('?')[0].replace(/\/$/, '')
    if (seen.has(clean)) continue
    seen.add(clean)

    links.push({ url: resolved, anchor })
  }

  return links
}

/** Score a link: higher = more likely to contain waitlist / free-plot info */
function scoreLink(url: string, anchor: string): number {
  const combined = (url + ' ' + anchor).toLowerCase()
  return SUBPAGE_KEYWORDS.reduce((n, kw) => n + (combined.includes(kw) ? 1 : 0), 0)
}

// ── Data extraction ────────────────────────────────────────────────────────────

function detectStatus(text: string): 'offen' | 'geschlossen' | null {
  const lower = text.toLowerCase()
  if (OPEN_KEYWORDS.some(k => lower.includes(k))) return 'offen'
  if (CLOSED_KEYWORDS.some(k => lower.includes(k))) return 'geschlossen'
  return null
}

function extractEmail(text: string): string | null {
  // Obfuscated patterns first: "name [at] domain [dot] de"
  const deobfuscated = text
    .replace(/\s*\[at\]\s*/gi, '@')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[dot\]\s*/gi, '.')
    .replace(/\s*\(dot\)\s*/gi, '.')

  const m = deobfuscated.match(
    /\b([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/
  )
  if (!m) return null
  const e = m[1].toLowerCase()
  // Filter out obvious false positives
  if (e.includes('example') || e.includes('mustermann') || e.endsWith('.png') || e.endsWith('.jpg')) return null
  return e
}

function extractPhone(text: string): string | null {
  // German numbers: 030 12345678, +49 30 12345678, 0171 12345678, etc.
  const m = text.match(
    /(?:\+49|0049)[\s\-]?(?:\(0\))?[\s\-]?(\d[\d\s\-\/]{4,16}\d)|(?<!\d)(0\d{2,5})[\s\-\/](\d{3,10}(?:[\s\-\/]\d{2,6})?)/
  )
  if (!m) return null
  return m[0].replace(/\s{2,}/g, ' ').trim().substring(0, 30)
}

function extractParzellenAnzahl(text: string): number | null {
  const patterns = [
    /\b(?:ca\.?\s*)?(\d{1,4})\s*(?:Kleingarten-?)?Parzell(?:en)?\b/i,
    /\b(\d{1,4})\s*(?:Kleingärten|Einzelgärten|Lauben(?:gärten)?)\b/i,
    /\b(?:ca\.?\s*)?(\d{1,4})\s*Garten(?:parzellen|anlagen)?\b/i,
    /\bunterteilt in\s*(\d{1,4})\b/i,
    /\bbestehen(?:d)? aus\s*(\d{1,4})\s*(?:Parzellen|Gärten)\b/i,
    /\bGemeinschaft\s+(?:von\s+)?(\d{1,4})\s*(?:Parzellen|Kleingärten)\b/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 5 && n <= 3000) return n
    }
  }
  return null
}

function extractWartelisteLaenge(text: string): number | null {
  const patterns = [
    /Warteliste[^.]{0,100}?(\d{1,4})\s*(?:Personen|Familien|Bewerber(?:innen)?|Interessenten?|Namen|Einträge)/i,
    /(\d{1,4})\s*(?:Personen|Familien|Bewerber(?:innen)?|Interessenten?)[^.]{0,60}?(?:Warteliste|warten|stehen)/i,
    /Warteliste\s+(?:von\s+)?(\d{1,4})\s*(?:Personen|Familien)?\b/i,
    /(?:aktuell|derzeit|momentan)\s+(\d{1,4})\s*(?:Personen|Familien)[^.]{0,50}?(?:warten|Warteliste)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 1 && n <= 10000) return n
    }
  }
  return null
}

function extractJahresbeitrag(text: string): number | null {
  const patterns = [
    /(?:Jahresbeitrag|Mitgliedsbeitrag|Jahrespacht|Pachtgebühr|Grundpacht|Grundbeitrag)[^.€\n]{0,80}?(\d{2,4}(?:[,\.]\d{1,2})?)\s*€/i,
    /€\s*(\d{2,4}(?:[,\.]\d{1,2})?)\s*(?:im Jahr|pro Jahr|jährlich|p\.a\.|\/Jahr)/i,
    /(\d{2,4}(?:[,\.]\d{1,2})?)\s*€\s*(?:im Jahr|pro Jahr|jährlich|p\.a\.)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const amount = parseFloat(m[1].replace(',', '.'))
      if (amount >= 30 && amount <= 10000) return Math.round(amount)
    }
  }
  return null
}

// ── Main per-Verein logic ──────────────────────────────────────────────────────

interface PageResult {
  url: string
  text: string   // stripped plain text
  html: string
}

async function spiderVerein(vereinId: string, siteUrl: string): Promise<void> {
  // 1. Fetch homepage
  const homeHtml = await fetchSafe(siteUrl)
  if (!homeHtml) return

  const pages: PageResult[] = [{ url: siteUrl, html: homeHtml, text: stripHtml(homeHtml) }]

  // 2. Find + score internal links
  const links = extractInternalLinks(homeHtml, siteUrl)
  const scored = links
    .map(l => ({ ...l, score: scoreLink(l.url, l.anchor) }))
    .filter(l => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUBPAGES)

  // 3. Fetch sub-pages
  for (const link of scored) {
    await delay(DELAY_BETWEEN_PAGES_MS)
    const html = await fetchSafe(link.url)
    if (html) pages.push({ url: link.url, html, text: stripHtml(html) })
  }

  // 4. Analyse all pages
  const allText = pages.map(p => p.text).join('\n\n')

  const status = detectStatus(allText)

  // warteliste_url: prefer the sub-page that triggered 'offen', else highest-scoring sub-page
  let warteliste_url: string | null = null
  for (const p of pages) {
    if (detectStatus(p.text) === 'offen') {
      warteliste_url = p.url
      break
    }
  }
  if (!warteliste_url && scored.length > 0) {
    // Store the highest-scoring sub-page as the best bet for the user to follow
    const topPage = pages.find(p => p.url === scored[0].url)
    if (topPage) warteliste_url = topPage.url
  }

  const email          = extractEmail(allText)
  const phone          = extractPhone(allText)
  const parzellen      = extractParzellenAnzahl(allText)
  const warteLaenge    = extractWartelisteLaenge(allText)
  const beitrag        = extractJahresbeitrag(allText)

  // 5. Build update payload — only include fields we actually found
  //    Supabase upsert will overwrite existing values; we use a partial update instead
  //    so we never clear data that was already there.
  const updates: Record<string, unknown> = { last_updated: new Date().toISOString() }
  if (status)       updates.warteliste_status  = status
  if (warteliste_url) updates.warteliste_url   = warteliste_url
  if (email)        updates.email              = email
  if (phone)        updates.phone              = phone
  if (parzellen)    updates.parzellen_anzahl   = parzellen
  if (warteLaenge)  updates.warteliste_laenge  = warteLaenge
  if (beitrag)      updates.jahresbeitrag      = beitrag

  if (Object.keys(updates).length <= 1) return // nothing new found (only last_updated)

  const { error } = await supabase
    .from('vereine')
    .update(updates)
    .eq('id', vereinId)

  if (error) console.error(`  ✗ Update error for ${vereinId}:`, error.message)
}

// ── Concurrency pool ───────────────────────────────────────────────────────────

/** Run `fn` over every item with at most `limit` in-flight at once */
async function withConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0
  const worker = async () => {
    while (idx < items.length) {
      const item = items[idx++]
      await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

// ── Entry point ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🕷️  Verein Spider v2 gestartet —', new Date().toLocaleString('de-DE'))
  console.log(`   Concurrency: ${CONCURRENCY} | Max sub-pages: ${MAX_SUBPAGES} | Timeout: ${FETCH_TIMEOUT_MS}ms`)

  // Load ALL vereine that have a website — in pages to avoid memory issues
  const PAGE_SIZE = 500
  let from = 0
  let allVereine: Array<{ id: string; name: string; website: string }> = []

  while (true) {
    const { data, error } = await supabase
      .from('vereine')
      .select('id, name, website')
      .not('website', 'is', null)
      .neq('website', '')
      .range(from, from + PAGE_SIZE - 1)

    if (error) { console.error('DB error:', error.message); break }
    if (!data || data.length === 0) break
    allVereine = allVereine.concat(data)
    from += PAGE_SIZE
    if (data.length < PAGE_SIZE) break
  }

  console.log(`\n📋 ${allVereine.length} Vereine mit Website — starte Crawl…\n`)

  // Shared counters (concurrent updates — JS is single-threaded so this is safe)
  let processedTotal = 0
  let foundStatus = 0, foundEmail = 0, foundPhone = 0
  let foundParzellen = 0, foundWarteliste = 0, foundUrl = 0

  const processVerein = async (v: { id: string; name: string; website: string }) => {
    processedTotal++
    if (processedTotal % BATCH_SIZE === 0) {
      console.log(`  → ${processedTotal}/${allVereine.length} | Status: ${foundStatus} | URL: ${foundUrl} | Email: ${foundEmail} | Tel: ${foundPhone} | Parzellen: ${foundParzellen} | Warteliste: ${foundWarteliste}`)
    }

    // Normalise URL
    let url = v.website.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    try { new URL(url) } catch { return }

    // Fetch homepage
    const homeHtml = await fetchSafe(url)
    if (!homeHtml) return

    const pages: PageResult[] = [{ url, html: homeHtml, text: stripHtml(homeHtml) }]

    // Find + score + fetch sub-pages
    const links = extractInternalLinks(homeHtml, url)
    const scored = links
      .map(l => ({ ...l, score: scoreLink(l.url, l.anchor) }))
      .filter(l => l.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUBPAGES)

    for (const link of scored) {
      await delay(DELAY_BETWEEN_PAGES_MS)
      const html = await fetchSafe(link.url)
      if (html) pages.push({ url: link.url, html, text: stripHtml(html) })
    }

    const allText = pages.map(p => p.text).join('\n\n')

    // Extract everything
    const status       = detectStatus(allText)
    const email        = extractEmail(allText)
    const phone        = extractPhone(allText)
    const parzellen    = extractParzellenAnzahl(allText)
    const warteLaenge  = extractWartelisteLaenge(allText)
    const beitrag      = extractJahresbeitrag(allText)

    // warteliste_url: the specific page where 'offen' was found, else the top-scored sub-page
    let warteliste_url: string | null = null
    for (const p of pages) {
      if (detectStatus(p.text) === 'offen') { warteliste_url = p.url; break }
    }
    if (!warteliste_url && scored.length > 0) {
      const topPage = pages.find(p => p.url === scored[0].url)
      if (topPage) warteliste_url = topPage.url
    }

    // Build update payload — only include fields we actually found
    const updates: Record<string, unknown> = { last_updated: new Date().toISOString() }
    const found = { status: false, url: false, email: false, phone: false, parzellen: false, warteliste: false }
    if (status)         { updates.warteliste_status = status;         found.status     = true }
    if (warteliste_url) { updates.warteliste_url    = warteliste_url; found.url        = true }
    if (email)          { updates.email             = email;          found.email      = true }
    if (phone)          { updates.phone             = phone;          found.phone      = true }
    if (parzellen)      { updates.parzellen_anzahl  = parzellen;      found.parzellen  = true }
    if (warteLaenge)    { updates.warteliste_laenge = warteLaenge;    found.warteliste = true }
    if (beitrag)        { updates.jahresbeitrag     = beitrag }

    if (Object.keys(updates).length <= 1) return // nothing new found

    const { error: updateErr } = await supabase
      .from('vereine').update(updates).eq('id', v.id)

    if (updateErr) {
      console.error(`  ✗ ${v.name}:`, updateErr.message)
    } else {
      const flags = [
        found.status     && `status:${status}`,
        found.url        && `url:✓`,
        found.email      && `email:✓`,
        found.phone      && `tel:✓`,
        found.parzellen  && `parzellen:${parzellen}`,
        found.warteliste && `warteliste:${warteLaenge}`,
      ].filter(Boolean).join(' ')
      if (flags) console.log(`  ✓ ${v.name} — ${flags}`)

      if (found.status)     foundStatus++
      if (found.url)        foundUrl++
      if (found.email)      foundEmail++
      if (found.phone)      foundPhone++
      if (found.parzellen)  foundParzellen++
      if (found.warteliste) foundWarteliste++
    }
  }

  await withConcurrency(allVereine, CONCURRENCY, processVerein)

  console.log(`\n✅ Spider fertig — ${processedTotal} Vereine gecrawlt`)
  console.log(`   Status gefunden:     ${foundStatus}`)
  console.log(`   Warteliste-URL:      ${foundUrl}`)
  console.log(`   E-Mail gefunden:     ${foundEmail}`)
  console.log(`   Telefon gefunden:    ${foundPhone}`)
  console.log(`   Parzellenzahl:       ${foundParzellen}`)
  console.log(`   Wartelistenlänge:    ${foundWarteliste}`)
}

main().catch(e => { console.error(e); process.exit(1) })
