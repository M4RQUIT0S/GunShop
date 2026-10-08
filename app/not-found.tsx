import type { Metadata } from 'next'
import Link from 'next/link'
import PaginaAviso from './components/PaginaAviso'

/* La de Next salia en ingles («This page could not be found.») y sin camino
 * de vuelta. Aqui acaban la ruta mal escrita y la ficha que ya no existe --
 * una referencia descatalogada la oculta la RLS (`discontinued_at`), asi que un
 * enlace compartido a ella da 404 (UX-AUDIT.md, P5). */

export const metadata: Metadata = { title: 'Página no encontrada' }

export default function NoEncontrada() {
  return (
    <PaginaAviso eyebrow="Error 404" titulo="Esta página no existe">
      <p>
        Puede que la referencia haya salido del catálogo o que el enlace esté mal
        copiado. El buscador de la cabecera la encuentra si sigue a la venta.
      </p>
      <p className="aviso-pagina__acciones">
        <Link className="btn" href="/catalogo">Ver el catálogo</Link>
        <Link className="btn btn--ghost" href="/">Volver a la portada</Link>
      </p>
    </PaginaAviso>
  )
}
