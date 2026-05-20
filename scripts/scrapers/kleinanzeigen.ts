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

// Multiple search URLs to maximise coverage across synonym terms
const SEARCH_URLS: Array<{ url: string; pages: number; city?: string }> = [
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/kleingarten/k0c207', pages: 20 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/schrebergarten/k0', pages: 10 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/datsche/k0', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/freizeitgrundstück/k0', pages: 10 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/wochenendgrundstück/k0', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/gartenparzelle/k0', pages: 5 },
  // ── State-level URLs (catch everything PLZ extraction misses) ──
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/bayern/kleingarten/k0c207l5510', pages: 10 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/bayern/schrebergarten/k0c207l5510', pages: 10 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/nordrhein-westfalen/kleingarten/k0c207l2444', pages: 10 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/niedersachsen/kleingarten/k0c207l2439', pages: 8 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/sachsen/kleingarten/k0c207l2443', pages: 8 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/brandenburg/kleingarten/k0c207l2429', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/thueringen/kleingarten/k0c207l2445', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/hessen/kleingarten/k0c207l2434', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/baden-wuerttemberg/kleingarten/k0c207l2427', pages: 5 },
  // ── City-specific URLs for major metros ──
  { url: 'https://www.kleinanzeigen.de/s-hamburg/kleingarten/k0c207l9409', pages: 5, city: 'Hamburg' },
  { url: 'https://www.kleinanzeigen.de/s-muenchen/kleingarten/k0c207l6314', pages: 5, city: 'München' },
  { url: 'https://www.kleinanzeigen.de/s-frankfurt-am-main/kleingarten/k0c207l39', pages: 5, city: 'Frankfurt' },
  { url: 'https://www.kleinanzeigen.de/s-koeln/kleingarten/k0c207l96', pages: 5, city: 'Köln' },
  { url: 'https://www.kleinanzeigen.de/s-stuttgart/kleingarten/k0c207l102', pages: 5, city: 'Stuttgart' },
  { url: 'https://www.kleinanzeigen.de/s-duesseldorf/kleingarten/k0c207l63', pages: 5, city: 'Düsseldorf' },
  { url: 'https://www.kleinanzeigen.de/s-berlin/kleingarten/k0c207l3331', pages: 8, city: 'Berlin' },
  { url: 'https://www.kleinanzeigen.de/s-dresden/kleingarten/k0c207l41', pages: 5, city: 'Dresden' },
  { url: 'https://www.kleinanzeigen.de/s-leipzig/kleingarten/k0c207l183', pages: 5, city: 'Leipzig' },
  // ── Missing states ──
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/mecklenburg-vorpommern/kleingarten/k0c207l2436', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/sachsen-anhalt/kleingarten/k0c207l2442', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/rheinland-pfalz/kleingarten/k0c207l2441', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/schleswig-holstein/kleingarten/k0c207l2458', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/saarland/kleingarten/k0c207l2447', pages: 3 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/bremen/kleingarten/k0c207l2430', pages: 3 },
  // ── Additional keywords (catch synonym listings national-wide) ──
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/nachpächter/k0', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/freizeitgarten/k0', pages: 5 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/erholungsgarten/k0', pages: 3 },
  { url: 'https://www.kleinanzeigen.de/s-grundstuecke-garten/wochenendparzelle/k0', pages: 3 },
]
const DELAY_MS = 2500

