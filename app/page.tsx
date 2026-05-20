import Link from 'next/link'
import { MapPin, Bell, ChevronRight, ArrowRight, Zap, Clock } from 'lucide-react'
import CitySearch from '@/components/CitySearch'
import AlertForm from '@/components/AlertForm'
import { CITIES } from '@/lib/cities'

const FEATURED_CITIES = CITIES.slice(0, 8)

const STATS = [
  { value: 'Täglich', label: 'neue Inserate aus 4 Quellen' },
  { value: 'Sofort', label: 'Direktlink zum Anbieter' },
  { value: '100%', label: 'kostenlos & ohne Anmeldung' },
  { value: 'Email-Alert', label: 'bei neuen Angeboten in deiner Stadt' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative py-20 md:py-32 px-4 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 60%, #40916c 100%)' }}
      >
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight">
            Deinen Kleingarten<br />
            <span style={{ color: '#95d5b2' }}>findest du hier.</span>
          </h1>
          <p className="text-green-200 text-lg md:text-xl mb-6 max-w-2xl mx-auto leading-relaxed">
            Nicht in 5 Jahren. Nicht auf einer Warteliste die sich nicht bewegt.<br className="hidden md:block" />
            Jetzt — mit echten Angeboten und offenen Wartelisten, jeden Tag aktualisiert.
          </p>

          {/* Two paths — prominent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-10">
            <Link
              href="/inserate"
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-sm transition-all hover:scale-105"
              style={{ backgroundColor: '#95d5b2', color: '#1b4332' }}
            >
              <Zap size={17} />
              Jetzt freie Parzelle finden
            </Link>
            <Link
              href="/wartelisten"
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-sm border-2 border-green-400/50 text-white hover:bg-green-800/40 transition-all"
            >
              <Clock size={17} />
              Offene Wartelisten
            </Link>
          </div>

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
              <div className="text-xl font-bold" style={{ color: 'var(--green-primary)' }}>{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Two paths explained */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">Zwei Wege zum eigenen Kleingarten</h2>
        <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
          Wir aggregieren täglich aktuelle Angebote — du entscheidest, welcher Weg für dich passt.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Path 1: Sofort übernehmen */}
          <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-7">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-xl"
              style={{ backgroundColor: 'var(--green-pale)' }}
            >
              ⚡
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sofort übernehmen</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-5">
              Pächter, die ihren Kleingarten abgeben, inserieren auf Kleinanzeigen, Quoka, Markt.de und Immowelt.
              Wir durchsuchen alle vier täglich und zeigen dir alle aktuellen Ablöse-Angebote auf einen Blick —
              mit Preis, Größe und Direktlink zum Anbieter.
            </p>
            <div className="space-y-2 mb-6">
              {['Sofortige Übernahme möglich', 'Preis & Größe direkt vergleichen', 'Kein Umweg — direkt zum Anbieter'].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <span style={{ color: 'var(--green-primary)' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link
              href="/inserate"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              Alle Inserate ansehen <ArrowRight size={15} />
            </Link>
          </div>

          {/* Path 2: Offene Warteliste */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-xl"
              style={{ backgroundColor: 'var(--green-pale)' }}
            >
              📋
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Offene Warteliste finden</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-5">
              Kein Inserat in deiner Stadt? Unser Crawler überprüft wöchentlich die Websites von tausenden
              Kleingartenvereinen und findet heraus, welche ihre Warteliste gerade geöffnet haben —
              mit Direktlink zur Bewerbungsseite des Vereins.
            </p>
            <div className="space-y-2 mb-6">
              {['Nur Vereine mit offener Warteliste', 'Direktlink zur Bewerbungsseite', 'Wöchentlich aktualisiert'].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <span style={{ color: 'var(--green-primary)' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link
              href="/wartelisten"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700"
            >
              Offene Wartelisten anzeigen <ArrowRight size={15} />
            </Link>
          </div>

        </div>
      </section>

      {/* City grid */}
      <section className="py-10 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nach Stadt suchen</h2>
              <p className="text-sm text-gray-400 mt-1">Inserate und offene Wartelisten in deiner Stadt</p>
            </div>
            <Link href="/inserate" className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: 'var(--green-primary)' }}>
              Alle Inserate <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_CITIES.map(city => (
              <Link
                key={city.slug}
                href={`/kleingarten-${city.slug}`}
                className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-800 transition-colors">{city.name}</h3>
                    <p className="text-xs text-gray-400">{city.bundesland}</p>
                  </div>
                  <MapPin size={16} className="text-gray-300 mt-0.5" />
                </div>
                {city.avg_abloese && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ø Ablöse</span>
                    <span className="font-medium text-gray-900">€{city.avg_abloese.toLocaleString('de-DE')}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Alert CTA */}
      <section className="py-16 px-4">
        <div
          className="max-w-2xl mx-auto rounded-3xl p-10 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' }}
        >
          <Bell size={32} className="mx-auto mb-4 text-green-300" />
          <h2 className="text-2xl font-bold mb-3">Kein Angebot verpassen</h2>
          <p className="text-green-200 mb-8 max-w-md mx-auto">
            Sobald in deiner Stadt ein neues Ablöse-Inserat erscheint, schicken wir dir eine E-Mail.
            Kostenlos, jederzeit abbestellbar.
          </p>
          <AlertForm variant="hero" />
        </div>
      </section>
    </>
  )
}
