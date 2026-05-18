import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MapPin, TrendingUp, Users, Bell } from 'lucide-react'
import { getCityBySlug, CITIES } from '@/lib/cities'
import { supabase } from '@/lib/supabase'
import type { Listing, Verein } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import VereinCard from '@/components/VereinCard'
import WartelisteBadge from '@/components/WartelisteBadge'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return CITIES.map(city => ({ slug: city.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const city = getCityBySlug(slug)
  if (!city) return {}
  return {
    title: `Kleingarten ${city.name} » Freie Parzellen, Wartelisten & Ablöse 2026`,
    description: `Freie Kleingarten-Parzellen in ${city.name} finden. ${city.verein_count} Vereine, ${city.listing_count} aktuelle Inserate, Ø Ablöse €${city.avg_abloese?.toLocaleString('de-DE')}. Wartelisten-Status auf einen Blick.`,
  }
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params
  const city = getCityBySlug(slug)
  if (!city) notFound()

  const [{ data: listingsData }, { data: vereineData }] = await Promise.all([
    supabase.from('listings').select('*').ilike('city', `%${city.name}%`).eq('active', true).order('posted_at', { ascending: false }).limit(20),
    supabase.from('vereine').select('*').eq('bundesland', city.bundesland).order('warteliste_status', { ascending: true }).limit(50),
  ])

  const cityListings: Listing[] = listingsData ?? []
  const cityVereine: Verein[] = vereineData ?? []
  const offeneVereine = cityVereine.filter(v => v.warteliste_status === 'offen')

  return (
    <>
      {/* Page header */}
      <section className="bg-white border-b border-gray-100 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <MapPin size={14} />
            <span>{city.bundesland}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Kleingarten {city.name} finden
          </h1>
          <p className="text-gray-500 text-lg mb-6">
            Freie Parzellen, Vereins-Wartelisten & Ablöse-Preise — alles auf einen Blick
          </p>
          <div className="flex flex-wrap gap-6">
            {cityListings.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--green-pale)' }}>
                  <MapPin size={15} style={{ color: 'var(--green-primary)' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{cityListings.length} Inserate</div>
                  <div className="text-xs text-gray-400">aktuell aktiv</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--green-pale)' }}>
                <Users size={15} style={{ color: 'var(--green-primary)' }} />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{cityVereine.length} Vereine</div>
                <div className="text-xs text-gray-400">in {city.bundesland}</div>
              </div>
            </div>
            {city.avg_abloese && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--green-pale)' }}>
                  <TrendingUp size={15} style={{ color: 'var(--green-primary)' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Ø €{city.avg_abloese.toLocaleString('de-DE')}</div>
                  <div className="text-xs text-gray-400">Ablöse-Durchschnitt</div>
                </div>
              </div>
            )}
            {offeneVereine.length > 0 && (
              <div className="flex items-center gap-2">
                <WartelisteBadge status="offen" />
                <span className="text-sm text-gray-500">{offeneVereine.length} Vereine nehmen auf</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-10">

          {/* Listings */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Aktuelle Inserate — Kleingarten {city.name}
            </h2>
            {cityListings.length > 0 ? (
              <div className="space-y-3">
                {cityListings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
                <p className="mb-2 font-medium">Noch keine direkten Inserate für {city.name}</p>
                <p className="text-sm">Setz einen Alert — wir benachrichtigen dich sobald etwas frei wird.</p>
              </div>
            )}
          </section>

          {/* Vereine */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Kleingartenvereine in {city.name}
            </h2>
            {cityVereine.length > 0 ? (
              <div className="space-y-3">
                {cityVereine.map(verein => (
                  <VereinCard key={verein.id} verein={verein} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Vereinsdaten werden geladen…</p>
            )}
          </section>

          {/* SEO text block */}
          <section className="prose prose-sm prose-gray max-w-none">
            <h2>Kleingarten {city.name} — was du wissen musst</h2>
            <p>
              In {city.name} gibt es {city.verein_count} Kleingartenvereine mit insgesamt tausenden Parzellen.
              Die durchschnittliche Ablöse liegt bei <strong>€{city.avg_abloese?.toLocaleString('de-DE')}</strong> —
              allerdings mit großen Unterschieden je nach Lage, Größe und Zustand der Laube.
            </p>
            <p>
              Wer einen Kleingarten in {city.name} sucht, hat grundsätzlich drei Wege:
              über die offizielle <strong>Warteliste</strong> eines Vereins, über eine <strong>Ablöse</strong> von
              einem abgebenden Pächter, oder über eine Direktvergabe des Vereins bei freistehenden Parzellen.
            </p>
            <p>
              Tipp: Meld dich bei mehreren Vereinen gleichzeitig auf der Warteliste an — das ist erlaubt und
              erhöht deine Chancen erheblich. Vereine mit offener Warteliste erkennst du an dem grünen Badge oben.
            </p>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Alert box */}
          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, #1b4332, #2d6a4f)' }}
          >
            <Bell size={20} className="text-green-300 mb-3" />
            <h3 className="font-semibold mb-2">Alert für {city.name}</h3>
            <p className="text-green-200 text-xs mb-4">
              Sofort benachrichtigt werden wenn in {city.name} eine Parzelle frei wird.
            </p>
            <form className="space-y-2">
              <input
                type="email"
                placeholder="deine@email.de"
                className="w-full px-3 py-2.5 rounded-xl text-gray-900 bg-white text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-medium text-green-900 bg-green-300 hover:bg-green-200 transition-colors text-sm"
              >
                Alert setzen
              </button>
            </form>
          </div>

          {/* Ablöse info */}
          {city.avg_abloese && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Ablöse-Preise {city.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Durchschnitt</span>
                  <span className="font-semibold">€{city.avg_abloese.toLocaleString('de-DE')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Günstig (Handwerkerobjekt)</span>
                  <span className="text-gray-700">ab €300</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Premium (top Lage)</span>
                  <span className="text-gray-700">bis €{(city.avg_abloese * 2.5).toLocaleString('de-DE')}</span>
                </div>
              </div>
              <a
                href="/ratgeber/abloese"
                className="block mt-4 text-xs font-medium hover:underline"
                style={{ color: 'var(--green-primary)' }}
              >
                Was ist eine faire Ablöse? →
              </a>
            </div>
          )}

          {/* Quick tips */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Schnell-Tipps</h3>
            <ul className="space-y-2 text-xs text-gray-500">
              <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Bei mehreren Vereinen gleichzeitig bewerben</li>
              <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Warteliste jährlich bestätigen</li>
              <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Handwerkerobjekte = günstigste Option</li>
              <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Ablöse vor Vertragsschluss prüfen lassen</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  )
}
