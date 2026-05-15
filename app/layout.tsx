import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Parzelle Finden — Kleingarten & Schrebergarten in Deutschland',
  description: 'Freie Parzellen, Vereins-Wartelisten und Ablöse-Preise für alle deutschen Städte. Der einfachste Weg zum eigenen Kleingarten.',
  metadataBase: new URL('https://parzelle-finden.de'),
  openGraph: {
    siteName: 'parzelle-finden.de',
    locale: 'de_DE',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
