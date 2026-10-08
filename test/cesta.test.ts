/* lib/cesta.ts: lo que guarda el resumen de la cesta. «Mi cuenta» lo enseña
   tal como se armo -- nombres y total del momento --, sin volver a pedir el
   catalogo (UX-AUDIT.md, segunda pasada, S1).
   Ejecutar con:  node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts"  */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Producto } from '../lib/catalogo.ts'

// reserva() no toca la base, pero lib/cesta.ts importa precio() de
// lib/catalogo.ts, que crea el cliente de Supabase al cargarse y exige las dos
// variables. Con valores de relleno basta: crear el cliente no conecta.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'relleno'
const { reserva } = await import('../lib/cesta.ts')
const { precio } = await import('../lib/catalogo.ts')

function producto(p: Partial<Producto> & { id: number }): Producto {
  return {
    marca: 'Marca', marcaSlug: 'marca', ref: 'Ref', kind: 'Kind',
    familia: 'accesorios', familiaNombre: 'Accesorios',
    regimen: 'libre', regimenEtiqueta: 'Venta libre',
    usdCents: 100_00, foto: null, fotos: [], variantes: 1, spec: [],
    cartridgesPerBox: 0, calibres: [],
    ...p,
  }
}

const MALETA = producto({ id: 16, marca: 'Pelican', ref: 'Vault V730', usdCents: 280_00 })
const FUNDA = producto({ id: 77, marca: 'Peli', ref: '1750 Protector', usdCents: 100_00 })

test('el resumen guarda el nombre de cada linea, para enseñarlo sin el catalogo', () => {
  const { pedido } = reserva([{ producto: MALETA, n: 2 }, { producto: FUNDA, n: 1 }], null, 1000)
  assert.deepEqual(
    pedido.lineas.map((l) => [l.id, l.n, l.nombre]),
    [[16, 2, 'Pelican Vault V730'], [77, 1, 'Peli 1750 Protector']],
  )
})

test('el resumen guarda el total en pesos tal como lo vio la cesta', () => {
  const { pedido } = reserva([{ producto: MALETA, n: 2 }, { producto: FUNDA, n: 1 }], null, 1000)
  assert.equal(pedido.usdCents, 660_00)
  assert.equal(pedido.total, precio(660_00, 1000))
})
