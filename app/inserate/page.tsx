import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kleingarten Inserate — Parzellen kaufen & pachten',
  description: 'Aktuelle Kleingarten-Inserate aus ganz Deutschland — Ablöse, Größe, Standort auf einen Blick.',
}

const PAGE_SIZE = 25

export default async function InseratePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('active', true)
    .order('price_abloese', { ascending: false, nullsFirst: false })
    .order('posted_at', { ascending: false })
    .range(from, to)

  if (error) console.error('Inserate query error:', error.message)

  const listings = data ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kleingarten Inserate</h1>
        <p className="text-gray-500">
          {(count ?? 0).toLocaleString('de-DE')} aktuelle Inserate deutschlandweit
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">Keine Inserate gefunden.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/inserate?page=${page - 1}`}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors"
            >
              <ChevronLeft size={15} /> Zurück
            </Link>
          )}
          <span className="text-sm text-gray-500">Seite {page} von {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/inserate?page=${page + 1}`}
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
