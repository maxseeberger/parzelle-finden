import { ExternalLink, Maximize2, MapPin } from 'lucide-react'
import type { Listing } from '@/lib/supabase'

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'heute'
  if (days === 1) return 'gestern'
  return `vor ${days} Tagen`
}

function sourceLabel(source: Listing['source']): string {
  if (source === 'kleinanzeigen') return 'Kleinanzeigen'
  if (source === 'quoka') return 'Quoka'
  if (source === 'markt') return 'Markt.de'
  return 'Immowelt'
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const hasPrice = listing.price_abloese != null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      {/* Top row: title + source badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">{listing.title}</h3>
        <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          {sourceLabel(listing.source)}
        </span>
      </div>

      {/* Price + size badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {hasPrice ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-white px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--green-primary)' }}>
            {listing.price_abloese === 0
              ? 'Kostenlos'
              : `${listing.price_abloese!.toLocaleString('de-DE')} € Ablöse`}
          </span>
        ) : (
          <span className="inline-flex items-center text-sm text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg">
            Preis auf Anfrage
          </span>
        )}
        {listing.size_sqm && (
          <span className="inline-flex items-center gap-1 text-sm text-gray-600 bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg">
            <Maximize2 size={13} />
            {listing.size_sqm} m²
          </span>
        )}
      </div>

      {/* Location */}
      {(listing.city || listing.plz) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <MapPin size={12} />
          <span>{listing.plz ? `${listing.plz} ` : ''}{listing.city}</span>
        </div>
      )}

      {/* Description snippet */}
      {listing.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{listing.description}</p>
      )}

      {/* Footer: date + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 gap-3">
        <span className="text-xs text-gray-400">{daysAgo(listing.posted_at)}</span>
        {listing.contact_url && (
          <a
            href={listing.contact_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            Zur Anzeige <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  )
}
