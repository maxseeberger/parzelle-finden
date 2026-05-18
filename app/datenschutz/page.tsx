import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung — parzelle-finden.de',
  description: 'Datenschutzerklärung gemäß DSGVO für parzelle-finden.de',
  robots: { index: false },
}

export default function DatenschutzPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700">
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">1. Datenschutz auf einen Blick</h2>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen
            Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit
            denen Sie persönlich identifiziert werden können.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">2. Verantwortlicher</h2>
          <p>
            Verantwortlicher für die Datenverarbeitung auf dieser Website ist:<br /><br />
            Max Seeberger<br />
            Fischackerweg 5A<br />
            82335 Berg<br />
            E-Mail: <a href="mailto:hallo@parzelle-finden.de" className="text-green-700 hover:underline">hallo@parzelle-finden.de</a>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">3. Datenerfassung auf dieser Website</h2>

          <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1">Hosting</h3>
          <p>
            Diese Website wird bei Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, USA) gehostet.
            Details entnehmen Sie der Datenschutzerklärung von Vercel:
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline ml-1">
              vercel.com/legal/privacy-policy
            </a>
          </p>

          <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1">Server-Log-Dateien</h3>
          <p>
            Der Hosting-Anbieter erhebt und speichert automatisch Informationen in Server-Log-Dateien,
            die Ihr Browser automatisch übermittelt. Dies sind: Browsertyp und -version, verwendetes
            Betriebssystem, Referrer-URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage
            und IP-Adresse. Diese Daten werden nicht mit anderen Datenquellen zusammengeführt.
          </p>

          <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1">E-Mail-Alerts (Benachrichtigungen)</h3>
          <p>
            Wenn Sie sich für E-Mail-Benachrichtigungen anmelden, speichern wir Ihre E-Mail-Adresse
            ausschließlich zum Zweck der Benachrichtigung über neue Kleingarten-Inserate in Ihrer
            gewünschten Stadt. Die E-Mail-Adresse wird nicht an Dritte weitergegeben. Sie können
            sich jederzeit abmelden. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">4. Datenbank</h2>
          <p>
            Listing- und Vereinsdaten werden in einer Datenbank bei Supabase (San Francisco, CA, USA)
            gespeichert. Dabei handelt es sich ausschließlich um öffentlich zugängliche Inseratsdaten
            (Titel, Preis, Ort) — keine personenbezogenen Daten der Nutzer dieser Website.
            Details: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">supabase.com/privacy</a>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">5. Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft über Ihre gespeicherten personenbezogenen Daten, das Recht
            auf Berichtigung, Löschung oder Einschränkung der Verarbeitung sowie das Recht auf
            Datenübertragbarkeit. Wenden Sie sich dazu an:
            <a href="mailto:hallo@parzelle-finden.de" className="text-green-700 hover:underline ml-1">hallo@parzelle-finden.de</a>
          </p>
          <p className="mt-2">
            Sie haben zudem das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren.
          </p>
        </section>

        <p className="text-xs text-gray-400 mt-8">Stand: Mai 2026</p>
      </div>
    </div>
  )
}
