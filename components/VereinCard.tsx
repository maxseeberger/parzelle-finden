'use client'

import { useState } from 'react'
import { ExternalLink, Phone, Mail, MapPin, Users, Euro, List, ChevronDown, ChevronUp } from 'lucide-react'
import type { Verein } from '@/lib/supabase'
import WartelisteBadge from './WartelisteBadge'

interface VereinCardProps {
  verein: Verein
  distanceKm?: number
}

export default function VereinCard({ verein, distanceKm }: VereinCardProps) {
  const [expanded, setExpanded] = useState(false)

  const location = verein.city && verein.city !== 'Unbekannt'
    ? `${verein.plz ? verein.plz + ' ' : ''}${verein.city}`
    : verein.bundesland ?? ''

  const hasDetails = verein.parzellen_anzahl || verein.warteliste_laenge != null || verein.jahresbeitrag

  function formatDistance(km: number): string {
    return km.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km'
  }

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-green-200 hover:shadow-md transition-all cursor-pointer select-none"
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{verein.name}</h3>
            {location && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <MapPin size={11} />
                {location}
                {distanceKm != null && (
                  <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                    {formatDistance(distanceKm)}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <WartelisteBadge status={verein.warteliste_status} />
            {expanded
              ? <ChevronUp size={16} className="text-gray-400" />
              : <ChevronDown size={16} className="text-gray-400" />
            }
          </div>
        </div>
      </div>

      {/* Stats pills */}
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

      {/* Collapsed contact strip */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-3 flex-wrap" onClick={e => e.stopPropagation()}>
        {verein.warteliste_url && verein.warteliste_status === 'offen' && (
          <a
            href={verein.warteliste_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            Jetzt bewerben →
          </a>
        )}
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
        {!verein.warteliste_url && !verein.website && !verein.phone && !verein.email && !expanded && (
          <span className="text-xs text-gray-300">Keine Kontaktdaten</span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-2" onClick={e => e.stopPropagation()}>
          {verein.address && verein.address !== 'Unbekannt' && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin size={12} className="mt-0.5 shrink-0 text-gray-400" />
              <span>{verein.address}{location ? ', ' + location : ''}</span>
            </div>
          )}
          {verein.email && (
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-gray-400 shrink-0" />
              <a
                href={`mailto:${verein.email}`}
                className="text-xs text-gray-600 hover:text-gray-900 hover:underline break-all"
              >
                {verein.email}
              </a>
            </div>
          )}
          {verein.phone && (
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-gray-400 shrink-0" />
              <a
                href={`tel:${verein.phone}`}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                {verein.phone}
              </a>
            </div>
          )}
          {verein.bundesland && (
            <p className="text-xs text-gray-400">{verein.bundesland}</p>
          )}
          {!verein.address && !verein.email && !verein.phone && (
            <p className="text-xs text-gray-300">Keine weiteren Informationen verfügbar.</p>
          )}
        </div>
      )}
    </div>
  )
}
