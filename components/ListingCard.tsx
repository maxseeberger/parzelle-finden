import { ExternalLink, Maximize2, Euro, Calendar } from 'lucide-react'
import type { Listing } from '@/lib/supabase'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function sourceLabel(source: Listing['source']) {
  if (source === 'kleinanzeigen') return 'Kleinanzeigen'
  if (source === 'verein') return 'Direkt vom Verein'
  return 'Manuell'
}

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">{listing.title}</h3>
        <span className="text-xs text-gray-400 shrink-0 mt-0.5">{sourceLabel(listing.source)}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {listing.price_abloese !== undefined && listing.price_abloese !== null && (
          <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--green-primary)' }}>
            <Euro size={14} />
            {listing.price_abloese === 0 ? 'Kostenlos' : `${listing.price_abloese.toLocaleString('de-DE')} Ablöse`}
          </span>
        )}
        {listing.size_sqm && (
          <span className="flex items-center gap-1 text-gray-500">
            <Maximize2 size={13} />
            {listing.size_sqm} m²
          </span>
        )}
      </div>
      {listing.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{listing.description}</p>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar size={12} />
          {formatDate(listing.posted_at)}
        </span>
        {listing.contact_url && (
          <a
            href={listing.contact_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: 'var(--green-primary)' }}
          >
            Kontakt <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  )
}
