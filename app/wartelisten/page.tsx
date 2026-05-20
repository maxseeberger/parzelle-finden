import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import VereinCard from '@/components/VereinCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Offene Wartelisten — Kleingartenvereine mit freiem Platz',
  description: 'Kleingartenvereine in Deutschland, die ihre Warteliste aktuell geöffnet haben. Mit Direktlink zur Bewerbungsseite — wöchentlich aktualisiert.',
}

const PAGE_SIZE = 25

const BUNDESLAENDER = [
  'Berlin', 'Hamburg', 'Bayern', 'Nordrhein-Westfalen', 'Sachsen',
  'Brandenburg', 'Niedersachsen', 'Hessen', 'Baden-Württemberg', 'Bremen',
  'Rheinland-Pfalz', 'Thüringen', 'Sachsen-Anhalt', 'Saarland',
  'Mecklenburg-Vorpommern', 'Schleswig-Holstein',
]

export default async function WartelistenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; bundesland?: string }>
}) {
  const { page: pageParam, bundesland } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Count — only offen
  let countQuery = supabase
    .from('vereine')
    .select('id', { count: 'exact', head: true })
    .eq('warteliste_status', 'offen')
  if (bundesland) countQuery = countQuery.eq('bundesland', bundesland)
  const { count } = await countQuery

  // Fetch — only offen, warteliste_url first, then quality_score
  let query = supabase
    .from('vereine')
    .select('*')
    .eq('warteliste_status', 'offen')
  if (bundesland) query = query.eq('bundesland', bundesland)
  const { data, error } = await query
    .order('warteliste_url', { ascending: false, nullsFirst: false })
    .order('quality_score', { ascending: false })
    .order('name', { ascending: true })
    .range(from, to)

  if (error) console.error('Wartelisten query error:', error.message)
  const vereine = data ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const withDirectLink = vereine.filter(v => v.warteliste_url).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-4 border"
          style={{ color: 'var(--green-primary)', borderColor: 'var(--green-primary)', backgroundColor: 'var(--green-pale)' }}>
          Wöchentlich aktualisiert
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Offene Wartelisten</h1>
        <p className="text-gray-500">
          {(count ?? 0).toLocaleString('de-DE')} Vereine haben ihre Warteliste aktuell geöffnet
          {withDirectLink > 0 && (
            <span className="ml-2 text-sm" style={{ color: 'var(--green-primary)' }}>
              · {withDirectLink} mit Direktlink zur Bewerbung
            </span>
          )}
        </p>
      </div>

      {/* What makes this different */}
      <div className="mb-8 p-5 rounded-2xl border border-green-100 bg-green-50/50">
        <p className="text-sm text-gray-600 leading-relaxed">
          <strong className="text-gray-800">Wie funktioniert das?</strong> Unser Crawler überprüft wöchentlich die Websites von Kleingartenvereinen in ganz Deutschland.
          Vereine mit einem <span className="font-medium" style={{ color: 'var(--green-primary)' }}>„Jetzt bewerben →"</span>-Button haben eine gefundene Bewerbungsseite —
          du gelangst mit einem Klick direkt zur Anmeldung, ohne selbst auf der Website suchen zu müssen.
        </p>
      </div>

      {/* Bundesland filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/wartelisten"
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${!bundesland ? 'border-green-500 text-green-700 bg-green-50' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
        >
          Alle Bundesländer
        </Link>
        {BUNDESLAENDER.map(bl => (
          <Link
            key={bl}
            href={`/wartelisten?bundesland=${encodeURIComponent(bl)}`}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${bundesland === bl ? 'border-green-500 text-green-700 bg-green-50' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
          >
            {bl}
          </Link>
        ))}
      </div>

      {/* Vereine list */}
      <div className="space-y-3 mb-8">
        {vereine.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">Keine offenen Wartelisten gefunden.</p>
            <p className="text-sm">Versuch ein anderes Bundesland oder komm bald wieder — wir aktualisieren wöchentlich.</p>
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
              href={`/wartelisten?page=${page - 1}${bundesland ? `&bundesland=${encodeURIComponent(bundesland)}` : ''}`}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors"
            >
              <ChevronLeft size={15} /> Zurück
            </Link>
          )}
          <span className="text-sm text-gray-500">Seite {page} von {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/wartelisten?page=${page + 1}${bundesland ? `&bundesland=${encodeURIComponent(bundesland)}` : ''}`}
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
