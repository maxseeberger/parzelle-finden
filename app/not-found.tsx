import Link from 'next/link'
import { Sprout, Home, Search } from 'lucide-react'
import { CITIES } from '@/lib/cities'

export default function NotFound() {
  const cities = CITIES.slice(0, 6)
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--green-pale)' }}>
        <Sprout size={32} style={{ color: 'var(--green-primary)' }} />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Seite nicht gefunden</h1>
      <p className="text-gray-500 text-lg mb-8 max-w-md">
        Diese Seite gibt es leider nicht. Vielleicht suchst du einen Kleingarten in einer dieser Städte?
      </p>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {cities.map(city => (
          <Link
            key={city.slug}
            href={`/city/${city.slug}`}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-600 transition-colors"
          >
            {city.name}
          </Link>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          <Home size={15} />
          Zur Startseite
        </Link>
        <Link
          href="/#suche"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-400 transition-colors"
        >
          <Search size={15} />
          Stadt suchen
        </Link>
      </div>
    </div>
  )
}
