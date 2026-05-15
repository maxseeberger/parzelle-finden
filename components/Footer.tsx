import Link from 'next/link'
import { Sprout } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold mb-3">
              <Sprout size={18} style={{ color: 'var(--green-light)' }} />
              parzelle-finden.de
            </div>
            <p className="text-sm leading-relaxed">
              Der einfachste Weg zum eigenen Kleingarten. Freie Parzellen, Vereins-Wartelisten und Ablöse-Preise auf einen Blick.
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-3">Suchen</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/kleingarten-berlin" className="hover:text-white transition-colors">Kleingarten Berlin</Link></li>
              <li><Link href="/kleingarten-hamburg" className="hover:text-white transition-colors">Kleingarten Hamburg</Link></li>
              <li><Link href="/kleingarten-muenchen" className="hover:text-white transition-colors">Kleingarten München</Link></li>
              <li><Link href="/kleingarten-koeln" className="hover:text-white transition-colors">Kleingarten Köln</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-3">Ratgeber</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/ratgeber/warteliste" className="hover:text-white transition-colors">Wie funktioniert eine Warteliste?</Link></li>
              <li><Link href="/ratgeber/abloese" className="hover:text-white transition-colors">Was ist eine Ablöse?</Link></li>
              <li><Link href="/ratgeber/bundeskleingartengesetz" className="hover:text-white transition-colors">Bundeskleingartengesetz</Link></li>
              <li><Link href="/ratgeber/kosten" className="hover:text-white transition-colors">Was kostet ein Kleingarten?</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-medium mb-3">Vereine</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/vereine" className="hover:text-white transition-colors">Vereins-Verzeichnis</Link></li>
              <li><Link href="/warteliste" className="hover:text-white transition-colors">Warteliste eintragen</Link></li>
              <li><Link href="/abloese" className="hover:text-white transition-colors">Ablöse verstehen</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p>© 2026 parzelle-finden.de — Kein Rechtsanspruch auf Richtigkeit der Daten. Alle Angaben ohne Gewähr.</p>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
