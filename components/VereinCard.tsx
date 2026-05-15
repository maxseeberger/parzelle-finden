import Link from 'next/link'
import { Users, ExternalLink, Phone } from 'lucide-react'
import type { Verein } from '@/lib/supabase'
import WartelisteBadge from './WartelisteBadge'

export default function VereinCard({ verein }: { verein: Verein }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{verein.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{verein.address}, {verein.plz} {verein.city}</p>
        </div>
        <WartelisteBadge status={verein.warteliste_status} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {verein.parzellen_anzahl && (
          <span className="flex items-center gap-1">
            <Users size={12} />
            {verein.parzellen_anzahl} Parzellen
          </span>
        )}
        {verein.warteliste_laenge && (
          <span>{verein.warteliste_laenge} auf Warteliste</span>
        )}
        {verein.jahresbeitrag && (
          <span>€{verein.jahresbeitrag}/Jahr</span>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
        {verein.website && (
          <a
            href={verein.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: 'var(--green-primary)' }}
          >
            Website <ExternalLink size={11} />
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
        <Link
          href={`/vereine/${verein.id}`}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600"
        >
          Details →
        </Link>
      </div>
    </div>
  )
}
