import Link from 'next/link'
import { Sprout } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg" style={{ color: 'var(--green-primary)' }}>
          <Sprout size={22} />
          parzelle-finden.de
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/vereine" className="hover:text-gray-900 transition-colors">Vereine</Link>
          <Link href="/inserate" className="hover:text-gray-900 transition-colors">Inserate</Link>
          <Link href="/ratgeber" className="hover:text-gray-900 transition-colors">Ratgeber</Link>
        </nav>
        <Link
          href="/#suche"
          className="text-sm font-medium text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          Garten finden
        </Link>
      </div>
    </header>
  )
}
