import Link from 'next/link'
import { ExternalLink, Phone, MapPin } from 'lucide-react'
import type { Verein } from '@/lib/supabase'
import WartelisteBadge from './WartelisteBadge'

export default function VereinCard({ verein }: { verein: Verein }) {
  const hasContact = verein.website || verein.phone || verein.email
  const location = verein.city && verein.city !== 'Unbekannt'
    ? `${verein.plz ? verein.plz + ' ' : ''}${verein.city}`
    : verein.bundesland ?? ''

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{verein.name}</h3>
          {location && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin size={11} />{location}
            </p>
          )}
        </div>
        <WartelisteBadge status={verein.warteliste_status} />
      </div>

      {hasContact && (
        <div className="flex flex-wrap gap-3 text-xs">
          {verein.website && (
            <a href={verein.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium hover:underline"
              style={{ color: 'var(--green-primary)' }}>
              Website <ExternalLink size={10} />
            </a>
          )}
          {verein.phone && (
            <a href={`tel:${verein.phone}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
              <Phone size={10} /> {verein.phone}
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <span className="text-xs text-gray-300">
          {verein.warteliste_status === 'offen' ? '🟢 Warteliste offen' :
           verein.warteliste_status === 'geschlossen' ? '🔴 Warteliste geschlossen' :
           '⚪ Status unbekannt'}
        </span>
        <Link href={`/vereine/${verein.id}`} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          Details →
        </Link>
      </div>
    </div>
  )
}
