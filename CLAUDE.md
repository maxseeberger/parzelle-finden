@AGENTS.md

# parzelle-finden.de — Project Brief for Claude

> Read this file fully before touching any code. It contains everything needed to continue development without re-explanation.

---

## Who is Max

- Accenture management/tech consultant, non-developer, works on macOS with Terminal + GitHub web editor
- Comfortable reading code but does not write it independently
- **Working style:** do tasks autonomously end-to-end, no confirmation checkpoints mid-task, present complete files not diffs, explain results simply after the fact
- Deploys by pushing to GitHub `main` — Vercel auto-deploys

---

## What this project is

A German **Kleingarten (allotment garden) aggregator** — the only central platform in Germany for:
1. Searching free Kleingärten for sale/takeover (listings scraped from classifieds)
2. Finding local Kleingartenvereine and checking their waitlist status

**Monetisation:** AdSense display ads + affiliate links (planned)

**Status:** Live at [parzelle-finden.de](https://parzelle-finden.de)

---

## Key URLs & Services

| Service | URL / Detail |
|---|---|
| **Live site** | https://parzelle-finden.de |
| **GitHub repo** | https://github.com/maxseeberger/parzelle-finden |
| **Vercel project** | https://vercel.com (project: parzelle-finden) |
| **Supabase project** | https://supabase.com/dashboard/project/mdcjmvlqirfbrtcdkifj |
| **Supabase URL** | https://mdcjmvlqirfbrtcdkifj.supabase.co |
| **Resend (email)** | https://resend.com — domain parzelle-finden.de verified via DKIM/SPF at Namecheap |
| **Domains** | parzelle-finden.de + kleingarten-finden.de (SEO redirect) — both at Namecheap |
| **GitHub Actions** | https://github.com/maxseeberger/parzelle-finden/actions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, server + client components) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Hosting | Vercel (auto-deploy from GitHub main) |
| Email | Resend (transactional — alert confirmations + nightly digests) |
| Scrapers | TypeScript via `tsx`, run on GitHub Actions cron |
| Icons | lucide-react |
| Package manager | npm |

---

## Local Setup

```
Local path:  /Users/max.seeberger/Downloads/Evergrowth - Claude Setup 2/_Workspace/projects/parzelle-finden
Run dev:     npm run dev
Build:       npm run build
```

**`.env.local`** (required, never commit):
```
NEXT_PUBLIC_SUPABASE_URL=https://mdcjmvlqirfbrtcdkifj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=       ← Supabase dashboard → Settings → API (secret)
RESEND_API_KEY=                  ← Resend dashboard
```

Same four keys must also exist in:
- **Vercel** → Environment Variables (for production builds)
- **GitHub** → Settings → Secrets (for scraper Actions)

---

## File Structure

```
app/
  page.tsx                   Homepage — hero search, stats bar, city grid, alert CTA
  layout.tsx                 Root layout, Navbar, Footer
  city/[slug]/page.tsx       City landing pages — /kleingarten-berlin etc (rewrite via next.config.ts)
  suche/page.tsx             PLZ radius search — zippopotam.us → haversine sort
  vereine/page.tsx           Vereine directory
  inserate/page.tsx          Listings directory, paginated 25/page
  ratgeber/                  SEO articles (warteliste, ablöse, …)
  api/alert/route.ts         Alert form API — Supabase upsert + Resend confirmation email
  impressum/page.tsx         Legal
  datenschutz/page.tsx       Privacy policy
  robots.ts                  robots.txt
  sitemap.ts                 Dynamic sitemap

components/
  CitySearch.tsx             Search bar — PLZ suggestions via zippopotam.us, city autocomplete from lib/cities.ts
  VereinCard.tsx             Expandable card — distance badge, all contact fields, WartelisteBadge
  ListingCard.tsx            Listing card — price badge, source pill, daysAgo, MapPin city
  AlertForm.tsx              Email alert signup — variant prop: 'hero' | 'sidebar'
  Navbar.tsx                 Nav with links: Vereine, Inserate
  WartelisteBadge.tsx        Coloured badge for offen / geschlossen / unbekannt
  Footer.tsx

lib/
  supabase.ts                Supabase client + TypeScript types (Verein, Listing, City)
  cities.ts                  Static list of major German cities with slugs for autocomplete

scripts/
  notify-alerts.ts           Nightly digest — match new listings to alerts, send Resend emails
  fix-unknown-cities.ts      One-off script to retroactively fix listings with city = 'Unbekannt'
  scrapers/
    kleinanzeigen.ts         Main listings scraper (see Scrapers section)
    quoka.ts
    markt.ts
    immowelt.ts
    bkd.ts                   OSM Overpass API — pulls all German Kleingartenvereine
    verein-spider.ts         Website crawler — finds waitlist sub-pages, extracts contact info

supabase/
  migrations/
    20260518_create_alerts.sql
    20260518_verein_quality_score.sql
    20260519_spider_improvements.sql   ← adds warteliste_url, recalculates quality_score
  supabase-schema.sql        Full initial schema (reference)

.github/workflows/
  scraper-listings.yml       Daily 6am UTC — kleinanzeigen + quoka + markt + immowelt
  scraper-bkd.yml            Weekly Sunday 2am UTC — OSM vereine + verein spider
  scraper-kleinanzeigen.yml  Standalone Kleinanzeigen run (manual trigger)
  notify-alerts.yml          Nightly alert digest
```

---

## Database Schema

### `vereine` — Kleingartenvereine
```sql
id                uuid PK
name              text NOT NULL
address           text
city              text NOT NULL
plz               text
bundesland        text
website           text
email             text
phone             text
warteliste_status text  CHECK IN ('offen','geschlossen','unbekannt')  DEFAULT 'unbekannt'
warteliste_url    text  -- direct link to the sub-page where you can register (e.g. /Freie-Parzellen/)
warteliste_laenge integer
parzellen_anzahl  integer
jahresbeitrag     integer
lat               double precision
lng               double precision
quality_score     integer  -- auto-computed by DB trigger (see below)
last_updated      timestamptz
created_at        timestamptz
```

### `listings` — Scraped classifieds
```sql
id           uuid PK
source       text  -- 'kleinanzeigen' | 'quoka' | 'markt' | 'immowelt'
external_id  text
title        text NOT NULL
price_abloese integer
size_sqm     integer
city         text NOT NULL
plz          text
contact_url  text   -- deeplink back to original listing (never copy content)
posted_at    timestamptz
scraped_at   timestamptz
active       boolean DEFAULT true
UNIQUE(source, external_id)
```

### `alerts` — Email subscriptions
```sql
id         uuid PK
email      text NOT NULL
city       text NOT NULL
active     boolean DEFAULT true
created_at timestamptz
UNIQUE(email, city)
```

### `cities` — Static city metadata (seeded)
```sql
slug          text PK
name          text
bundesland    text
lat/lng       double precision
listing_count integer
verein_count  integer
avg_abloese   integer
```

### quality_score formula (DB trigger on vereine)
```
+30  warteliste_status = 'offen'
+10  warteliste_status = 'geschlossen'
+20  has website
+10  has warteliste_url
+15  has email
+10  has phone
+15  has parzellen_anzahl
+10  has warteliste_laenge
 +5  has jahresbeitrag
= 125 max
```
Trigger: `trg_verein_quality_score` → `update_verein_quality_score()` (BEFORE INSERT OR UPDATE)

---

## Routing

```
/                          → app/page.tsx
/kleingarten-[slug]        → app/city/[slug]/page.tsx  (via next.config.ts rewrite)
/suche?plz=80331           → app/suche/page.tsx
/vereine                   → app/vereine/page.tsx
/inserate                  → app/inserate/page.tsx
/ratgeber/[slug]           → app/ratgeber/[slug]/page.tsx
/api/alert                 → app/api/alert/route.ts  (POST)
```

---

## Scrapers

### Listings — run daily via `scraper-listings.yml`

**`kleinanzeigen.ts`** — primary source
- 20+ search URLs covering all 16 German states + synonym keywords
  (kleingarten, schrebergarten, datsche, parzelle, freizeitgrundstück, nachpächter, erholungsgarten, …)
- Parsing priority: `__NEXT_DATA__` JSON → JSON-LD → HTML fallback
- `buildAdidLocationMap()` extracts city/PLZ per card
- 80+ entry PLZ_TO_CITY lookup table for "Unbekannt" resolution
- Keyword filter: positive (kleingarten, parzelle, laube, …) + negative (gartenhaus, holzhütte, bausatz, ' mm ', …) to block shed/cabin spam
- Upserts on `(source, external_id)` — updates city/price if listing seen again

**`immowelt.ts`** — Freizeitgrundstück category
- All 16 German states
- Parsing: JSON-LD → `__NEXT_DATA__` → HTML expose link fallback
- `source = 'immowelt'`

**`quoka.ts`** and **`markt.ts`** — secondary sources, similar structure

### Vereine — run weekly via `scraper-bkd.yml`

**`bkd.ts`** — OpenStreetMap Overpass API
- Queries `landuse=allotments` + `leisure=garden,garden:type=allotment` per region
- 22 regions (large states split into sub-bboxes to avoid 60s Overpass timeout)
  - Bayern → 4 sub-regions, NRW → 3, BW → 2, Niedersachsen → 2
- Stores lat/lng (essential for radius search)
- **Never deletes** existing records — upsert only (Bayern timeout historically wiped all data)
- Conflict key: `(name, city)`

**`verein-spider.ts`** — website crawler (runs after bkd.ts)
- Loads ALL vereine with a website URL (no cap)
- For each: fetches homepage + up to 3 highest-scoring internal sub-pages
- Sub-page scoring: URL + anchor text matched against keywords
  `parzell, warteliste, aufnahme, mitglied, frei, anmeld, bewerb, beitritt, vakant, …`
- Extracts from combined page text:
  - `warteliste_status` (offen/geschlossen) — via open/closed keyword lists
  - `warteliste_url` — the exact sub-page URL where 'offen' was detected (e.g. `/Freie-Parzellen/`)
  - `email`, `phone` — regex with obfuscation handling (`[at]`, `(dot)`)
  - `parzellen_anzahl`, `warteliste_laenge`, `jahresbeitrag` — numeric regex patterns
- **8× concurrent** fetching (all different domains — safe)
- Partial DB updates only — never overwrites existing good data with null
- GitHub Actions timeout: 240 min

### Nightly alerts — `notify-alerts.yml`

**`notify-alerts.ts`**
- Fetches listings scraped in last 25 hours
- Groups by city, matches against active `alerts` rows
- Sends one Resend email per (subscriber × city) with new listings

---

## Key Architectural Decisions

| Decision | Why |
|---|---|
| PLZ search uses zippopotam.us + Nominatim fallback | Covers all 8,000+ German PLZ; openplzapi.org was missing many (e.g. 82335 Berg) |
| Never show 0 Vereine | If radius (<80 km) returns <5 results, fall back to full Bundesland query including Vereine without coords |
| OSM scraper never deletes | Bayern consistently timed out → delete-then-scrape wiped the state until next weekly run |
| Spider crawls sub-pages | Homepage alone misses e.g. `/Freie-Parzellen/` — the actual waitlist info lives on sub-pages |
| `warteliste_url` stored separately | Enables "Jetzt bewerben →" button linking directly to the registration page (not just the homepage) |
| `source` is plain text not enum | Discovered live — schema uses `CHECK` constraint, not a PostgreSQL enum type |
| Listings deduped on `(source, external_id)` | Prevents duplicates across daily scraper runs |
| quality_score DB trigger | Keeps sort order current automatically on every upsert |

---

## npm Scripts

```bash
npm run dev                  # local dev server
npm run build                # production build
npm run scrape:kleinanzeigen # run Kleinanzeigen scraper locally
npm run scrape:quoka
npm run scrape:markt
npm run scrape:immowelt
npm run scrape:listings      # all four listing scrapers in sequence
npm run scrape:bkd           # OSM Vereine scraper
npm run scrape:spider        # Verein website spider
npm run scrape:all           # bkd + spider + listings
npm run notify:alerts        # nightly alert digest
npm run fix:cities           # retroactively fix 'Unbekannt' city on listings
```

To run scrapers locally, prefix with env vars:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npm run scrape:bkd
```

To trigger scrapers in production: GitHub → Actions → workflow → "Run workflow" button.

---

## Pending / Ideas

- **"Jetzt bewerben →" button** on VereinCard when `warteliste_url` is set (spider is now collecting these)
- Show `parzellen_anzahl`, `warteliste_laenge`, `jahresbeitrag` on expanded VereinCard once spider has populated them
- Verify Resend email alerts work end-to-end (DNS verified at Namecheap, RESEND_API_KEY needed in Vercel + GitHub Secrets)
- AdSense setup
- More Ratgeber SEO articles (beyond warteliste + ablöse)
- Consider adding ebay-kleinanzeigen.de as a separate source (same domain as kleinanzeigen.de post-merger — may overlap)

---

## Things That Have Burned Us Before

- **Do not add `DELETE` before re-scraping vereine** — a state timing out will permanently wipe that state's data until the next weekly run
- **Do not change `source` to a PostgreSQL enum** — the `listings` table uses a plain `text` CHECK constraint
- **PLZ '477'/'478'** — both Duisburg AND Krefeld. Duisburg block in PLZ_TO_CITY only goes to '476'
- **Running scrapers locally** requires `SUPABASE_SERVICE_ROLE_KEY`, not the anon key — anon key will silently fail RLS
- **`ignoreDuplicates: true`** on Supabase upsert means "Unbekannt" cities never get fixed on re-scrape — always use `false` or omit it
- **Bayern Overpass timeout** — single bbox query times out. Must use the 4 sub-region bboxes defined in `bkd.ts`
