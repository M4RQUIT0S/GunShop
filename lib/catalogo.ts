import { supabase } from './supabase'
import type { Regimen } from './regimen'

export { modoVenta, comprableDirecto } from './regimen'
export type { Regimen, ModoVenta } from './regimen'

/* Catalogo publico. Todo lo de aqui se lee con la clave publicable, asi que
   solo alcanza lo que `0006_rls.sql` deja ver: catalogo, nada de existencias
   ni de clientes. */

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
  id, ref, kind, usd_cents,
  brand:brand_id ( slug, name ),
  family:family_id ( slug, name, licence_regime:licence_regime_id ( code, label ) ),
  licence_regime:licence_regime_id ( code, label ),
  product_photo ( path, is_primary )
`

/* eslint-disable @typescript-eslint/no-explicit-any */
function aProducto(fila: any): Producto {
  // El regimen del producto pisa al de la familia. La familia lo tiene NOT
  // NULL a proposito, asi que siempre hay uno: nunca se cae a «venta libre»
  // por olvido, que seria entregar sin pedir la credencial.
  const reg = fila.licence_regime ?? fila.family.licence_regime
  const fotos = fila.product_photo ?? []
  const portada = fotos.find((f: any) => f.is_primary) ?? fotos[0]
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
    variantes: 0,
  }
}

export async function listaProductos(familia?: string): Promise<Producto[]> {
  let q = supabase.from('product').select(SELECT).is('discontinued_at', null)
  if (familia) q = q.eq('family.slug', familia)

  const { data, error } = await q
  if (error) throw new Error(`No se pudo leer el catalogo: ${error.message}`)
  return (data ?? []).map(aProducto)
}

export async function familias() {
  const { data, error } = await supabase
    .from('family')
    .select('slug, name, position')
    .order('position')
  if (error) throw new Error(`No se pudieron leer las familias: ${error.message}`)
  return data ?? []
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
