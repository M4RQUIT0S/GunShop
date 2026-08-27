/* El slug de cada fila de listaProductos() tiene que resolver, via
   productoPorSlug(), a esa misma fila. Es justo lo que rompe en silencio con
   un 404 si la normalizacion de slugDe() cambia en un solo sitio y no en el
   otro -- listado y ficha comparten la funcion, pero nada impide que un
   cambio futuro la reimplemente aparte.

   Necesita Supabase real (NEXT_PUBLIC_SUPABASE_URL/_PUBLISHABLE_KEY); las
   toma de .env.local si el entorno no las trae ya puestas.

   Ejecutar con:  node --test test/  */
import { test } from 'node:test'
import assert from 'node:assert/strict'

try {
  process.loadEnvFile('.env.local')
} catch {
  // Ya vienen puestas (CI), o no hay .env.local: listaProductos() falla con
  // un mensaje claro (lib/supabase.ts) si de verdad faltan.
}

const { listaProductos, productoPorSlug, slugDe } = await import('../lib/catalogo.ts')

test('slugDe() de cada producto del listado resuelve a si mismo via productoPorSlug()', async () => {
  const productos = await listaProductos()
  assert.ok(productos.length > 0, 'el catalogo no puede estar vacio para esta prueba')

  for (const p of productos) {
    const slug = slugDe(p)
    const hallado = await productoPorSlug(slug)
    assert.ok(hallado, `slug "${slug}" (de ${p.marca} ${p.ref}) no resolvio a ningun producto`)
    assert.equal(hallado.id, p.id, `slug "${slug}" resolvio a otro producto distinto`)
  }
})

test('slugDe() no repite slug entre productos distintos', () => {
  return listaProductos().then((productos) => {
    const porSlug = new Map<string, number>()
    for (const p of productos) {
      const slug = slugDe(p)
      const previo = porSlug.get(slug)
      assert.ok(
        previo === undefined || previo === p.id,
        `"${slug}" lo comparten los productos ${previo} y ${p.id}`,
      )
      porSlug.set(slug, p.id)
    }
  })
})
