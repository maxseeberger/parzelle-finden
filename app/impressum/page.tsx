import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum — parzelle-finden.de',
  description: 'Impressum und Anbieterkennzeichnung gemäß § 5 TMG für parzelle-finden.de',
  robots: { index: false },
}

export default function ImpressumPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Impressum</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700">
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            Max Seeberger<br />
            [Straße und Hausnummer]<br />
            [PLZ Ort]<br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Kontakt</h2>
          <p>
            E-Mail: <a href="mailto:hallo@parzelle-finden.de" className="text-green-700 hover:underline">hallo@parzelle-finden.de</a>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
          <p>
            Max Seeberger<br />
            [Straße und Hausnummer]<br />
            [PLZ Ort]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Haftungsausschluss</h2>
          <p>
            Die Inhalte dieser Website werden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit,
            Vollständigkeit und Aktualität der Inhalte übernehmen wir jedoch keine Gewähr. Als Diensteanbieter
            sind wir für eigene Inhalte nach § 7 Abs. 1 TMG verantwortlich. Wir sind nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen.
          </p>
          <p className="mt-2">
            Die auf dieser Website angezeigten Inserate und Vereinsdaten stammen aus öffentlich zugänglichen
            Quellen. Für deren Richtigkeit, Vollständigkeit und Aktualität wird keine Haftung übernommen.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Urheberrecht</h2>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
            deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung
            des jeweiligen Autors bzw. Erstellers.
          </p>
        </section>
      </div>
    </div>
  )
}
