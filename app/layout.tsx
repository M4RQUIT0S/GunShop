import type { Metadata } from 'next'
import { Tenor_Sans, Jost } from 'next/font/google'
import Script from 'next/script'
import '../css/tokens.css'
import '../css/base.css'
import '../css/catalog.css'
import '../css/shop.css'

// next/font descarga y auto-aloja: no hay peticion a Google en tiempo de
// ejecucion ni salto de linea al cargar la fuente. `latin-ext` es lo que trae
// los acentos y la ene. css/tokens.css referencia "Tenor Sans" y "Jost" por
// nombre literal (no por variable CSS): next/font conserva ese nombre en el
// @font-face que genera, asi que basta con aplicar `.variable` en <html>
// para que la hoja se incluya y ese nombre resuelva solo.
const display = Tenor_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  variable: '--fuente-display',
  display: 'swap',
})

const texto = Jost({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500'],
  variable: '--fuente-texto',
  display: 'swap',
})

/* De donde cuelgan las URL absolutas de Open Graph. Escrito a mano se queda
   apuntando al dominio de otro en cuanto cambia el proyecto, y el fallo es
   invisible: la pagina se ve bien y lo unico roto es la miniatura al
   compartirla por WhatsApp, que es justo el canal que el documento de alcance
   pone como principal. Vercel publica el dominio en el entorno. */
const dominio =
  process.env.NEXT_PUBLIC_SITIO ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(dominio),
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
        <Script id="clase-js" strategy="beforeInteractive">
          {"document.documentElement.className += ' js';"}
        </Script>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        {children}
      </body>
    </html>
  )
}
