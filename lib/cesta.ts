/* Puerto de la parte de js/cart.js que no depende del DOM: que exige cada
 * regimen, que falta para poder reservar y como se arma la reserva y su
 * correo. Sin JSX ni localStorage aqui a proposito -- igual que lib/regimen.ts
 * -- para que se pueda probar sola.
 *
 * REGIMEN/calibre()/porCaja()/topeTccm() de js/catalog.js NO se portan: ya
 * estan resueltos en columnas reales (Producto.regimen via requisitos(),
 * cartridgesPerBox, calibres[].annualQuota), tal como fijo la fase 4. */

import type { Producto } from './catalogo'
import { precio } from './catalogo'
import { requisitos } from './regimen'
import type { Perfil } from './cuenta'

export type Linea = { producto: Producto; n: number }

type Exige = { clu: boolean; tccm: boolean; certificado: boolean }

export function exige(lineas: Linea[]): Exige {
  return lineas.reduce<Exige>((acc, l) => {
    const r = requisitos(l.producto.regimen)
    return { clu: acc.clu || r.clu, tccm: acc.tccm || r.tccm, certificado: acc.certificado || r.certificado }
  }, { clu: false, tccm: false, certificado: false })
}

export type Cupo = { cal: string; lleva: number; tope: number }

// El tope de la TCCM es anual y ANMaC lo lleva contra tus armas registradas;
// aqui solo se mira este pedido, que es lo unico que la pagina sabe. El
// backend (crear_pedido(), vista ammo_consumed) lo comprueba contra el saldo
// real -- ver el gotcha de la fase 6 en PLAN.md.
export function cupos(lineas: Linea[]): Cupo[] {
  const porCalibre = new Map<string, { lleva: number; tope: number }>()
  lineas.forEach((l) => {
    if (!requisitos(l.producto.regimen).tccm) return
    const cal = l.producto.calibres[0]
    if (!cal) return
    const previo = porCalibre.get(cal.name) ?? { lleva: 0, tope: cal.annualQuota }
    porCalibre.set(cal.name, { lleva: previo.lleva + l.producto.cartridgesPerBox * l.n, tope: cal.annualQuota })
  })
  return [...porCalibre]
    .filter(([, v]) => v.lleva > v.tope)
    .map(([cal, v]) => ({ cal, ...v }))
}

const grupos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function fecha(iso: string): string {
  const t = String(iso).split('-')
  return t.length === 3 ? `${t[2]}/${t[1]}/${t[0]}` : iso
}

const hoy = () => new Date().toISOString().slice(0, 10)

// Lo que impide cerrar la reserva. Vacio = se puede reservar.
export function faltas(lineas: Linea[], perfil: Perfil | null): string[] {
  const req = exige(lineas)
  const out: string[] = []

  if (req.clu && !perfil) {
    out.push('Falta tu Credencial de Legítimo Usuario: cárgala en Mi cuenta.')
  } else if (req.clu && perfil && perfil.vence && perfil.vence < hoy()) {
    out.push(`Tu CLU venció el ${fecha(perfil.vence)}. Se renueva en los 90 días previos, no después.`)
  }
  if (req.tccm && (!perfil || !perfil.tccm)) {
    out.push('La munición exige Tarjeta de Consumo (TCCM) ligada a un arma registrada a tu nombre.')
  }
  cupos(lineas).forEach((c) => {
    out.push(`El cupo de ${c.cal} son ${grupos.format(c.tope)} cartuchos y llevas ${grupos.format(c.lleva)}.`)
  })
  return out
}

export function notas(lineas: Linea[]): string[] {
  const req = exige(lineas)
  const out: string[] = []
  if (req.certificado) {
    out.push('Hay piezas de uso civil condicional: llevan certificación de un profesional habilitado (Ley 23.979). Se firma en el mostrador.')
  }
  if (req.clu) {
    out.push('Nada sale sin papeles. La reserva guarda la pieza 72 h; la tenencia se inicia aquí y el arma se entrega a las 48 h.')
  }
  return out
}

export type Pedido = {
  codigo: string
  fecha: string
  cliente: string | null
  clu: string | null
  usdCents: number
  lineas: { id: number; n: number; usdCents: number }[]
}

// Sin servidor no hay pedido de verdad: se apunta en el propio navegador
// (CartPanel lo persiste en localStorage['gunshop:pedidos']) y se abre un
// correo con el detalle, que es lo unico que llega a la armeria de verdad. El
// dia que exista login, esto lo sustituye un INSERT via crear_pedido().
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
    clu: perfil?.clu ?? null,
    usdCents: totalUsdCents,
    lineas: lineas.map((l) => ({ id: l.producto.id, n: l.n, usdCents: l.producto.usdCents })),
  }

  const detalle = lineas
    .map((l) => `${l.n} x ${l.producto.marca} ${l.producto.ref}  ${precio(l.producto.usdCents * l.n, arsPorUsd)}`)
    .join('\n')
  const cuerpo = `${perfil?.nombre ? `${perfil.nombre} · ` : ''}${perfil?.clu ? `CLU ${perfil.clu}\n` : '\n'}` +
    `${detalle}\n\nTotal ${precio(totalUsdCents, arsPorUsd)}`
  const mailto = `mailto:taller@alcantara.example?subject=${encodeURIComponent(`Reserva ${codigo}`)}` +
    `&body=${encodeURIComponent(cuerpo)}`

  return { pedido, mailto }
}
