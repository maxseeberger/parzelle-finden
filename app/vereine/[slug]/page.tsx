import { notFound } from 'next/navigation'
import { ExternalLink, Phone, Mail, MapPin, Users, Euro } from 'lucide-react'
import { MOCK_VEREINE } from '@/lib/mock-data'
import WartelisteBadge from '@/components/WartelisteBadge'

type Props = { params: Promise<{ slug: string }> }

export default async function VereinDetailPage({ params }: Props) {
  const { slug } = await params
  const verein = MOCK_VEREINE.find(v => v.id === slug)
  if (!verein) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{verein.name}</h1>
            <p className="text-gray-500 flex items-center gap-1">
              <MapPin size={14} /> {verein.address}, {verein.plz} {verein.city}
            </p>
          </div>
          <WartelisteBadge status={verein.warteliste_status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {verein.parzellen_anzahl && (
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--green-pale)' }}>
              <div className="text-xl font-bold" style={{ color: 'var(--green-primary)' }}>{verein.parzellen_anzahl}</div>
              <div className="text-xs text-gray-500 mt-1">Parzellen</div>
            </div>
          )}
          {verein.warteliste_laenge && (
            <div className="text-center p-4 rounded-xl bg-orange-50">
              <div className="text-xl font-bold text-orange-600">{verein.warteliste_laenge}</div>
              <div className="text-xs text-gray-500 mt-1">auf Warteliste</div>
            </div>
          )}
          {verein.jahresbeitrag && (
            <div className="text-center p-4 rounded-xl bg-blue-50">
              <div className="text-xl font-bold text-blue-600">€{verein.jahresbeitrag}</div>
              <div className="text-xs text-gray-500 mt-1">Jahresbeitrag</div>
            </div>
          )}
          <div className="text-center p-4 rounded-xl bg-gray-50">
            <div className="text-xl font-bold text-gray-600">{verein.bundesland}</div>
            <div className="text-xs text-gray-500 mt-1">Bundesland</div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h2 className="font-semibold text-gray-900">Kontakt</h2>
          {verein.website && (
            <a
              href={verein.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:underline"
              style={{ color: 'var(--green-primary)' }}
            >
              <ExternalLink size={15} /> {verein.website}
            </a>
          )}
          {verein.phone && (
            <a href={`tel:${verein.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <Phone size={15} /> {verein.phone}
            </a>
          )}
          {verein.email && (
            <a href={`mailto:${verein.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <Mail size={15} /> {verein.email}
            </a>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 text-xs text-gray-400">
          Daten zuletzt aktualisiert: {new Date(verein.last_updated).toLocaleDateString('de-DE')}
          {' · '}
          <a href="#" className="hover:underline">Fehler melden</a>
        </div>
      </div>
    </div>
  )
}
