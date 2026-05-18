import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ExternalLink, Phone, Mail, MapPin, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import WartelisteBadge from '@/components/WartelisteBadge'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabase.from('vereine').select('name,city,bundesland').eq('id', slug).single()
  if (!data) return {}
  return {
    title: `${data.name} — Kleingarten ${data.city || data.bundesland}`,
    description: `Wartelisten-Status, Kontakt und Informationen für ${data.name}.`,
  }
}

export default async function VereinDetailPage({ params }: Props) {
  const { slug } = await params
  const { data: verein } = await supabase.from('vereine').select('*').eq('id', slug).single()
  if (!verein) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{verein.name}</h1>
            {(verein.city || verein.bundesland) && (
              <p className="text-gray-500 flex items-center gap-1 text-sm">
                <MapPin size={14} />
                {verein.plz && `${verein.plz} `}{verein.city && verein.city !== 'Unbekannt' ? verein.city : verein.bundesland}
              </p>
            )}
          </div>
          <WartelisteBadge status={verein.warteliste_status} />
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {verein.website && (
            <a href={verein.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 hover:border-green-300 transition-colors text-sm"
              style={{ color: 'var(--green-primary)' }}>
              <Globe size={15} /> Vereins-Website besuchen <ExternalLink size={12} className="ml-auto" />
            </a>
          )}
          {verein.phone && (
            <a href={`tel:${verein.phone}`}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors text-sm text-gray-700">
              <Phone size={15} /> {verein.phone}
            </a>
          )}
          {verein.email && (
            <a href={`mailto:${verein.email}`}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors text-sm text-gray-700">
              <Mail size={15} /> {verein.email}
            </a>
          )}
        </div>

        {!verein.website && !verein.phone && !verein.email && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 text-center">
            Noch keine Kontaktdaten verfügbar — direkt beim Verein anfragen.
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">Wartelisten-Status: {verein.warteliste_status ?? 'unbekannt'} · Zuletzt aktualisiert: {verein.last_updated ? new Date(verein.last_updated).toLocaleDateString('de-DE') : '—'}</p>
        </div>
      </div>
    </div>
  )
}
