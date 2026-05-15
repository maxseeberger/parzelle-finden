import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import VereinCard from '@/components/VereinCard'
import { CITIES } from '@/lib/cities'

export const metadata: Metadata = {
  title: 'Kleingartenvereine in Deutschland — Verzeichnis & Wartelisten',
  description: 'Alle Kleingartenvereine in Deutschland mit Wartelisten-Status, Kontaktdaten und Vereinsinformationen.',
}

export default async function VereineDirectoryPage() {
  const { data } = await supabase
    .from('vereine')
    .select('*')
    .order('warteliste_status', { ascending: true })
    .limit(100)

  const vereine = data ?? []
  const cities = CITIES.slice(0, 12)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Kleingartenvereine in Deutschland</h1>
      <p className="text-gray-500 mb-8">
        {vereine.length} Vereine gelistet · Wartelisten-Status täglich aktualisiert
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-sm text-gray-500 self-center mr-1">Filtern nach Stadt:</span>
        {cities.map(city => (
          <a
            key={city.slug}
            href={`/kleingarten-${city.slug}`}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:border-gray-400 hover:text-gray-900 text-gray-600 transition-colors"
          >
            {city.name}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {vereine.length === 0 ? (
          <p className="text-gray-400 text-sm">Noch keine Vereinsdaten — Scraper läuft bald.</p>
        ) : (
          vereine.map(verein => <VereinCard key={verein.id} verein={verein} />)
        )}
      </div>
    </div>
  )
}
