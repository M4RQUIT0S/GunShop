import Link from 'next/link'
import type { Faceta, Opcion } from '@/lib/facetas'
import Pendiente from './Pendiente'

type Props = {
  faceta: Faceta
  opciones: Opcion[]
  // Los valores marcados de *esta* faceta.
  sel: string[]
  // La URL que deja marcado o desmarcado `valor`, sin tocar el resto.
  href: (valor: string) => string
}

/* Un desplegable de la barra de filtros. `<details>` nativo a proposito: el
 * teclado, el `aria-expanded` y el abrir/cerrar vienen del elemento, sin una
 * linea de JavaScript ni un `'use client'` que arrastre la pagina entera al
 * navegador. Cada opcion es un enlace que alterna su valor en la URL, asi que
 * se pueden marcar varias -- una navegacion por clic.
 *
 * ponytail: el panel se cierra si la navegacion remonta el <details> (el
 * atributo `open` es estado del DOM, no una prop). Si molesta, esto pasa a
 * componente de cliente con useState; no antes. */
export default function Desplegable({ faceta, opciones, sel, href }: Props) {
  return (
    <details className="drop">
      <summary className="drop__bt">
        {faceta.rotulo}
        {sel.length > 0 && <span className="drop__n">{sel.length}</span>}
      </summary>
      <div className="drop__menu">
        {opciones.map((o) => {
          const activo = sel.includes(o.valor)
          return (
            // Sin aria-pressed: es estado de boton y esto es un enlace, que el
            // lector de pantalla anunciaba como «enlace, presionado». El estado
            // va en el nombre, que dice lo que hace el clic; `data-activo` es
            // solo para el CSS (UX-AUDIT.md, Jakob).
            <Link
              key={o.valor}
              href={href(o.valor)}
              className="drop__op"
              data-activo={activo || undefined}
              aria-label={`${activo ? 'Quitar' : 'Aplicar'} filtro ${faceta.rotulo}: ${o.valor} (${o.n})`}
            >
              <span className="drop__tick" aria-hidden="true">{activo ? '✓' : ''}</span>
              <span className="drop__valor">{o.valor}</span>
              <span className="drop__c">{o.n}</span>
              <Pendiente />
            </Link>
          )
        })}
      </div>
    </details>
  )
}
