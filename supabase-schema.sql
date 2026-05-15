-- parzelle-finden.de — Supabase Schema
-- Run this in the Supabase SQL Editor to initialize the database

-- Cities
CREATE TABLE IF NOT EXISTS cities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bundesland TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  listing_count INTEGER DEFAULT 0,
  verein_count INTEGER DEFAULT 0,
  avg_abloese INTEGER
);

-- Kleingartenvereine
CREATE TABLE IF NOT EXISTS vereine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  plz TEXT,
  bundesland TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  warteliste_status TEXT CHECK (warteliste_status IN ('offen', 'geschlossen', 'unbekannt')) DEFAULT 'unbekannt',
  warteliste_laenge INTEGER,
  parzellen_anzahl INTEGER,
  jahresbeitrag INTEGER,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Listings (aggregated from Kleinanzeigen + Verein websites + manual)
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT CHECK (source IN ('kleinanzeigen', 'verein', 'manual')) NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  price_abloese INTEGER,
  size_sqm INTEGER,
  city TEXT NOT NULL,
  plz TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  description TEXT,
  contact_url TEXT,
  verein_id UUID REFERENCES vereine(id),
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true,
  UNIQUE(source, external_id)
);

-- Email alerts for new listings
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  plz TEXT,
  max_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS listings_city_idx ON listings(city);
CREATE INDEX IF NOT EXISTS listings_active_idx ON listings(active);
CREATE INDEX IF NOT EXISTS vereine_city_idx ON vereine(city);
CREATE INDEX IF NOT EXISTS vereine_warteliste_idx ON vereine(warteliste_status);

-- Seed: top 12 cities
INSERT INTO cities (slug, name, bundesland, lat, lng, listing_count, verein_count, avg_abloese) VALUES
  ('berlin', 'Berlin', 'Berlin', 52.52, 13.405, 142, 820, 2500),
  ('hamburg', 'Hamburg', 'Hamburg', 53.55, 10.0, 87, 340, 3200),
  ('muenchen', 'München', 'Bayern', 48.137, 11.576, 63, 290, 3800),
  ('koeln', 'Köln', 'Nordrhein-Westfalen', 50.938, 6.96, 54, 210, 2400),
  ('frankfurt', 'Frankfurt', 'Hessen', 50.11, 8.682, 41, 180, 2800),
  ('stuttgart', 'Stuttgart', 'Baden-Württemberg', 48.775, 9.182, 38, 160, 2600),
  ('duesseldorf', 'Düsseldorf', 'Nordrhein-Westfalen', 51.227, 6.774, 32, 140, 2300),
  ('leipzig', 'Leipzig', 'Sachsen', 51.34, 12.374, 29, 220, 1400),
  ('dortmund', 'Dortmund', 'Nordrhein-Westfalen', 51.514, 7.468, 27, 130, 1800),
  ('nuernberg', 'Nürnberg', 'Bayern', 49.452, 11.077, 24, 115, 2200),
  ('bremen', 'Bremen', 'Bremen', 53.073, 8.807, 21, 95, 1900),
  ('hannover', 'Hannover', 'Niedersachsen', 52.374, 9.738, 19, 110, 2000)
ON CONFLICT (slug) DO NOTHING;
