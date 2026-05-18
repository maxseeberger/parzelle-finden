import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type WartelisteStatus = 'offen' | 'geschlossen' | 'unbekannt'

export interface Verein {
  id: string
  name: string
  address: string
  city: string
  plz: string
  bundesland: string
  website?: string
  phone?: string
  email?: string
  warteliste_status: WartelisteStatus
  warteliste_laenge?: number
  parzellen_anzahl?: number
  jahresbeitrag?: number
  lat?: number
  lng?: number
  last_updated: string
  quality_score?: number
}

export interface Listing {
  id: string
  source: 'kleinanzeigen' | 'verein' | 'manual'
  external_id?: string
  title: string
  price_abloese?: number
  size_sqm?: number
  city: string
  plz?: string
  lat?: number
  lng?: number
  description?: string
  contact_url?: string
  posted_at: string
  scraped_at: string
  active: boolean
  verein_id?: string
}

export interface City {
  slug: string
  name: string
  bundesland: string
  lat: number
  lng: number
  listing_count: number
  verein_count: number
  avg_abloese?: number
}
