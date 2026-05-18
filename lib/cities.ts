import type { City } from './supabase'

// verein_count = actual OSM data per Bundesland (updated May 2026)
// listing_count = not shown on city page (uses live DB count instead)
// avg_abloese = estimated market average based on research
export const CITIES: City[] = [
  { slug: 'berlin', name: 'Berlin', bundesland: 'Berlin', lat: 52.52, lng: 13.405, listing_count: 0, verein_count: 348, avg_abloese: 2500 },
  { slug: 'hamburg', name: 'Hamburg', bundesland: 'Hamburg', lat: 53.55, lng: 10.0, listing_count: 0, verein_count: 348, avg_abloese: 3200 },
  { slug: 'muenchen', name: 'München', bundesland: 'Bayern', lat: 48.137, lng: 11.576, listing_count: 0, verein_count: 312, avg_abloese: 3800 },
  { slug: 'koeln', name: 'Köln', bundesland: 'Nordrhein-Westfalen', lat: 50.938, lng: 6.96, listing_count: 0, verein_count: 263, avg_abloese: 2400 },
  { slug: 'frankfurt', name: 'Frankfurt', bundesland: 'Hessen', lat: 50.11, lng: 8.682, listing_count: 0, verein_count: 178, avg_abloese: 2800 },
  { slug: 'stuttgart', name: 'Stuttgart', bundesland: 'Baden-Württemberg', lat: 48.775, lng: 9.182, listing_count: 0, verein_count: 195, avg_abloese: 2600 },
  { slug: 'duesseldorf', name: 'Düsseldorf', bundesland: 'Nordrhein-Westfalen', lat: 51.227, lng: 6.774, listing_count: 0, verein_count: 263, avg_abloese: 2300 },
  { slug: 'leipzig', name: 'Leipzig', bundesland: 'Sachsen', lat: 51.34, lng: 12.374, listing_count: 0, verein_count: 241, avg_abloese: 1400 },
  { slug: 'dortmund', name: 'Dortmund', bundesland: 'Nordrhein-Westfalen', lat: 51.514, lng: 7.468, listing_count: 0, verein_count: 263, avg_abloese: 1800 },
  { slug: 'nuernberg', name: 'Nürnberg', bundesland: 'Bayern', lat: 49.452, lng: 11.077, listing_count: 0, verein_count: 312, avg_abloese: 2200 },
  { slug: 'bremen', name: 'Bremen', bundesland: 'Bremen', lat: 53.073, lng: 8.807, listing_count: 0, verein_count: 41, avg_abloese: 1900 },
  { slug: 'hannover', name: 'Hannover', bundesland: 'Niedersachsen', lat: 52.374, lng: 9.738, listing_count: 0, verein_count: 187, avg_abloese: 2000 },
]

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find(c => c.slug === slug)
}
