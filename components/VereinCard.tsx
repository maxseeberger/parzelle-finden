import Link from 'next/link'
import { ExternalLink, Phone, Mail, MapPin, Users, Euro, List } from 'lucide-react'
import type { Verein } from '@/lib/supabase'
import WartelisteBadge from './WartelisteBadge'

export default function VereinCard({ verein }: { verein: Verein }) {
  const location = verein.city && verein.city !== 'Unbekannt'
    ? `${verein.plz ? verein.plz + ' ' : ''}${verein.city}`
    : verein.bundesland ?? ''

  const hasDetails = verein.parzellen_anzahl || verein.warteliste_laenge || verein.jahresbeitrag

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-green-200 hover:shadow-md transition-all">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{verein.name}</h3>
            {location && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <MapPin size={11} />
                {verein.address && verein.address !== 'Unbekannt' ? verein.address + ', ' : ''}
                {location}
              </p>
            )}
          </div>
          <WartelisteBadge status={verein.warteliste_status} />
        </div>
      </div>

      {/* Stats row */}
      {hasDetails && (
        <div className="px-5 pb-3 flex flex-wrap gap-4">
          {verein.parzellen_anzahl && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-green-50">
                <List size={12} style={{ color: 'var(--green-primary)' }} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{verein.parzellen_anzahl}</div>
                <div className="text-[10px] text-gray-400 leading-tight">Parzellen</div>
              </div>
            </div>
          )}
          {verein.warteliste_laenge != null && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-green-50">
                <Users size={12} style={{ color: 'var(--green-primary)' }} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{verein.warteliste_laenge}</div>
                <div className="text-[10px] text-gray-400 leading-tight">Warteliste</div>
              </div>
            </div>
          )}
          {verein.jahresbeitrag && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-green-50">
                <Euro size={12} style={{ color: 'var(--green-primary)' }} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">€{verein.jahresbeitrag.toLocaleString('de-DE')}</div>
                <div className="text-[10px] text-gray-400 leading-tight">Jahresbeitrag</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact + action */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {verein.website && (
            <a
              href={verein.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: 'var(--green-primary)' }}
            >
              <ExternalLink size={11} /> Website
            </a>
          )}
          {verein.phone && (
            <a
              href={`tel:${verein.phone}`}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Phone size={11} /> {verein.phone}
            </a>
          )}
          {verein.email && (
            <a
              href={`mailto:${verein.email}`}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Mail size={11} /> {verein.email}
            </a>
          )}
          {!verein.website && !verein.phone && !verein.email && (
            <span className="text-xs text-gray-300">Keine Kontaktdaten</span>
          )}
        </div>
        <Link
          href={`/vereine/${verein.id}`}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-100 text-gray-500 hover:border-green-300 hover:text-green-700 transition-colors whitespace-nowrap"
        >
          Mehr Details →
        </Link>
      </div>
    </div>
  )
}
