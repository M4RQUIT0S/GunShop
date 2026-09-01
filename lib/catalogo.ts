import { supabase } from './supabase'
import type { Regimen } from './regimen'
import { rama, type Familia } from './familia'

export { modoVenta, comprableDirecto } from './regimen'
export { raices, hijas, rama, arbolMenu } from './familia'
export type { Familia, Nodo } from './familia'
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
  // Todas las fotos del producto, portada primero, para la galeria de la
  // ficha. Vacio en los dos productos de 0009_fotos.sql que no tienen fila.
  fotos: string[]
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
  family:family_id!inner ( slug, name, model_key, licence_regime:licence_regime_id ( code, label ) ),
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
  // Portada primero, el resto en el orden que llego: es el orden de galeria.
  const enOrden = portada ? [portada, ...fotos.filter((f: any) => f !== portada)] : fotos
  /* El peldano de en medio de la cascada: producto -> familia -> sin foto.
   * Estaba documentado y no cableado, y hasta 0011 no se pisaba porque los 76
   * productos traian la suya; las diez de recarga no tienen foto propia -- de
   * una prensa RCBS no hay ninguna libre -- y sin esto salian en blanco. La
   * de la familia es generica a proposito: ensena polvora en «Polvoras», que
   * es cierto, en vez de la foto de otro producto, que no lo seria. */
  const generica = fila.family.model_key ? `/img/model/${fila.family.model_key}.webp` : null
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
    foto: portada ? '/' + portada.path : generica,
    fotos: enOrden.length ? enOrden.map((f: any) => '/' + f.path) : (generica ? [generica] : []),
    variantes: variantes.length,
    spec: fila.spec ?? [],
    cartridgesPerBox: fila.cartridges_per_box ?? 0,
    calibres: calibresDeVariantes(variantes),
  }
}

/* El `kind` que cada ficha ya lleva para pintarse (p.ej. «Rifle de cerrojo»).
 * Ya no tiene fila de chips propia -- repartia una familia en tantos como
 * etiquetas sueltas tuvieran sus productos --, pero el tercer nivel del menu
 * de la cabecera sigue enlazando a `?sub=<kind>`, y eso hay que honrarlo. */
export function filtrarPorSub(productos: Producto[], sub: string): Producto[] {
  return productos.filter((p) => p.kind === sub)
}

/* Sin parametros a proposito: trae el catalogo entero y los filtros se
 * aplican encima, con las funciones puras de arriba. Los tenia -- (familia,
 * sub, calibre) -- y no los usaba nadie: las dos paginas piden todo una vez y
 * filtran en memoria para poder contar los chips sin volver a preguntar. El
 * de familia, ademas, se quedo mal con 0010: hacia `family.slug = familia`,
 * que desde que la familia es un arbol se salta las hijas. */
export async function listaProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('product').select(SELECT).is('discontinued_at', null)
  if (error) throw new Error(`No se pudo leer el catalogo: ${error.message}`)
  return (data ?? []).map(aProducto)
}

/* Un producto cae dentro de `slug` si cuelga de el o de cualquier
 * descendiente. Desde 0010 no es lo mismo que `p.familia === slug`: los 15
 * cartuchos cuelgan de `cartuchos`, no de `municion`, y la baldosa de la
 * portada contaria cero. */
export function filtrarPorFamilia(
  productos: Producto[], fams: Familia[], slug: string,
): Producto[] {
  const dentro = new Set(rama(fams, slug))
  return productos.filter((p) => dentro.has(p.familia))
}

// Cuantos hay en cada familia contando su rama entera, para las baldosas de
// la portada y los chips del catalogo.
export function cuentaPorRama(
  productos: Producto[], fams: Familia[],
): Record<string, number> {
  return Object.fromEntries(
    fams.map((f) => [f.slug, filtrarPorFamilia(productos, fams, f.slug).length]),
  )
}

// Misma clave que arma los enlaces del listado (slugDe), asi que un producto
// nuevo o renombrado nunca puede desincronizar listado y ficha entre si: los
// dos leen del mismo listaProductos() y aplican la misma funcion.
export async function productoPorSlug(slug: string): Promise<Producto | null> {
  const productos = await listaProductos()
  return productos.find((p) => slugDe(p) === slug) ?? null
}

// Devuelve el arbol entero, plano y ordenado por `position`. Quien solo
// quiera las seis de siempre filtra con `raices()`.
export async function familias(): Promise<Familia[]> {
  const { data, error } = await supabase
    .from('family')
    .select('id, slug, name, position, model_key, parent_id, licence_regime:licence_regime_id ( label )')
    .order('position')
  if (error) throw new Error(`No se pudieron leer las familias: ${error.message}`)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((f: any) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    model_key: f.model_key,
    licencia: f.licence_regime.label,
    parentId: f.parent_id ?? null,
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

/* Subcategorias (`product.kind`) agrupadas por familia, para el menu de la
 * barra. Consulta aparte y no `listaProductos()` porque el menu sale en cada
 * pagina: aqui se piden dos columnas, no las fotos ni las variantes de los 79
 * productos. Sale del mismo `kind` que el filtro del catalogo, asi que una
 * subcategoria nueva aparece en el menu sola. */
export async function subsPorFamilia(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('product')
    .select('kind, family:family_id!inner ( slug )')
    .is('discontinued_at', null)
  if (error) throw new Error(`No se pudieron leer las subcategorias: ${error.message}`)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const porFamilia = new Map<string, Set<string>>()
  ;(data ?? []).forEach((p: any) => {
    const slug = p.family.slug
    if (!porFamilia.has(slug)) porFamilia.set(slug, new Set())
    porFamilia.get(slug)!.add(p.kind)
  })
  return Object.fromEntries(
    [...porFamilia].map(([slug, kinds]) => [
      slug, [...kinds].sort((a, b) => a.localeCompare(b, 'es')),
    ]),
  )
}
