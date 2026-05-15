import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'

type Props = { params: Promise<{ slug: string }> }

const ARTICLE_CONTENT: Record<string, { title: string; readingTime: string; body: string }> = {
  warteliste: {
    title: 'Wie funktioniert eine Kleingarten-Warteliste?',
    readingTime: '5 min',
    body: `
## Was ist eine Kleingarten-Warteliste?

Eine Warteliste ist das offizielle Aufnahme-Instrument der meisten Kleingartenvereine. Wer einen Kleingarten will, meldet sich beim Verein an, wird auf die Liste gesetzt, und wartet bis eine Parzelle frei wird.

## Wie lange muss man warten?

Die Wartezeiten variieren stark:
- **Kleinstädte und ländliche Gebiete**: 6 Monate bis 2 Jahre
- **Großstädte (Hamburg, Frankfurt, München)**: 2–5 Jahre
- **Berlin (Innenstadtbezirke)**: 5–10 Jahre

## Wie meldest du dich an?

1. Verein finden (nutze unsere Suche)
2. Kontakt aufnehmen — per Mail, Telefon, oder persönlich beim Vereinsabend
3. Mitgliedsantrag ausfüllen und Aufnahmegebühr zahlen (meist €50–200)
4. Auf die Warteliste setzen lassen und Bestätigung erhalten

## Wichtige Regeln die du kennen musst

**Jährliche Bestätigung**: Viele Vereine verlangen, dass du dein Interesse jedes Jahr schriftlich bestätigst. Tust du das nicht, wirst du von der Liste gestrichen — ohne Vorwarnung.

**Mehrere Vereine**: Du darfst dich bei beliebig vielen Vereinen gleichzeitig auf die Warteliste setzen. Das ist nicht nur erlaubt, sondern empfohlen.

**Warteliste ≠ Mitgliedschaft**: In den meisten Vereinen musst du schon Mitglied sein um auf die Warteliste zu kommen — nicht erst wenn ein Garten frei wird.

## Was passiert wenn eine Parzelle frei wird?

Der Vorstand kontaktiert die nächste Person auf der Liste. Du hast dann meist 1–2 Wochen Zeit um die Parzelle zu besichtigen und dich zu entscheiden. Lehnst du ab, rutscht du in der Regel ans Ende der Liste.
    `.trim(),
  },
  abloese: {
    title: 'Was ist eine Ablöse beim Schrebergarten?',
    readingTime: '6 min',
    body: `
## Was ist eine Ablöse?

Die Ablöse ist eine Zahlung an den **bisherigen Pächter** — nicht an den Verein, nicht an den Grundstückseigentümer. Du bezahlst für die Investitionen die der Vorpächter in den Garten gesteckt hat: die Laube, Bepflanzungen, Wege, Gewächshäuser, Zäune.

## Was du NICHT kaufst

Du kaufst **nicht** das Land. Das bleibt Eigentum der Gemeinde oder des Verbandes. Du bezahlst nur für bewegliche und bauliche Verbesserungen.

## Wie hoch ist die Ablöse?

Die Ablöse variiert stark je nach Stadt und Zustand:

| Stadt | Durchschnitt | Spanne |
|-------|-------------|--------|
| München | €3.800 | €1.500 – €9.000 |
| Hamburg | €3.200 | €1.200 – €7.500 |
| Berlin | €2.500 | €800 – €6.000 |
| Köln | €2.400 | €600 – €5.500 |

## Was ist eine faire Ablöse?

Eine faire Ablöse orientiert sich am **Zeitwert** der Investitionen — nicht am Marktwert. Ein Gutachter des Vereins oder Verbandes kann den Wert schätzen. Viele Vereine haben dafür eigene Regelungen.

**Warnsignale für überhöhte Ablöse**:
- Der Preis ist deutlich höher als der lokale Durchschnitt
- Der Verkäufer drängt und gibt keine Zeit zur Prüfung
- Es gibt keinen schriftlichen Vertrag

## Rechtliche Einschränkungen

Das Bundeskleingartengesetz setzt der Ablöse Grenzen: Sie darf den Zeitwert der Investitionen nicht wesentlich übersteigen. Formal hat der Verein ein Mitspracherecht bei der Höhe — in der Praxis wird das oft nicht durchgesetzt.
    `.trim(),
  },
}

export async function generateStaticParams() {
  return Object.keys(ARTICLE_CONTENT).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = ARTICLE_CONTENT[slug]
  if (!article) return {}
  return { title: `${article.title} — parzelle-finden.de` }
}

export default async function RatgeberArticlePage({ params }: Props) {
  const { slug } = await params
  const article = ARTICLE_CONTENT[slug]
  if (!article) notFound()

  const paragraphs = article.body.split('\n\n')

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/ratgeber" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-8">
        <ArrowLeft size={14} /> Alle Ratgeber-Artikel
      </Link>
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{article.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            <span>Lesezeit: {article.readingTime}</span>
            <span>·</span>
            <span>parzelle-finden.de Ratgeber</span>
          </div>
        </header>
        <div className="prose prose-gray prose-sm md:prose-base max-w-none">
          {paragraphs.map((para, i) => {
            if (para.startsWith('## ')) {
              return <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">{para.replace('## ', '')}</h2>
            }
            if (para.startsWith('| ')) {
              return (
                <div key={i} className="overflow-x-auto my-4">
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {para.split('\n').filter(r => !r.match(/^[\|\s\-]+$/)).map((row, j) => {
                        const cells = row.split('|').filter(Boolean).map(c => c.trim())
                        return (
                          <tr key={j} className={j === 0 ? 'bg-gray-50 font-medium' : 'border-t border-gray-100'}>
                            {cells.map((cell, k) => (
                              <td key={k} className="px-3 py-2 text-gray-700">{cell}</td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
            if (para.startsWith('- ') || para.includes('\n- ')) {
              const items = para.split('\n').filter(l => l.startsWith('- '))
              return (
                <ul key={i} className="list-disc list-inside space-y-1 my-3 text-gray-600">
                  {items.map((item, j) => <li key={j}>{item.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>)}
                </ul>
              )
            }
            return <p key={i} className="text-gray-600 leading-relaxed my-3"
              dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          })}
        </div>
      </article>
    </div>
  )
}
