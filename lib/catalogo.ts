import { supabase } from './supabase'
import type { Regimen } from './regimen'

export { modoVenta, comprableDirecto } from './regimen'
export type { Regimen, ModoVenta } from './regimen'

/* Catalogo publico. Todo lo de aqui se lee con la clave publicable, asi que
   solo alcanza lo que `0006_rls.sql` deja ver: catalogo, nada de existencias
   ni de clientes. */

export type Calibre = { name: string; annualQuota: number }

export type Producto = {
  id: number
  marca: string
  marcaSlug: string
  ref: string
  kind: string
  familia: string
  familiaNombre: string
  regimen: Regimen
  regimenEtiqueta: string
  usdCents: number
  foto: string | null
  variantes: number
  spec: string[]
  cartridgesPerBox: number
  // Calibres de las referencias del producto (product_variant.calibre_id),
  // sin repetir. Vacio en lo que no se sirve por calibre -- optica, fundas.
  calibres: Calibre[]
}

/* El slug sale de la marca y la referencia. `product` todavia no tiene columna
 * `slug`; mientras la clave natural sea (brand_id, ref) esto es unico, que es
 * lo que la URL necesita. */
export function slugDe(p: { marcaSlug: string; ref: string }): string {
  return `${p.marcaSlug}-${p.ref}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const SELECT = `
  id, ref, kind, usd_cents, spec, cartridges_per_box,
  brand:brand_id ( slug, name ),
  family:family_id ( slug, name, licence_regime:licence_regime_id ( code, label ) ),
  licence_regime:licence_regime_id ( code, label ),
  product_photo ( path, is_primary ),
  product_variant ( calibre:calibre_id ( name, annual_quota ) )
`

/* eslint-disable @typescript-eslint/no-explicit-any */
function calibresDeVariantes(variantes: any[]): Calibre[] {
  // Varias referencias pueden compartir calibre (raro, pero el join no lo
  // impide); se queda con el primero que aparece.
  const vistos = new Map<string, number>()
  variantes.forEach((v) => {
    if (v.calibre && !vistos.has(v.calibre.name)) {
      vistos.set(v.calibre.name, v.calibre.annual_quota)
    }
  })
  return [...vistos].map(([name, annualQuota]) => ({ name, annualQuota }))
}

function aProducto(fila: any): Producto {
  // El regimen del producto pisa al de la familia. La familia lo tiene NOT
  // NULL a proposito, asi que siempre hay uno: nunca se cae a «venta libre»
  // por olvido, que seria entregar sin pedir la credencial.
  const reg = fila.licence_regime ?? fila.family.licence_regime
  const fotos = fila.product_photo ?? []
  const portada = fotos.find((f: any) => f.is_primary) ?? fotos[0]
  const variantes = fila.product_variant ?? []
  return {
    id: fila.id,
    marca: fila.brand.name,
    marcaSlug: fila.brand.slug,
    ref: fila.ref,
    kind: fila.kind,
    familia: fila.family.slug,
    familiaNombre: fila.family.name,
    regimen: reg.code as Regimen,
    regimenEtiqueta: reg.label,
    usdCents: fila.usd_cents,
    foto: portada ? '/' + portada.path : null,
    variantes: variantes.length,
    spec: fila.spec ?? [],
    cartridgesPerBox: fila.cartridges_per_box ?? 0,
    calibres: calibresDeVariantes(variantes),
  }
}

// Segundo nivel del filtro: el `kind` que cada ficha ya lleva para pintarse
// (p.ej. «Rifle de cerrojo»). No es un dato aparte que mantener sincronizado:
// sale del mismo `kind` de la base, asi que una familia nueva trae sus
// subcategorias sola.
export function filtrarPorSub(productos: Producto[], sub: string): Producto[] {
  return productos.filter((p) => p.kind === sub)
}

// El calibre corta de traves a familias y subcategorias: es la misma funcion
// tanto si se aplica sobre el catalogo entero como sobre una familia ya
// filtrada.
export function filtrarPorCalibre(productos: Producto[], calibre: string): Producto[] {
  return productos.filter((p) => p.calibres.some((c) => c.name === calibre))
}

// Las subcategorias presentes en `productos`, con cuantas hay de cada una,
// alfabeticas: el orden de llegada no le dice nada a quien lee la fila de
// chips.
export function subcategorias(productos: Producto[]): { kind: string; n: number }[] {
  const n: Record<string, number> = {}
  productos.forEach((p) => {
    n[p.kind] = (n[p.kind] ?? 0) + 1
  })
  return Object.keys(n)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((kind) => ({ kind, n: n[kind] }))
}

// Los calibres presentes en `productos`, sin repetir y alfabeticos. Sirve
// para ofrecer solo los que hay algo que ver, tanto en «todo» como dentro de
// una familia o subcategoria ya filtrada.
export function calibresDe(productos: Producto[]): string[] {
  const vistos = new Set<string>()
  productos.forEach((p) => p.calibres.forEach((c) => vistos.add(c.name)))
  return [...vistos].sort((a, b) => a.localeCompare(b, 'es'))
}

export async function listaProductos(
  familia?: string,
  sub?: string,
  calibre?: string,
): Promise<Producto[]> {
  let q = supabase.from('product').select(SELECT).is('discontinued_at', null)
  if (familia) q = q.eq('family.slug', familia)

  const { data, error } = await q
  if (error) throw new Error(`No se pudo leer el catalogo: ${error.message}`)
  let productos = (data ?? []).map(aProducto)
  if (sub) productos = filtrarPorSub(productos, sub)
  if (calibre) productos = filtrarPorCalibre(productos, calibre)
  return productos
}

export type Familia = {
  slug: string
  name: string
  model_key: string | null
  // Etiqueta por defecto de la familia (art. 5 decreto 395/75 o "Venta
  // libre"), para la baldosa de #tiles. La ficha puede pisarla con
  // `licence:`, pero la familia siempre tiene una -- NOT NULL en el esquema.
  licencia: string
}

export async function familias(): Promise<Familia[]> {
  const { data, error } = await supabase
    .from('family')
    .select('slug, name, position, model_key, licence_regime:licence_regime_id ( label )')
    .order('position')
  if (error) throw new Error(`No se pudieron leer las familias: ${error.message}`)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((f: any) => ({
    slug: f.slug,
    name: f.name,
    model_key: f.model_key,
    licencia: f.licence_regime.label,
  }))
}

/* Cambio del dia. La base guarda dolares en centavos enteros y los pesos se
   derivan, que es lo que permite que una factura vieja siga cuadrando. */
export async function cambio(): Promise<number> {
  const { data } = await supabase
    .from('fx_rate')
    .select('ars_per_usd')
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? Number(data.ars_per_usd) : 0
}

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function precio(usdCents: number, arsPorUsd: number): string {
  if (!arsPorUsd) return 'Consultar'
  return pesos.format(Math.round((usdCents / 100) * arsPorUsd))
}
