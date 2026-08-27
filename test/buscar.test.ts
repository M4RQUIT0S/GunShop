/* llano()/buscar() (lib/buscar.ts), puerto de js/catalog.js.
   Ejecutar con:  node --test test/  */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { llano, buscar } from '../lib/buscar.ts'
import type { Producto } from '../lib/catalogo.ts'

function producto(p: Partial<Producto> & { id: number }): Producto {
  return {
    marca: 'Marca',
    marcaSlug: 'marca',
    ref: 'Ref',
    kind: 'Kind',
    familia: 'familia',
    familiaNombre: 'Familia',
    regimen: 'libre',
    regimenEtiqueta: 'Venta libre',
    usdCents: 100_00,
    foto: null,
    fotos: [],
    variantes: 1,
    spec: [],
    cartridgesPerBox: 0,
    calibres: [],
    ...p,
  }
}

test('llano() quita acentos y mayusculas', () => {
  assert.equal(llano('Anschütz'), 'anschutz')
  assert.equal(llano('AÑO ÁÉÍÓÚ'), 'ano aeiou')
  assert.equal(llano(''), '')
})

test('buscar() sin palabras no devuelve nada', () => {
  const items = [producto({ id: 1, marca: 'Glock', ref: '17' })]
  assert.deepEqual(buscar(items, ''), [])
  assert.deepEqual(buscar(items, '   '), [])
})

test('buscar() encuentra por marca+ref, sin acentos ni mayusculas', () => {
  const glock = producto({ id: 1, marca: 'Glock', ref: '17' })
  const bersa = producto({ id: 2, marca: 'Bersa', ref: 'TPR9' })
  assert.deepEqual(buscar([glock, bersa], 'GLOCK'), [glock])
  assert.deepEqual(buscar([glock, bersa], 'glock 17'), [glock])
})

test('buscar() tambien casa por familia, kind, spec, calibre y regimen', () => {
  const rifle = producto({
    id: 1,
    marca: 'Anschütz',
    ref: '1710',
    familiaNombre: 'Rifles',
    kind: 'Cerrojo',
    spec: ['Cerrojo manual', 'Culata de madera'],
    calibres: [{ name: '.22 LR', annualQuota: 0 }],
    regimenEtiqueta: 'Uso civil',
  })
  assert.deepEqual(buscar([rifle], 'rifles'), [rifle])
  assert.deepEqual(buscar([rifle], 'cerrojo'), [rifle])
  assert.deepEqual(buscar([rifle], 'madera'), [rifle])
  assert.deepEqual(buscar([rifle], '.22 lr'), [rifle])
  assert.deepEqual(buscar([rifle], 'uso civil'), [rifle])
})

test('buscar() exige TODAS las palabras (AND, no OR)', () => {
  const glock = producto({ id: 1, marca: 'Glock', ref: '17' })
  const bersa = producto({ id: 2, marca: 'Bersa', ref: '17' })
  // "glock 17" no puede devolver la Bersa solo porque comparte el "17".
  assert.deepEqual(buscar([glock, bersa], 'glock 17'), [glock])
})

test('buscar() sube lo que casa por nombre sobre lo que solo casa por ficha', () => {
  // "17" aparece en el nombre de la Glock y solo en la ficha tecnica de la
  // Bersa; la Glock tiene que salir primero aunque la Bersa venga antes en
  // el array de entrada.
  const bersa = producto({ id: 2, marca: 'Bersa', ref: 'TPR9', spec: ['Calibre 17mm'] })
  const glock = producto({ id: 1, marca: 'Glock', ref: '17' })
  assert.deepEqual(buscar([bersa, glock], '17'), [glock, bersa])
})