// PLZ prefix → city mapping (German postal codes, first 3 digits)
// 3-digit PLZ prefix → city. Covers all 80+ major German cities.
// cityFromPlz() tries 3-digit first, then 2-digit fallback for smaller towns.
const PLZ_TO_CITY: Record<string, string> = {
  // ─── Berlin (10xxx–14xxx) ───
  '100': 'Berlin', '101': 'Berlin', '102': 'Berlin', '103': 'Berlin', '104': 'Berlin',
  '105': 'Berlin', '106': 'Berlin', '107': 'Berlin', '108': 'Berlin', '109': 'Berlin',
  '110': 'Berlin', '111': 'Berlin', '112': 'Berlin', '113': 'Berlin', '114': 'Berlin',
  '115': 'Berlin', '116': 'Berlin', '117': 'Berlin', '118': 'Berlin', '119': 'Berlin',
  '120': 'Berlin', '121': 'Berlin', '122': 'Berlin', '123': 'Berlin', '124': 'Berlin',
  '125': 'Berlin', '126': 'Berlin', '127': 'Berlin', '128': 'Berlin', '129': 'Berlin',
  '130': 'Berlin', '131': 'Berlin', '132': 'Berlin', '133': 'Berlin', '134': 'Berlin',
  '135': 'Berlin', '136': 'Berlin', '137': 'Berlin', '138': 'Berlin', '139': 'Berlin',
  '140': 'Berlin', '141': 'Berlin', '142': 'Berlin', '143': 'Berlin',
  // ─── Potsdam (144–147) ───
  '144': 'Potsdam', '145': 'Potsdam', '146': 'Potsdam', '147': 'Potsdam',
  // ─── Brandenburg an der Havel ───
  '148': 'Brandenburg an der Havel', '149': 'Brandenburg an der Havel',
  // ─── Frankfurt (Oder) ───
  '150': 'Frankfurt (Oder)', '151': 'Frankfurt (Oder)', '152': 'Frankfurt (Oder)',
  // ─── Cottbus ───
  '030': 'Cottbus', '031': 'Cottbus', '032': 'Cottbus',
  // ─── Rostock (180–182) ───
  '180': 'Rostock', '181': 'Rostock', '182': 'Rostock',
  // ─── Stralsund ───
  '183': 'Stralsund', '184': 'Stralsund',
  // ─── Schwerin ───
  '190': 'Schwerin', '191': 'Schwerin', '192': 'Schwerin',
  // ─── Hamburg (200–229) ───
  '200': 'Hamburg', '201': 'Hamburg', '202': 'Hamburg', '203': 'Hamburg', '204': 'Hamburg',
  '205': 'Hamburg', '206': 'Hamburg', '207': 'Hamburg', '208': 'Hamburg', '209': 'Hamburg',
  '210': 'Hamburg', '211': 'Hamburg', '212': 'Hamburg', '213': 'Hamburg', '214': 'Hamburg',
  '215': 'Hamburg', '216': 'Hamburg', '217': 'Hamburg', '218': 'Hamburg', '219': 'Hamburg',
  '220': 'Hamburg', '221': 'Hamburg', '222': 'Hamburg', '223': 'Hamburg', '224': 'Hamburg',
  '225': 'Hamburg', '226': 'Hamburg', '227': 'Hamburg', '228': 'Hamburg', '229': 'Hamburg',
  // ─── Kiel (240–243) ───
  '240': 'Kiel', '241': 'Kiel', '242': 'Kiel', '243': 'Kiel',
  // ─── Lübeck (235–239) ───
  '235': 'Lübeck', '236': 'Lübeck', '237': 'Lübeck', '238': 'Lübeck', '239': 'Lübeck',
  // ─── Flensburg ───
  '249': 'Flensburg',
  // ─── Schwerin (erneut, 195–199 auch) ───
  '195': 'Schwerin', '196': 'Schwerin', '197': 'Schwerin', '198': 'Schwerin', '199': 'Schwerin',
  // ─── Bremen (280–285) ───
  '280': 'Bremen', '281': 'Bremen', '282': 'Bremen', '283': 'Bremen', '284': 'Bremen', '285': 'Bremen',
  // ─── Bremerhaven ───
  '275': 'Bremerhaven', '276': 'Bremerhaven', '277': 'Bremerhaven',
  // ─── Hannover (300–306) ───
  '300': 'Hannover', '301': 'Hannover', '302': 'Hannover', '303': 'Hannover', '304': 'Hannover',
  '305': 'Hannover', '306': 'Hannover',
  // ─── Wolfsburg ───
  '384': 'Wolfsburg', '385': 'Wolfsburg',
  // ─── Braunschweig (381–384) ───
  '381': 'Braunschweig', '382': 'Braunschweig', '383': 'Braunschweig',
  // ─── Göttingen ───
  '370': 'Göttingen', '371': 'Göttingen', '372': 'Göttingen',
  // ─── Osnabrück (490–492) ───
  '490': 'Osnabrück', '491': 'Osnabrück', '492': 'Osnabrück',
  // ─── Oldenburg (260–263) ───
  '260': 'Oldenburg', '261': 'Oldenburg', '262': 'Oldenburg', '263': 'Oldenburg',
  // ─── Bielefeld (336–337) ───
  '336': 'Bielefeld', '337': 'Bielefeld',
  // ─── Paderborn (330–331) ───
  '330': 'Paderborn', '331': 'Paderborn',
  // ─── Kassel (341–343) ───
  '341': 'Kassel', '342': 'Kassel', '343': 'Kassel',
  // ─── Magdeburg (390–393) ───
  '390': 'Magdeburg', '391': 'Magdeburg', '392': 'Magdeburg', '393': 'Magdeburg',
  // ─── Halle (060–062) ───
  '060': 'Halle', '061': 'Halle', '062': 'Halle',
  // ─── Leipzig (041–044) ───
  '041': 'Leipzig', '042': 'Leipzig', '043': 'Leipzig', '044': 'Leipzig',
  // ─── Dresden (010–014) ───
  '010': 'Dresden', '011': 'Dresden', '012': 'Dresden', '013': 'Dresden', '014': 'Dresden',
  // ─── Chemnitz (090–092) ───
  '090': 'Chemnitz', '091': 'Chemnitz', '092': 'Chemnitz',
  // ─── Zwickau ───
  '080': 'Zwickau', '081': 'Zwickau',
  // ─── Erfurt (990–992) ───
  '990': 'Erfurt', '991': 'Erfurt', '992': 'Erfurt',
  // ─── Jena ───
  '076': 'Jena', '077': 'Jena',
  // ─── Gera ───
  '074': 'Gera', '075': 'Gera',
  // ─── Weimar ───
  '994': 'Weimar', '995': 'Weimar',
  // ─── Düsseldorf (400–406) ───
  '400': 'Düsseldorf', '401': 'Düsseldorf', '402': 'Düsseldorf', '403': 'Düsseldorf',
  '404': 'Düsseldorf', '405': 'Düsseldorf', '406': 'Düsseldorf',
  // ─── Duisburg (470–478) ───
  '470': 'Duisburg', '471': 'Duisburg', '472': 'Duisburg', '473': 'Duisburg',
  '474': 'Duisburg', '475': 'Duisburg', '476': 'Duisburg',
  // ─── Essen (451–453) ───
  '451': 'Essen', '452': 'Essen', '453': 'Essen',
  // ─── Oberhausen ───
  '460': 'Oberhausen', '461': 'Oberhausen', '462': 'Oberhausen',
  // ─── Bochum (447–449) ───
  '447': 'Bochum', '448': 'Bochum', '449': 'Bochum',
  // ─── Dortmund (440–444) ───
  '440': 'Dortmund', '441': 'Dortmund', '442': 'Dortmund', '443': 'Dortmund', '444': 'Dortmund',
  // ─── Hagen ───
  '580': 'Hagen', '581': 'Hagen',
  // ─── Hamm ───
  '590': 'Hamm', '591': 'Hamm',
  // ─── Herne ───
  '445': 'Herne', '446': 'Herne',
  // ─── Gelsenkirchen ───
  '458': 'Gelsenkirchen', '459': 'Gelsenkirchen',
  // ─── Bottrop ───
  '464': 'Bottrop',
  // ─── Recklinghausen ───
  '456': 'Recklinghausen', '457': 'Recklinghausen',
  // ─── Münster (481–483) ───
  '481': 'Münster', '482': 'Münster', '483': 'Münster',
  // ─── Wuppertal (420–424) ───
  '420': 'Wuppertal', '421': 'Wuppertal', '422': 'Wuppertal', '423': 'Wuppertal', '424': 'Wuppertal',
  // ─── Krefeld ───
  '477': 'Krefeld', '478': 'Krefeld',
  // ─── Mönchengladbach ───
  '411': 'Mönchengladbach', '412': 'Mönchengladbach', '413': 'Mönchengladbach',
  // ─── Neuss ───
  '414': 'Neuss', '415': 'Neuss',
  // ─── Leverkusen ───
  '513': 'Leverkusen', '514': 'Leverkusen',
  // ─── Solingen ───
  '427': 'Solingen', '428': 'Solingen',
  // ─── Remscheid ───
  '425': 'Remscheid', '426': 'Remscheid',
  // ─── Köln (506–511) ───
  '506': 'Köln', '507': 'Köln', '508': 'Köln', '509': 'Köln', '510': 'Köln', '511': 'Köln',
  '512': 'Köln',
  // ─── Bonn (531–534) ───
  '531': 'Bonn', '532': 'Bonn', '533': 'Bonn', '534': 'Bonn',
  // ─── Aachen (520–524) ───
  '520': 'Aachen', '521': 'Aachen', '522': 'Aachen', '523': 'Aachen', '524': 'Aachen',
  // ─── Frankfurt am Main (600–609) ───
  '600': 'Frankfurt', '601': 'Frankfurt', '602': 'Frankfurt', '603': 'Frankfurt', '604': 'Frankfurt',
  '605': 'Frankfurt', '606': 'Frankfurt', '607': 'Frankfurt', '608': 'Frankfurt', '609': 'Frankfurt',
  // ─── Wiesbaden (650–651) ───
  '650': 'Wiesbaden', '651': 'Wiesbaden',
  // ─── Mainz (551–553) ───
  '551': 'Mainz', '552': 'Mainz', '553': 'Mainz',
  // ─── Darmstadt (641–643) ───
  '641': 'Darmstadt', '642': 'Darmstadt', '643': 'Darmstadt',
  // ─── Kassel (erneut 341-343) schon oben
  // ─── Heidelberg (691–693) ───
  '691': 'Heidelberg', '692': 'Heidelberg', '693': 'Heidelberg',
  // ─── Mannheim (681–683) ───
  '681': 'Mannheim', '682': 'Mannheim', '683': 'Mannheim',
  // ─── Karlsruhe (760–762) ───
  '760': 'Karlsruhe', '761': 'Karlsruhe', '762': 'Karlsruhe',
  // ─── Freiburg im Breisgau (790–793) ───
  '790': 'Freiburg', '791': 'Freiburg', '792': 'Freiburg', '793': 'Freiburg',
  // ─── Stuttgart (700–708) ───
  '700': 'Stuttgart', '701': 'Stuttgart', '702': 'Stuttgart', '703': 'Stuttgart', '704': 'Stuttgart',
  '705': 'Stuttgart', '706': 'Stuttgart', '707': 'Stuttgart', '708': 'Stuttgart',
  // ─── Ulm (890–891) ───
  '890': 'Ulm', '891': 'Ulm',
  // ─── Heilbronn (740–742) ───
  '740': 'Heilbronn', '741': 'Heilbronn', '742': 'Heilbronn',
  // ─── Pforzheim (751–753) ───
  '751': 'Pforzheim', '752': 'Pforzheim', '753': 'Pforzheim',
  // ─── Reutlingen ───
  '721': 'Reutlingen',
  // ─── Tübingen ───
  '720': 'Tübingen',
  // ─── München (800–818) ───
  '800': 'München', '801': 'München', '802': 'München', '803': 'München', '804': 'München',
  '805': 'München', '806': 'München', '807': 'München', '808': 'München', '809': 'München',
  '810': 'München', '811': 'München', '812': 'München', '813': 'München', '814': 'München',
  '815': 'München', '816': 'München', '817': 'München', '818': 'München',
  // ─── Augsburg (860–862) ───
  '860': 'Augsburg', '861': 'Augsburg', '862': 'Augsburg',
  // ─── Ingolstadt (850–851) ───
  '850': 'Ingolstadt', '851': 'Ingolstadt',
  // ─── Regensburg (930–934) ───
  '930': 'Regensburg', '931': 'Regensburg', '932': 'Regensburg', '933': 'Regensburg', '934': 'Regensburg',
  // ─── Würzburg (970–972) ───
  '970': 'Würzburg', '971': 'Würzburg', '972': 'Würzburg',
  // ─── Nürnberg (900–906) ───
  '900': 'Nürnberg', '901': 'Nürnberg', '902': 'Nürnberg', '903': 'Nürnberg', '904': 'Nürnberg',
  '905': 'Nürnberg', '906': 'Nürnberg',
  // ─── Erlangen ───
  '910': 'Erlangen', '911': 'Erlangen',
  // ─── Fürth ───
  '907': 'Fürth', '908': 'Fürth',
  // ─── Saarbrücken (660–663) ───
  '660': 'Saarbrücken', '661': 'Saarbrücken', '662': 'Saarbrücken', '663': 'Saarbrücken',
  // ─── Kaiserslautern (675–676) ───
  '675': 'Kaiserslautern', '676': 'Kaiserslautern',
  // ─── Trier ───
  '542': 'Trier', '543': 'Trier', '544': 'Trier',
  // ─── Koblenz ───
  '560': 'Koblenz', '561': 'Koblenz',
  // ─── Münster (481–483) already above
  // Note: Lüneburg (213xx) shares prefix with Hamburg; resolved via text parsing

  // ─── 2-digit fallback prefixes (less precise, for smaller towns) ───
  '01': 'Dresden',    // Sachsen Ost
  '02': 'Görlitz',
  '03': 'Cottbus',
  '04': 'Leipzig',
  '06': 'Halle',
  '07': 'Gera',
  '08': 'Zwickau',
  '09': 'Chemnitz',
  '17': 'Schwerin',
  '18': 'Rostock',
  '19': 'Schwerin',
  '26': 'Oldenburg',
  '27': 'Bremerhaven',
  '28': 'Bremen',
  '33': 'Paderborn',
  '37': 'Göttingen',
  '38': 'Braunschweig',
  '39': 'Magdeburg',
  '42': 'Wuppertal',
  '46': 'Oberhausen',
  '49': 'Osnabrück',
  '52': 'Aachen',
  '54': 'Trier',
  '56': 'Koblenz',
  '58': 'Hagen',
  '59': 'Hamm',
  '65': 'Wiesbaden',
  '67': 'Kaiserslautern',
  '69': 'Heidelberg',
  '72': 'Tübingen',
  '74': 'Heilbronn',
  '75': 'Pforzheim',
  '79': 'Freiburg',
  '85': 'Ingolstadt',
  '86': 'Augsburg',
  '89': 'Ulm',
  '93': 'Regensburg',
  '97': 'Würzburg',
  '99': 'Erfurt',
}

