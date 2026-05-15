import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kleingarten Ratgeber — Warteliste, Ablöse & Bundeskleingartengesetz',
  description: 'Alles was du über Kleingärten wissen musst: Wartelisten, Ablöse, Kosten, Bundeskleingartengesetz und mehr.',
}

const ARTICLES = [
  {
    slug: 'warteliste',
    title: 'Wie funktioniert eine Kleingarten-Warteliste?',
    excerpt: 'Wartelisten sind der häufigste Weg zu einem Kleingarten — aber wie meldest du dich an, wie lange wartest du, und was musst du beachten?',
    readingTime: '5 min',
    category: 'Bewerbung',
  },
  {
    slug: 'abloese',
    title: 'Was ist eine Ablöse beim Schrebergarten?',
    excerpt: 'Die Ablöse ist keine Miete und kein Kaufpreis — aber sie kann trotzdem tausende Euro kosten. Was ist fair, was ist Wucher?',
    readingTime: '6 min',
    category: 'Ablöse',
  },
  {
    slug: 'bundeskleingartengesetz',
    title: 'Bundeskleingartengesetz einfach erklärt',
    excerpt: 'Das BKleingG regelt alles: Pachtpreise, Laubengrößen, Anbauvorschriften. Die wichtigsten Paragrafen in einfacher Sprache.',
    readingTime: '8 min',
    category: 'Recht',
  },
  {
    slug: 'kosten',
    title: 'Kleingarten Kosten: Was zahlt man wirklich?',
    excerpt: 'Ablöse, Jahresbeitrag, Pacht, Laube — eine realistische Kostenübersicht damit es keine bösen Überraschungen gibt.',
    readingTime: '5 min',
    category: 'Kosten',
  },
  {
    slug: 'ohne-warteliste',
    title: 'Kleingarten ohne Warteliste finden — 5 Wege',
    excerpt: 'Wartelisten von 10 Jahren schrecken ab. Aber es gibt Wege zu einem Kleingarten ohne lange Wartezeit.',
    readingTime: '4 min',
    category: 'Tipps',
  },
  {
    slug: 'uebernehmen',
    title: 'Schrebergarten übernehmen: Schritt für Schritt',
    excerpt: 'Du hast eine Parzelle gefunden. Jetzt kommt der Papierkram. Was musst du beim Übernahme-Prozess beachten?',
    readingTime: '7 min',
    category: 'Übernahme',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Bewerbung: 'bg-blue-100 text-blue-700',
  Ablöse: 'bg-orange-100 text-orange-700',
  Recht: 'bg-purple-100 text-purple-700',
  Kosten: 'bg-red-100 text-red-700',
  Tipps: 'bg-green-100 text-green-700',
  Übernahme: 'bg-yellow-100 text-yellow-700',
}

export default function RatgeberPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kleingarten Ratgeber</h1>
        <p className="text-gray-500">Alles was du über Kleingärten wissen musst — von der Bewerbung bis zur Übernahme.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ARTICLES.map(article => (
          <Link
            key={article.slug}
            href={`/ratgeber/${article.slug}`}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[article.category]}`}>
                {article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} /> {article.readingTime}
              </span>
            </div>
            <h2 className="font-semibold text-gray-900 mb-2 group-hover:text-green-800 transition-colors leading-snug">
              {article.title}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">{article.excerpt}</p>
            <div className="mt-4 text-xs font-medium" style={{ color: 'var(--green-primary)' }}>
              Artikel lesen →
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
