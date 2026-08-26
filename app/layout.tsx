import type { Metadata } from 'next'
import { Cormorant, Montserrat } from 'next/font/google'
import './globals.css'

// next/font descarga y auto-aloja: no hay peticion a Google en tiempo de
// ejecucion ni salto de linea al cargar la fuente. `latin-ext` es lo que trae
// los acentos y la ene.
const display = Cormorant({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--fuente-display',
  display: 'swap',
})

const texto = Montserrat({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--fuente-texto',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://armeria-alcantara.vercel.app'),
  title: {
    default: 'Alcántara · Armería de tiro deportivo y caza',
    template: '%s · Alcántara',
  },
  description:
    'Armería habilitada ANMaC en Buenos Aires. Rifles, escopetas, pistolas, ' +
    'óptica y munición para tiro deportivo y caza, con taller propio.',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Armería Alcántara',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${display.variable} ${texto.variable}`}>
      <body>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        {children}
      </body>
    </html>
  )
}
