import type { NextConfig } from 'next'

/* Solo cabeceras de seguridad (UX-AUDIT.md, B3): en produccion no salia mas
 * que Strict-Transport-Security, que pone Vercel. Las tres que faltaban y no
 * pueden romper nada:
 *
 *   - frame-ancestors 'none': nadie puede meter la tienda en un <iframe> para
 *     superponerle botones falsos. Va como CSP de una sola directiva a
 *     proposito: una CSP completa (script-src...) choca con los scripts en
 *     linea de Next si no se monta con nonce, y eso es otro trabajo.
 *   - nosniff: el navegador no adivina tipos; un fichero se ejecuta como lo
 *     que dice ser o no se ejecuta.
 *   - Referrer-Policy: a otro sitio solo le llega el dominio, no la URL con
 *     la busqueda o los filtros puestos. */
const nextConfig: NextConfig = {
  headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
