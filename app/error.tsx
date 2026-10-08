'use client'

import Link from 'next/link'
import PaginaAviso from './components/PaginaAviso'

/* Lo que se ve si una pagina revienta al leer Supabase (paso el 2026-10-04:
 * «fetch failed» en /). Sin esto salia la pagina de error generica de Next, en
 * ingles y sin salida. `retry()` es de Next 16: vuelve a pedir los datos del
 * segmento, no solo a pintar -- que es lo que hace falta si la base volvio.
 * Si lo que falla es el layout (Nav tambien lee la base), esto no alcanza:
 * para eso esta global-error.tsx. */
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <PaginaAviso eyebrow="Algo falló" titulo="No se pudo cargar esta página">
      <p>El catálogo no respondió. Suele ser pasajero.</p>
      <p className="aviso-pagina__acciones">
        <button className="btn" type="button" onClick={() => retry()}>Reintentar</button>
        <Link className="btn btn--ghost" href="/">Volver a la portada</Link>
      </p>
    </PaginaAviso>
  )
}
