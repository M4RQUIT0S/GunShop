/* Puerto literal de llano()/buscar() (js/catalog.js). Sin acentos y sin
 * mayusculas, porque nadie escribe «Anschütz» con diéresis en un buscador;
 * todas las palabras tienen que aparecer, en el nombre o en la ficha
 * tecnica. `p.name` no existe como campo propio en `Producto` (viene de
 * `marca`+`ref`), así que el heno se arma con lo que sí tiene. */

import type { Producto } from './catalogo'

// Bloque Unicode "Combining Diacritical Marks" (0x0300-0x036f), construido por
// codigo en vez de escrito como \uXXXX literal para no arrastrar el caracter
// combinante de verdad dentro del propio fichero fuente.
const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g')

export function llano(t: string): string {
  return String(t).toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
}

function nombre(p: Producto): string {
  return `${p.marca} ${p.ref}`
}

function heno(p: Producto): string {
  return llano([
    p.familiaNombre, nombre(p), p.kind,
    ...p.spec, ...p.calibres.map((c) => c.name), p.regimenEtiqueta,
  ].join(' '))
}

export function buscar(items: Producto[], q: string): Producto[] {
  const palabras = llano(q || '').split(/\s+/).filter(Boolean)
  if (!palabras.length) return []
  const hallados = items.filter((p) => {
    const h = heno(p)
    return palabras.every((w) => h.includes(w))
  })
  // `items` ya viene ordenado por relevancia; esto solo sube lo que casa por
  // nombre sobre lo que casa por la ficha, sin deshacer ese orden (sort
  // estable desde ES2019).
  const porNombre = (p: Producto) => (palabras.every((w) => llano(nombre(p)).includes(w)) ? 0 : 1)
  return hallados.slice().sort((a, b) => porNombre(a) - porNombre(b))
}
