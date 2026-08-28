/* Puerto de la parte de js/cart.js que no depende del DOM: que puede
 * reservarse y como se arma la reserva y su correo. Sin JSX ni localStorage
 * aqui a proposito -- igual que lib/regimen.ts -- para que se pueda probar
 * sola.
 *
 * REGIMEN/calibre()/porCaja()/topeTccm() de js/catalog.js NO se portan: ya
 * estan resueltos en columnas reales (Producto.regimen via comprableDirecto(),
 * cartridgesPerBox, calibres[].annualQuota), tal como fijo la fase 4. */

import type { Producto } from './catalogo'
import { precio } from './catalogo'
import { comprableDirecto } from './regimen'
import type { Perfil } from './cuenta'

export type Linea = { producto: Producto; n: number }

/* Lo que impide cerrar la reserva. Vacio = se puede reservar.
 *
 * La pagina no vende productos controlados: no pide el numero de CLU ni la
 * TCCM en ningun formulario, asi que nada que exija credencial ANMaC puede
 * despacharse desde aqui. ProductoCTA ya manda esos regimenes a consulta en
 * vez de a la cesta; esto es la red por si uno llega igual (una cesta vieja
 * en localStorage, un regimen que cambia en la base con el carrito lleno).
 * El corte es `comprableDirecto()`, la misma funcion que decide el CTA, para
 * que no haya dos criterios que puedan desincronizarse. */
export function faltas(lineas: Linea[]): string[] {
  const controladas = lineas.filter((l) => !comprableDirecto(l.producto.regimen))
  if (!controladas.length) return []
  return [
    `${controladas.map((l) => `${l.producto.marca} ${l.producto.ref}`).join(', ')}: ` +
      'no se despacha por la web. Exige credencial ANMaC y se cierra en el mostrador; ' +
      'quítalo de la cesta y consúltanos desde su ficha.',
  ]
}

export type Pedido = {
  codigo: string
  fecha: string
  cliente: string | null
  usdCents: number
  lineas: { id: number; n: number; usdCents: number }[]
}

// Sin servidor no hay pedido de verdad: se apunta en el propio navegador
// (CartPanel lo persiste en localStorage['gunshop:pedidos']) y se abre un
// correo con el detalle, que es lo unico que llega a la armeria de verdad. El
// dia que exista sesion con perfil en la base, esto lo sustituye un INSERT via
// crear_pedido().
export function reserva(
  lineas: Linea[],
  perfil: Perfil | null,
  arsPorUsd: number,
): { pedido: Pedido; mailto: string } {
  const totalUsdCents = lineas.reduce((s, l) => s + l.producto.usdCents * l.n, 0)
  const codigo = `A${Date.now().toString(36).toUpperCase().slice(-6)}`

  const pedido: Pedido = {
    codigo,
    fecha: new Date().toISOString(),
    cliente: perfil?.nombre ?? null,
    usdCents: totalUsdCents,
    lineas: lineas.map((l) => ({ id: l.producto.id, n: l.n, usdCents: l.producto.usdCents })),
  }

  const detalle = lineas
    .map((l) => `${l.n} x ${l.producto.marca} ${l.producto.ref}  ${precio(l.producto.usdCents * l.n, arsPorUsd)}`)
    .join('\n')
  const quien = [perfil?.nombre, perfil?.email].filter(Boolean).join(' · ')
  const cuerpo = `${quien}\n\n${detalle}\n\nTotal ${precio(totalUsdCents, arsPorUsd)}`
  const mailto = `mailto:taller@alcantara.example?subject=${encodeURIComponent(`Reserva ${codigo}`)}` +
    `&body=${encodeURIComponent(cuerpo)}`

  return { pedido, mailto }
}
