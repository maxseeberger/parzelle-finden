/**
 * One-off script: re-derive city for listings that are tagged "Unbekannt"
 * but DO have a PLZ stored. Uses the same PLZ map as the scraper.
 * Run once: npm run fix:cities
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const PLZ_TO_CITY: Record<string, string> = {
  '100': 'Berlin', '101': 'Berlin', '102': 'Berlin', '103': 'Berlin', '104': 'Berlin',
  '105': 'Berlin', '106': 'Berlin', '107': 'Berlin', '108': 'Berlin', '109': 'Berlin',
  '110': 'Berlin', '111': 'Berlin', '112': 'Berlin', '113': 'Berlin', '114': 'Berlin',
  '115': 'Berlin', '116': 'Berlin', '117': 'Berlin', '118': 'Berlin', '119': 'Berlin',
  '120': 'Berlin', '121': 'Berlin', '122': 'Berlin', '123': 'Berlin', '124': 'Berlin',
  '125': 'Berlin', '126': 'Berlin', '127': 'Berlin', '128': 'Berlin', '129': 'Berlin',
  '130': 'Berlin', '131': 'Berlin', '132': 'Berlin', '133': 'Berlin', '134': 'Berlin',
  '135': 'Berlin', '136': 'Berlin', '137': 'Berlin', '138': 'Berlin', '139': 'Berlin',
  '140': 'Berlin', '141': 'Berlin', '142': 'Berlin', '143': 'Berlin',
  '144': 'Potsdam', '145': 'Potsdam', '146': 'Potsdam', '147': 'Potsdam',
  '180': 'Rostock', '181': 'Rostock', '182': 'Rostock',
  '190': 'Schwerin', '191': 'Schwerin', '192': 'Schwerin',
  '195': 'Schwerin', '196': 'Schwerin', '197': 'Schwerin', '198': 'Schwerin', '199': 'Schwerin',
  '200': 'Hamburg', '201': 'Hamburg', '202': 'Hamburg', '203': 'Hamburg', '204': 'Hamburg',
  '205': 'Hamburg', '206': 'Hamburg', '207': 'Hamburg', '208': 'Hamburg', '209': 'Hamburg',
  '210': 'Hamburg', '211': 'Hamburg', '212': 'Hamburg', '213': 'Hamburg', '214': 'Hamburg',
  '215': 'Hamburg', '216': 'Hamburg', '217': 'Hamburg', '218': 'Hamburg', '219': 'Hamburg',
  '220': 'Hamburg', '221': 'Hamburg', '222': 'Hamburg', '223': 'Hamburg', '224': 'Hamburg',
  '225': 'Hamburg', '226': 'Hamburg', '227': 'Hamburg', '228': 'Hamburg', '229': 'Hamburg',
  '235': 'Lübeck', '236': 'Lübeck', '237': 'Lübeck', '238': 'Lübeck', '239': 'Lübeck',
  '240': 'Kiel', '241': 'Kiel', '242': 'Kiel', '243': 'Kiel',
  '275': 'Bremerhaven', '276': 'Bremerhaven', '277': 'Bremerhaven',
  '280': 'Bremen', '281': 'Bremen', '282': 'Bremen', '283': 'Bremen', '284': 'Bremen', '285': 'Bremen',
  '300': 'Hannover', '301': 'Hannover', '302': 'Hannover', '303': 'Hannover', '304': 'Hannover', '305': 'Hannover', '306': 'Hannover',
  '030': 'Cottbus', '031': 'Cottbus', '032': 'Cottbus',
  '010': 'Dresden', '011': 'Dresden', '012': 'Dresden', '013': 'Dresden', '014': 'Dresden',
  '041': 'Leipzig', '042': 'Leipzig', '043': 'Leipzig', '044': 'Leipzig',
  '060': 'Halle', '061': 'Halle', '062': 'Halle',
  '074': 'Gera', '075': 'Gera',
  '076': 'Jena', '077': 'Jena',
  '080': 'Zwickau', '081': 'Zwickau',
  '090': 'Chemnitz', '091': 'Chemnitz', '092': 'Chemnitz',
  '330': 'Paderborn', '331': 'Paderborn',
  '336': 'Bielefeld', '337': 'Bielefeld',
  '341': 'Kassel', '342': 'Kassel', '343': 'Kassel',
  '370': 'Göttingen', '371': 'Göttingen', '372': 'Göttingen',
  '381': 'Braunschweig', '382': 'Braunschweig', '383': 'Braunschweig',
  '384': 'Wolfsburg', '385': 'Wolfsburg',
  '390': 'Magdeburg', '391': 'Magdeburg', '392': 'Magdeburg', '393': 'Magdeburg',
  '400': 'Düsseldorf', '401': 'Düsseldorf', '402': 'Düsseldorf', '403': 'Düsseldorf', '404': 'Düsseldorf', '405': 'Düsseldorf', '406': 'Düsseldorf',
  '411': 'Mönchengladbach', '412': 'Mönchengladbach', '413': 'Mönchengladbach',
  '414': 'Neuss', '415': 'Neuss',
  '420': 'Wuppertal', '421': 'Wuppertal', '422': 'Wuppertal', '423': 'Wuppertal', '424': 'Wuppertal',
  '425': 'Remscheid', '426': 'Remscheid',
  '427': 'Solingen', '428': 'Solingen',
  '440': 'Dortmund', '441': 'Dortmund', '442': 'Dortmund', '443': 'Dortmund', '444': 'Dortmund',
  '445': 'Herne', '446': 'Herne',
  '447': 'Bochum', '448': 'Bochum', '449': 'Bochum',
  '451': 'Essen', '452': 'Essen', '453': 'Essen',
  '456': 'Recklinghausen', '457': 'Recklinghausen',
  '458': 'Gelsenkirchen', '459': 'Gelsenkirchen',
  '460': 'Oberhausen', '461': 'Oberhausen', '462': 'Oberhausen',
  '464': 'Bottrop',
  '470': 'Duisburg', '471': 'Duisburg', '472': 'Duisburg', '473': 'Duisburg',
  '474': 'Duisburg', '475': 'Duisburg', '476': 'Duisburg',
  '481': 'Münster', '482': 'Münster', '483': 'Münster',
  '490': 'Osnabrück', '491': 'Osnabrück', '492': 'Osnabrück',
  '506': 'Köln', '507': 'Köln', '508': 'Köln', '509': 'Köln', '510': 'Köln', '511': 'Köln', '512': 'Köln',
  '513': 'Leverkusen', '514': 'Leverkusen',
  '520': 'Aachen', '521': 'Aachen', '522': 'Aachen', '523': 'Aachen', '524': 'Aachen',
  '531': 'Bonn', '532': 'Bonn', '533': 'Bonn', '534': 'Bonn',
  '542': 'Trier', '543': 'Trier', '544': 'Trier',
  '551': 'Mainz', '552': 'Mainz', '553': 'Mainz',
  '560': 'Koblenz', '561': 'Koblenz',
  '580': 'Hagen', '581': 'Hagen',
  '590': 'Hamm', '591': 'Hamm',
  '600': 'Frankfurt', '601': 'Frankfurt', '602': 'Frankfurt', '603': 'Frankfurt', '604': 'Frankfurt',
  '605': 'Frankfurt', '606': 'Frankfurt', '607': 'Frankfurt', '608': 'Frankfurt', '609': 'Frankfurt',
  '641': 'Darmstadt', '642': 'Darmstadt', '643': 'Darmstadt',
  '650': 'Wiesbaden', '651': 'Wiesbaden',
  '660': 'Saarbrücken', '661': 'Saarbrücken', '662': 'Saarbrücken', '663': 'Saarbrücken',
  '675': 'Kaiserslautern', '676': 'Kaiserslautern',
  '681': 'Mannheim', '682': 'Mannheim', '683': 'Mannheim',
  '691': 'Heidelberg', '692': 'Heidelberg', '693': 'Heidelberg',
  '700': 'Stuttgart', '701': 'Stuttgart', '702': 'Stuttgart', '703': 'Stuttgart', '704': 'Stuttgart',
  '705': 'Stuttgart', '706': 'Stuttgart', '707': 'Stuttgart', '708': 'Stuttgart',
  '720': 'Tübingen', '721': 'Reutlingen',
  '740': 'Heilbronn', '741': 'Heilbronn', '742': 'Heilbronn',
  '751': 'Pforzheim', '752': 'Pforzheim', '753': 'Pforzheim',
  '760': 'Karlsruhe', '761': 'Karlsruhe', '762': 'Karlsruhe',
  '790': 'Freiburg', '791': 'Freiburg', '792': 'Freiburg', '793': 'Freiburg',
  '800': 'München', '801': 'München', '802': 'München', '803': 'München', '804': 'München',
  '805': 'München', '806': 'München', '807': 'München', '808': 'München', '809': 'München',
  '810': 'München', '811': 'München', '812': 'München', '813': 'München', '814': 'München',
  '815': 'München', '816': 'München', '817': 'München', '818': 'München',
  '850': 'Ingolstadt', '851': 'Ingolstadt',
  '860': 'Augsburg', '861': 'Augsburg', '862': 'Augsburg',
  '890': 'Ulm', '891': 'Ulm',
  '900': 'Nürnberg', '901': 'Nürnberg', '902': 'Nürnberg', '903': 'Nürnberg', '904': 'Nürnberg', '905': 'Nürnberg', '906': 'Nürnberg',
  '907': 'Fürth', '908': 'Fürth',
  '910': 'Erlangen', '911': 'Erlangen',
  '930': 'Regensburg', '931': 'Regensburg', '932': 'Regensburg', '933': 'Regensburg', '934': 'Regensburg',
  '970': 'Würzburg', '971': 'Würzburg', '972': 'Würzburg',
  '990': 'Erfurt', '991': 'Erfurt', '992': 'Erfurt',
  '994': 'Weimar', '995': 'Weimar',
}

function cityFromPlz(plz: string): string | undefined {
  return PLZ_TO_CITY[plz.substring(0, 3)] ?? PLZ_TO_CITY[plz.substring(0, 2)]
}

async function main() {
  console.log('🔧 Fetching Unbekannt listings with a PLZ...')

  const { data, error } = await supabase
    .from('listings')
    .select('id, plz')
    .eq('city', 'Unbekannt')
    .not('plz', 'is', null)

  if (error) { console.error(error.message); process.exit(1) }
  if (!data || data.length === 0) { console.log('Nothing to fix.'); return }

  console.log(`Found ${data.length} listings to fix`)

  let fixed = 0
  let skipped = 0

  for (const listing of data) {
    const city = cityFromPlz(listing.plz)
    if (!city) { skipped++; continue }

    const { error: upErr } = await supabase
      .from('listings')
      .update({ city })
      .eq('id', listing.id)

    if (upErr) {
      console.error(`Failed to update ${listing.id}:`, upErr.message)
    } else {
      fixed++
    }
  }

  console.log(`✅ Fixed ${fixed} listings | ${skipped} PLZ not in map`)
}

main().catch(e => { console.error(e); process.exit(1) })