function cityFromPlz(plz: string): string | undefined {
  const prefix3 = plz.substring(0, 3)
  const prefix2 = plz.substring(0, 2)
  return PLZ_TO_CITY[prefix3] ?? PLZ_TO_CITY[prefix2]
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Parse a German-formatted price string into an integer (euros).
 * Handles: "3.500 €", "€ 3.500", "3500", "3.500,00 €", "3500 VB", etc.
 * Returns undefined for "Preis auf Anfrage", "VB" alone, or unparseable text.
 */
function parseGermanPrice(raw: unknown): number | undefined {
  if (typeof raw === 'number') return raw > 0 ? Math.round(raw) : undefined
  const text = String(raw ?? '').trim()
  if (!text) return undefined
  // Strip currency symbol, VB/VHB (Verhandlungsbasis), whitespace
  const stripped = text.replace(/€/g, '').replace(/\bVHB\b/i, '').replace(/\bVB\b/i, '').trim()
  if (!stripped || /anfrage|kostenlos/i.test(stripped)) return undefined
  // German: dots are thousands separators, comma is decimal → remove dots, replace comma
  const normalised = stripped.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  const val = parseFloat(normalised)
  return isNaN(val) || val <= 0 ? undefined : Math.round(val)
}

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
  const map = new Map<string, { city: string; plz?: string }>()
  const cardPattern = /data-adid="(\d+)"([\s\S]{0,2500}?)(?=data-adid="|$)/g
  let m: RegExpExecArray | null
  while ((m = cardPattern.exec(html)) !== null) {
    const adid = m[1]
    const snippet = m[2]

    // 1. Prefer explicit "PLZ Stadtname" pattern
    const plzCity = snippet.match(/(\d{5})\s+([A-ZÄÖÜa-zäöüß][A-ZÄÖÜa-zäöüß\s\-]{1,25})(?:<|\s*[,·])/)
    if (plzCity) {
      map.set(adid, { plz: plzCity[1], city: plzCity[2].trim() })
      continue
    }

    // 2. Location span / badge (Kleinanzeigen uses various class names)
    const locSpan = snippet.match(/(?:aditem-main--top--left|ad-listitem-detail-location|locality|adlocation)[^>]*?>([^<]{2,40})</)
    if (locSpan) {
      const raw = locSpan[1].trim()
      const withPlz = raw.match(/^(\d{5})\s+(.+)/)
      if (withPlz) { map.set(adid, { plz: withPlz[1], city: withPlz[2].trim() }); continue }
      if (!/^\d/.test(raw) && raw.length > 2) { map.set(adid, { city: raw }); continue }
    }

    // 3. PLZ anywhere → use PLZ map to derive city
    const plzOnly = snippet.match(/(\d{5})/)
    if (plzOnly) {
      const derived = cityFromPlz(plzOnly[1])
      map.set(adid, { plz: plzOnly[1], city: derived ?? 'Unbekannt' })
      continue
    }

    // 4. City name directly in snippet (scan against known list)
    const strippedSnippet = snippet.replace(/<[^>]+>/g, ' ')
    const cityFromText = extractCityFromText(strippedSnippet)
    if (cityFromText) {
      map.set(adid, { city: cityFromText })
    }
  }
  return map
}

/**
 * Attempt to extract listings from Next.js __NEXT_DATA__ JSON blob.
 * Kleinanzeigen embeds structured ad data here with clean city/PLZ fields.
 * Returns [] if the blob isn't present or doesn't match expected shape.
 */
function parseNextData(html: string, forcedCity?: string): ParsedListing[] {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return []

  let root: Record<string, unknown>
  try { root = JSON.parse(m[1]) } catch { return [] }

  // Navigate to ad list — Kleinanzeigen nests this differently across page types
  // Attempt common paths:
  const candidates: unknown[] = []
  const tryPath = (obj: unknown, ...keys: string[]) => {
    let cur: unknown = obj
    for (const k of keys) {
      if (!cur || typeof cur !== 'object') return
      cur = (cur as Record<string, unknown>)[k]
    }
    if (Array.isArray(cur)) candidates.push(...cur)
  }
  tryPath(root, 'props', 'pageProps', 'ads')
  tryPath(root, 'props', 'pageProps', 'srp', 'ads')
  tryPath(root, 'props', 'pageProps', 'adList')
  tryPath(root, 'props', 'pageProps', 'data', 'ads')

  const listings: ParsedListing[] = []

  for (const ad of candidates) {
    if (!ad || typeof ad !== 'object') continue
    const a = ad as Record<string, unknown>
    const adId = String(a.adId ?? a.id ?? '').replace(/\D/g, '')
    const title = String(a.title ?? a.name ?? '').trim()
    if (!adId || !title) continue

    // Price — try all known Kleinanzeigen field variants
    const priceObj = (typeof a.price === 'object' && a.price !== null)
      ? a.price as Record<string, unknown>
      : undefined
    const rawPrice = priceObj?.amount ?? priceObj?.value ?? priceObj?.priceAmount
      ?? a.priceAmount ?? a.priceLabel ?? a.priceText ?? (typeof a.price !== 'object' ? a.price : undefined)
    const price = parseGermanPrice(rawPrice)

    // Location — Kleinanzeigen uses locations[] array or address object
    let plz: string | undefined
    let city: string = forcedCity ?? 'Unbekannt'

    const locations = a.locations as Array<Record<string, unknown>> | undefined
    if (Array.isArray(locations) && locations.length > 0) {
      const loc = locations[0]
      plz = String(loc.zipCode ?? loc.postalCode ?? '').trim() || undefined
      const locName = String(loc.name ?? loc.city ?? '').trim()
      if (locName) city = forcedCity ?? locName
    } else if (a.address && typeof a.address === 'object') {
      const addr = a.address as Record<string, unknown>
      plz = String(addr.postalCode ?? addr.zipCode ?? '').trim() || undefined
      const locName = String(addr.addressLocality ?? addr.city ?? '').trim()
      if (locName) city = forcedCity ?? locName
    }

    // PLZ fallback → derive city from our lookup table
    if (plz && city === 'Unbekannt') {
      city = forcedCity ?? cityFromPlz(plz) ?? 'Unbekannt'
    }

    listings.push({
      external_id: adId,
      title,
      price_abloese: price && price > 0 ? price : undefined,
      city,
      plz,
      contact_url: `https://www.kleinanzeigen.de/s-anzeige/${adId}.html`,
      posted_at: String(a.postedAt ?? a.datePosted ?? a.createdAt ?? new Date().toISOString()),
    })
  }

  return listings
}

function parseListings(html: string, forcedCity?: string): ParsedListing[] {
  const listings: ParsedListing[] = []

  // 0. Try __NEXT_DATA__ JSON (best structured data, cleanest city/PLZ)
  const nextDataListings = parseNextData(html, forcedCity)
  if (nextDataListings.length > 0) return nextDataListings

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
        const rawOfferPrice = el.offers?.price ?? el.offers?.priceSpecification?.[0]?.price
        const price = parseGermanPrice(rawOfferPrice)
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
    // Match both "3.500 €" and "€ 3.500" (Kleinanzeigen uses both depending on card type)
    const priceMatch = snippet.match(/(?:€\s*([\d.,]+)|([\d.,]+)\s*€)/)
    const rawPrice = priceMatch?.[1] ?? priceMatch?.[2]
    const price = parseGermanPrice(rawPrice)

    listings.push({
      external_id: m[1],
      title,
      price_abloese: price && price < 100000 ? price : undefined,
      city,
      plz: loc?.plz,
      contact_url: `https://www.kleinanzeigen.de${m[2]}`,
      posted_at: new Date().toISOString(),
    })
  }

  return listings
}

