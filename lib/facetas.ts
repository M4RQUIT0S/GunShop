/* Las facetas del catalogo: lo que hay dentro de cada desplegable de la barra
 * de filtros, y como se cruzan entre si. Aparte de `catalogo.ts` por lo mismo
 * que `regimen.ts` y `familia.ts`: aquel importa el cliente de Supabase al
 * cargarse y nada de dentro se puede probar sin `.env.local`. De aqui solo
 * entra el tipo, que se borra al compilar. */

import type { Producto } from './catalogo'

export type Faceta = {
  // El parametro de la URL. Va repetido (`?calibre=A&calibre=B`) y no
  // separado por comas: «6,5 Creedmoor» y «9,3x62» llevan una coma dentro.
  clave: string
  rotulo: string
  // Los valores de este producto. Vacio = no juega en esta faceta: no aparece
  // en ninguna opcion y ninguna seleccion lo deja pasar.
  de: (p: Producto) => string[]
  // Ordenar por el numero y no por el texto. Lo quieren las medidas («90 mm»
  // antes que «710 mm»); no el calibre, donde eso separaria «.223 Rem» de
  // «.22 LR» para meter «.30-06» en medio.
  numerico?: boolean
}

export type Opcion = { valor: string; n: number }

// «cañón 560 mm» es como lo escribe la ficha tecnica desde el sitio estatico.
// Se ofrece el numero, no la frase entera.
const CANON = /^cañón\s+(\d[\d.,]*)\s*mm$/i

// Los aumentos no son una columna: viven en el nombre comercial del visor
// («Z8i 2-16x50 P» -> «2-16x»), que es donde los busca quien compra.
const AUMENTOS = /(\d+(?:,\d+)?(?:-\d+(?:,\d+)?)?)x\d+/

// Sale en rifles, escopetas y pistolas -- en lo que la ficha lo trae, que es
// lo mismo que decidir por familia pero sin una lista de slugs que mantener.
function canon(p: Producto): string[] {
  const m = p.spec.map((t) => CANON.exec(t)).find((x) => x !== null)
  return m ? [`${m[1]} mm`] : []
}

function aumentos(p: Producto): string[] {
  // Solo optica a proposito: `9,3x62` es un calibre y tiene exactamente la
  // misma forma, asi que un rifle con el calibre en el nombre traeria «9,3x»
  // de aumentos. El punto rojo y el prismatico sin zoom no dan ninguno.
  if (p.familia !== 'optica') return []
  const m = AUMENTOS.exec(p.ref)
  return m ? [`${m[1]}x`] : []
}

export const FACETAS: Faceta[] = [
  { clave: 'marca', rotulo: 'Marca', de: (p) => [p.marca] },
  { clave: 'calibre', rotulo: 'Calibre', de: (p) => p.calibres.map((c) => c.name) },
  { clave: 'canon', rotulo: 'Cañón', de: canon, numerico: true },
  { clave: 'aumentos', rotulo: 'Aumentos', de: aumentos, numerico: true },
]

// El orden de llegada de Supabase no le dice nada a quien abre la lista.
const orden = (f: Faceta) => (a: string, b: string) =>
  a.localeCompare(b, 'es', { numeric: f.numerico })

// Las opciones presentes con cuantos productos deja cada una. Solo lo que hay
// algo que ver: una opcion a cero es una via muerta.
export function opciones(productos: Producto[], f: Faceta): Opcion[] {
  const n = new Map<string, number>()
  productos.forEach((p) => f.de(p).forEach((v) => n.set(v, (n.get(v) ?? 0) + 1)))
  return [...n].sort(([a], [b]) => orden(f)(a, b)).map(([valor, n]) => ({ valor, n }))
}

// Dentro de una faceta la seleccion suma (`.308 Win` o `.22 LR`); entre
// facetas resta (esa marca *y* ese cañon). Es lo que espera quien filtra.
export function filtrarPorFaceta(productos: Producto[], f: Faceta, sel: string[]): Producto[] {
  if (!sel.length) return productos
  return productos.filter((p) => f.de(p).some((v) => sel.includes(v)))
}

export type Seleccion = Record<string, string[]>

/* Todas las facetas menos `salvo`. Contar las opciones de una faceta sobre lo
 * que dejan las *demas* es lo que hace util la seleccion multiple: contadas
 * sobre el resultado final, marcar «.308 Win» pondria a cero todos los demas
 * calibres y no se podria anadir un segundo. */
export function aplicarFacetas(
  productos: Producto[], sel: Seleccion, salvo?: string,
): Producto[] {
  return FACETAS.reduce(
    (acc, f) => (f.clave === salvo ? acc : filtrarPorFaceta(acc, f, sel[f.clave] ?? [])),
    productos,
  )
}

// Lo que llega en la URL, normalizado a lista: Next da `string` con un valor
// y `string[]` con varios.
export function seleccion(sp: Record<string, string | string[] | undefined>): Seleccion {
  return Object.fromEntries(FACETAS.map((f) => {
    const v = sp[f.clave]
    return [f.clave, v === undefined ? [] : (Array.isArray(v) ? v : [v])]
  }))
}

// Marca o desmarca un valor sin tocar el resto de la seleccion.
export function alternar(sel: Seleccion, clave: string, valor: string): Seleccion {
  const hay = sel[clave] ?? []
  return {
    ...sel,
    [clave]: hay.includes(valor) ? hay.filter((v) => v !== valor) : [...hay, valor],
  }
}
