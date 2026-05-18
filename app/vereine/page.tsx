import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import VereinCard from '@/components/VereinCard'
import { CITIES } from '@/lib/cities'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kleingartenvereine in Deutschland — Verzeichnis & Wartelisten',
  description: 'Alle Kleingartenvereine in Deutschland mit Wartelisten-Status, Kontaktdaten und Vereinsinformationen.',
}

const PAGE_SIZE = 20

export default async function VereineDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; bundesland?: string }>
}) {
  const { page: pageParam, bundesland } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Count total
  let countQuery = supabase.from('vereine').select('id', { count: 'exact', head: true })
  if (bundesland) countQuery = countQuery.eq('bundesland', bundesland)
  const { count } = await countQuery

  // Fetch vereine — sort: offen first, then by whether they have contact info, then name
  let query = supabase.from('vereine').select('*')
  if (bundesland) query = query.eq('bundesland', bundesland)
  const { data, error } = await query
    .order('quality_score', { ascending: false })
    .order('name', { ascending: true })
    .range(from, to)

  if (error) console.error('Vereine query error:', error.message)
  const vereine = data ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const bundeslaender = ['Berlin', 'Hamburg', 'Bayern', 'Nordrhein-Westfalen', 'Sachsen', 'Brandenburg', 'Niedersachsen', 'Hessen', 'Baden-Württemberg', 'Bremen']

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kleingartenvereine in Deutschland</h1>
        <p className="text-gray-500">
          {(count ?? 0).toLocaleString('de-DE')} Vereine · Wartelisten-Status wird regelmäßig aktualisiert
        </p>
      </div>

      {/* Bundesland filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/vereine"
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${!bundesland ? 'border-green-500 text-green-700 bg-green-50' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
        >
          Alle
        </Link>
        {bundeslaender.map(bl => (
          <Link
            key={bl}
            href={`/vereine?bundesland=${encodeURIComponent(bl)}`}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${bundesland === bl ? 'border-green-500 text-green-700 bg-green-50' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
          >
            {bl}
          </Link>
        ))}
      </div>

      {/* City quick links */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2 font-medium">Direkt zur Stadt:</p>
        <div className="flex flex-wrap gap-2">
          {CITIES.map(city => (
            <Link key={city.slug} href={`/kleingarten-${city.slug}`}
              className="text-xs px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors">
              {city.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Vereine list */}
      <div className="space-y-3 mb-8">
        {vereine.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Keine Vereine gefunden.</p>
          </div>
        ) : (
          vereine.map(verein => <VereinCard key={verein.id} verein={verein} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/vereine?page=${page - 1}${bundesland ? `&bundesland=${encodeURIComponent(bundesland)}` : ''}`}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors"
            >
              <ChevronLeft size={15} /> Zurück
            </Link>
          )}
          <span className="text-sm text-gray-500">Seite {page} von {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/vereine?page=${page + 1}${bundesland ? `&bundesland=${encodeURIComponent(bundesland)}` : ''}`}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors"
            >
              Weiter <ChevronRight size={15} />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
