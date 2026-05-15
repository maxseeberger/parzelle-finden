import type { City } from './supabase'

export const CITIES: City[] = [
  { slug: 'berlin', name: 'Berlin', bundesland: 'Berlin', lat: 52.52, lng: 13.405, listing_count: 142, verein_count: 820, avg_abloese: 2500 },
  { slug: 'hamburg', name: 'Hamburg', bundesland: 'Hamburg', lat: 53.55, lng: 10.0, listing_count: 87, verein_count: 340, avg_abloese: 3200 },
  { slug: 'muenchen', name: 'München', bundesland: 'Bayern', lat: 48.137, lng: 11.576, listing_count: 63, verein_count: 290, avg_abloese: 3800 },
  { slug: 'koeln', name: 'Köln', bundesland: 'Nordrhein-Westfalen', lat: 50.938, lng: 6.96, listing_count: 54, verein_count: 210, avg_abloese: 2400 },
  { slug: 'frankfurt', name: 'Frankfurt', bundesland: 'Hessen', lat: 50.11, lng: 8.682, listing_count: 41, verein_count: 180, avg_abloese: 2800 },
  { slug: 'stuttgart', name: 'Stuttgart', bundesland: 'Baden-Württemberg', lat: 48.775, lng: 9.182, listing_count: 38, verein_count: 160, avg_abloese: 2600 },
  { slug: 'duesseldorf', name: 'Düsseldorf', bundesland: 'Nordrhein-Westfalen', lat: 51.227, lng: 6.774, listing_count: 32, verein_count: 140, avg_abloese: 2300 },
  { slug: 'leipzig', name: 'Leipzig', bundesland: 'Sachsen', lat: 51.34, lng: 12.374, listing_count: 29, verein_count: 220, avg_abloese: 1400 },
  { slug: 'dortmund', name: 'Dortmund', bundesland: 'Nordrhein-Westfalen', lat: 51.514, lng: 7.468, listing_count: 27, verein_count: 130, avg_abloese: 1800 },
  { slug: 'nuernberg', name: 'Nürnberg', bundesland: 'Bayern', lat: 49.452, lng: 11.077, listing_count: 24, verein_count: 115, avg_abloese: 2200 },
  { slug: 'bremen', name: 'Bremen', bundesland: 'Bremen', lat: 53.073, lng: 8.807, listing_count: 21, verein_count: 95, avg_abloese: 1900 },
  { slug: 'hannover', name: 'Hannover', bundesland: 'Niedersachsen', lat: 52.374, lng: 9.738, listing_count: 19, verein_count: 110, avg_abloese: 2000 },
]

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find(c => c.slug === slug)
}
