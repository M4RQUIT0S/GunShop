'use client'

import '../css/tokens.css'
import '../css/base.css'

/* Si falla el propio layout -- Nav lee las subcategorias de Supabase en cada
 * pagina, asi que una caida de la base cae aqui y no en error.tsx --, Next
 * sustituye el documento entero por esto: sin cabecera, sin pie, sin las
 * fuentes de next/font (quedan las de reserva de tokens.css). Lleva su propio
 * <html> y las dos hojas que dan el lienzo negro. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es-AR">
      <body>
        <title>No se pudo cargar · Alcántara</title>
        <main className="section">
          <div className="wrap legal aviso-pagina">
            <p className="eyebrow">Algo falló</p>
            <h1 className="h-section">No se pudo cargar la tienda</h1>
            <p>El catálogo no respondió. Suele ser pasajero.</p>
            <p className="aviso-pagina__acciones">
              <button className="btn" type="button" onClick={() => retry()}>Reintentar</button>
              {/* <a> y no <Link>: aqui no hay router montado en el que confiar. */}
              <a className="btn btn--ghost" href="/">Volver a la portada</a>
            </p>
          </div>
        </main>
      </body>
    </html>
  )
}