const KLEINGARTEN_KEYWORDS = [
  'kleingarten', 'schrebergarten', 'gartenparzelle', 'kleingartenverein',
  'gartenverein', 'gartenanlage', 'nutzgarten', 'vereinsgarten',
  'kgv ', ' kgv', 'laube', 'parzelle',
  'zu verpachten', 'zu pachten', 'gartenpacht',
  'freizeitgrundstück', 'wochenendgrundstück', 'datsche',
  'gartenkolonie', 'gartenlaube', 'erholungsgarten', 'freizeitgarten',
  'nachpächter', 'laubengrundstück', 'pachtgarten',
]

// Titles containing these phrases are NOT garden listings despite matching positive keywords
const NEGATIVE_KEYWORDS = [
  // Services / products
  'kindergarten', 'gartenservice', 'gartenpflege', 'gartenbau',
  'gartenmöbel', 'gartengeräte', 'gartenwerkzeug',
  // Vehicles / camping
  'caravan', 'wohnwagen', 'wohnmobil', 'campingplatz', 'stellplatz',
  // Prefab shed/cabin products — the main spam vector
  'gartenhaus', 'holzhütte', 'blockhütte', 'holzhaus', 'blockhaus',
  'geräteschuppen', 'gerätehaus', 'unterstand', 'satteldach', 'pultdach',
  'iso-glas', 'bausatz', 'abholbereit',
  // Dimension patterns like "44 mm" or "500x400 cm" = product spec, not a garden
  ' mm ', 'x300 cm', 'x400 cm', 'x260 cm', 'x200 cm',
]

