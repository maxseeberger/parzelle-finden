import Link from 'next/link'
import { MapPin, Clock, Euro, Bell, ChevronRight, CheckCircle } from 'lucide-react'
import CitySearch from '@/components/CitySearch'
import AlertForm from '@/components/AlertForm'
import { CITIES } from '@/lib/cities'

const FEATURED_CITIES = CITIES.slice(0, 8)

const HOW_IT_WORKS = [
  {
    icon: MapPin,
    title: 'Stadt wählen',
    desc: 'Gib deine Stadt oder deinen Bezirk ein. Wir zeigen dir alle freien Parzellen und Vereine in deiner Nähe.',
  },
  {
    icon: Clock,
    title: 'Wartelisten vergleichen',
    desc: 'Sieh auf einen Blick welche Vereine ihre Warteliste geöffnet haben — und wie lang die Warteschlange ist.',
  },
  {
    icon: Euro,
    title: 'Ablöse verstehen',
    desc: 'Vergleiche Ablöse-Preise in deiner Stadt. Erkenne sofort ob ein Angebot fair ist oder überteuert.',
  },
  {
    icon: Bell,
    title: 'Alert setzen',
    desc: 'Lass dich benachrichtigen sobald in deiner Stadt ein Garten frei wird — nie wieder eine Chance verpassen.',
  },
]

const STATS = [
  { value: '6.200+', label: 'Kleingartenvereine erfasst' },
  { value: '900.000+', label: 'Kleingärten deutschlandweit' },
  { value: '5 Mio.', label: 'Menschen suchen einen Garten' },
  { value: '€2.800', label: 'Durchschnittliche Ablöse' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section
        id="suche"
        className="relative py-20 md:py-28 px-4 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 60%, #40916c 100%)' }}
      >
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-6 text-green-200 border border-green-700/50 bg-green-900/30">
            <CheckCircle size={13} />
            6.200+ Kleingartenvereine in Deutschland
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Deinen Kleingarten finden.<br />
            <span style={{ color: '#95d5b2' }}>Einfach. Vollständig. Kostenlos.</span>
          </h1>
          <p className="text-green-200 text-lg mb-10 max-w-xl mx-auto">
            Freie Parzellen, offene Wartelisten und Ablöse-Preise — alles auf einer Plattform. Für alle deutschen Städte.
          </p>
          <CitySearch />
          <p className="text-green-300/70 text-sm mt-4">
            Beliebte Städte:{' '}
            {['berlin', 'hamburg', 'muenchen', 'koeln', 'frankfurt'].map((slug, i, arr) => {
              const city = CITIES.find(c => c.slug === slug)
              return city ? (
                <span key={slug}>
                  <Link
                    href={`/kleingarten-${slug}`}
                    className="underline underline-offset-2 hover:text-green-200 transition-colors"
                  >
                    {city.name}
                  </Link>
                  {i < arr.length - 1 ? ', ' : ''}
                </span>
              ) : null
            })}
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(stat => (
            <div key={stat.label}>
              <div className="text-2xl font-bold" style={{ color: 'var(--green-primary)' }}>{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">So funktioniert parzelle-finden.de</h2>
        <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
          Wir aggregieren Daten aus hunderten Quellen, damit du nicht mehr selbst suchen musst.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--green-pale)' }}
              >
                <step.icon size={20} style={{ color: 'var(--green-primary)' }} />
              </div>
              <div className="text-xs font-medium text-gray-400 mb-1">Schritt {i + 1}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two paths CTA */}
      <section className="py-10 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/vereine" className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all">
            <div className="text-2xl mb-3">📋</div>
            <h3 className="font-bold text-gray-900 mb-1">Warteliste eintragen</h3>
            <p className="text-sm text-gray-500">Meld dich bei Vereinen mit offener Warteliste an — kostenlos und direkt.</p>
            <span className="inline-block mt-3 text-sm font-medium" style={{ color: 'var(--green-primary)' }}>Vereine durchsuchen →</span>
          </Link>
          <Link href="/#suche" className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all">
            <div className="text-2xl mb-3">🔍</div>
            <h3 className="font-bold text-gray-900 mb-1">Freie Parzelle finden</h3>
            <p className="text-sm text-gray-500">Suche nach freien Parzellen mit Ablöse — direkt von abgebenden Pächtern.</p>
            <span className="inline-block mt-3 text-sm font-medium" style={{ color: 'var(--green-primary)' }}>Stadt wählen →</span>
          </Link>
        </div>
      </section>

      {/* City grid */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Beliebte Städte</h2>
          <Link href="/vereine" className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: 'var(--green-primary)' }}>
            Alle Städte <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_CITIES.map(city => (
            <Link
              key={city.slug}
              href={`/kleingarten-${city.slug}`}
              className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-800 transition-colors">{city.name}</h3>
                  <p className="text-xs text-gray-400">{city.bundesland}</p>
                </div>
                <MapPin size={16} className="text-gray-300 mt-0.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vereine</span>
                  <span className="font-medium text-gray-900">{city.verein_count}+</span>
                </div>
                {city.avg_abloese && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ø Ablöse</span>
                    <span className="font-medium text-gray-900">€{city.avg_abloese.toLocaleString('de-DE')}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Alert CTA */}
      <section className="py-16 px-4">
        <div
          className="max-w-2xl mx-auto rounded-3xl p-10 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' }}
        >
          <Bell size={32} className="mx-auto mb-4 text-green-300" />
          <h2 className="text-2xl font-bold mb-3">Keine freie Parzelle verpassen</h2>
          <p className="text-green-200 mb-8 max-w-md mx-auto">
            Trag dich ein und wir benachrichtigen dich per E-Mail, sobald in deiner Stadt ein Garten verfügbar ist.
          </p>
          <AlertForm variant="hero" />
        </div>
      </section>
    </>
  )
}
