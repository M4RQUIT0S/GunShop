'use client'

import { useLinkStatus } from 'next/link'

/* El punto que dice «voy» mientras un filtro del catalogo navega. Cada clic en
 * un chip o en una opcion es una vuelta al servidor de ~650 ms (medido en
 * produccion) en la que la pagina no cambiaba nada (UX-AUDIT.md, segunda
 * pasada, W1). Va dentro del <Link> -- useLinkStatus solo funciona ahi -- y
 * siempre montado: el CSS (`.pendiente`) lo hace aparecer a los 100 ms, asi
 * que una navegacion rapida no parpadea, y en posicion absoluta, para que no
 * empuje el rotulo. */
export default function Pendiente() {
  const { pending } = useLinkStatus()
  return <span className={`pendiente${pending ? ' is-on' : ''}`} aria-hidden="true" />
}