function isKleingartenListing(title: string): boolean {
  const lower = title.toLowerCase()
  if (NEGATIVE_KEYWORDS.some(kw => lower.includes(kw))) return false
  return KLEINGARTEN_KEYWORDS.some(kw => lower.includes(kw))
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
  const seenIds = new Set<string>() // dedup across search URLs
  let total = 0

  for (const entry of SEARCH_URLS) {
    const { url: baseUrl, pages: maxPages, city: entryCity } = entry
    console.log(`\n📋 Suche: ${baseUrl}`)
    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1 ? baseUrl : `${baseUrl}/seite:${page}`
      console.log(`  Seite ${page}/${maxPages}: ${url}`)

      const html = await fetchPage(url)
      if (!html) { console.log('  Keine Antwort, stoppe.'); break }

      const listings = parseListings(html, entryCity)
      console.log(`  → ${listings.length} Inserate gefunden`)

      if (listings.length === 0) { console.log('  Leer, stoppe.'); break }

      for (const listing of listings) {
        if (seenIds.has(listing.external_id)) continue
        seenIds.add(listing.external_id)
        if (!isKleingartenListing(listing.title)) continue
        await upsertListing(listing)
        total++
      }

      await delay(DELAY_MS)
    }
  }

  await deactivateStale()
  console.log(`\n✅ Fertig. ${total} Inserate verarbeitet.`)
}

main().catch(console.error)
