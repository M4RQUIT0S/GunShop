/* Facetas del catalogo (lib/facetas.ts): que sale en cada desplegable, que
   deja pasar cada seleccion y como se cuentan las opciones.
   Ejecutar con:  node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts"  */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FACETAS, opciones, filtrarPorFaceta, aplicarFacetas, seleccion, alternar, consulta,
} from '../lib/facetas.ts'
import type { Producto } from '../lib/catalogo.ts'

function producto(p: Partial<Producto> & { id: number }): Producto {
  return {
    marca: 'Marca',
    marcaSlug: 'marca',
    ref: 'Ref',
    kind: 'Kind',
    familia: 'rifles',
    familiaNombre: 'Rifles',
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

const faceta = (clave: string) => FACETAS.find((f) => f.clave === clave)!

const RIFLE = producto({
  id: 1, marca: 'Bergara', ref: 'B-14 Ridge', familia: 'rifles',
  spec: ['cañón 560 mm', '3,2 kg'],
  calibres: [{ name: '.308 Win', annualQuota: 0 }],
})
const RIFLE2 = producto({
  id: 2, marca: 'Sako', ref: '85 Bavarian', familia: 'rifles',
  spec: ['cañón 570 mm'],
  calibres: [{ name: '9,3x62', annualQuota: 0 }],
})
const VISOR = producto({
  id: 3, marca: 'Swarovski', ref: 'Z8i 2-16x50 P', familia: 'optica',
  spec: ['retícula 4A-I'],
})
const PRISMA = producto({
  id: 4, marca: 'Swarovski', ref: 'EL 10x42 WB', familia: 'optica',
})
const PUNTO = producto({
  id: 5, marca: 'Aimpoint', ref: 'Micro H-2 2 MOA', familia: 'optica',
})
// El cañon no es cosa de rifles: la escopeta lo trae en el mismo `spec`, y
// de ahi que no haya una lista de familias que decidan quien tiene faceta.
const ESCOPETA = producto({
  id: 9, marca: 'Beretta', ref: '686 Silver Pigeon I', familia: 'escopetas',
  spec: ['cañón 710 mm', '3,3 kg', '5 chokes'],
})
const TODOS = [RIFLE, RIFLE2, VISOR, PRISMA, PUNTO, ESCOPETA]

test('el cañon sale de la ficha tecnica, solo de lo que lo trae', () => {
  assert.deepEqual(
    opciones(TODOS, faceta('canon')),
    [{ valor: '560 mm', n: 1 }, { valor: '570 mm', n: 1 }, { valor: '710 mm', n: 1 }],
  )
  assert.deepEqual(faceta('canon').de(ESCOPETA), ['710 mm'])
})

test('los aumentos salen del nombre del visor, y solo en optica', () => {
  assert.deepEqual(
    opciones(TODOS, faceta('aumentos')),
    [{ valor: '2-16x', n: 1 }, { valor: '10x', n: 1 }],
  )
  // El punto rojo no tiene zoom: «2 MOA» es el tamano del punto.
  assert.deepEqual(faceta('aumentos').de(PUNTO), [])
})

test('un calibre en el nombre de un rifle no se lee como aumentos', () => {
  // `9,3x62` tiene exactamente la forma de un «10x42», de ahi el corte por
  // familia: si esto se rompe, Rifles estrena un desplegable de aumentos.
  const conCalibreEnElNombre = producto({ id: 6, ref: 'R8 9,3x62', familia: 'rifles' })
  assert.deepEqual(faceta('aumentos').de(conCalibreEnElNombre), [])
})

test('las opciones se ordenan por numero, no por texto', () => {
  const largos = [
    producto({ id: 7, spec: ['cañón 710 mm'] }),
    producto({ id: 8, spec: ['cañón 90 mm'] }),
  ]
  assert.deepEqual(opciones(largos, faceta('canon')).map((o) => o.valor), ['90 mm', '710 mm'])
})

test('dentro de una faceta la seleccion suma', () => {
  const dos = filtrarPorFaceta(TODOS, faceta('marca'), ['Bergara', 'Sako'])
  assert.deepEqual(dos.map((p) => p.id), [1, 2])
  // Sin nada marcado no filtra: es la lista entera, no la vacia.
  assert.equal(filtrarPorFaceta(TODOS, faceta('marca'), []).length, TODOS.length)
})

test('entre facetas la seleccion resta', () => {
  const sel = { marca: ['Bergara'], calibre: ['9,3x62'], canon: [], aumentos: [] }
  assert.deepEqual(aplicarFacetas(TODOS, sel), [])
})

test('«salvo» deja fuera su propia faceta, para poder marcar un segundo valor', () => {
  const sel = { marca: [], calibre: ['.308 Win'], canon: [], aumentos: [] }
  // Contado sobre el resultado final, «9,3x62» saldria a cero y no habria
  // forma de anadirlo a la seleccion.
  const opts = opciones(aplicarFacetas(TODOS, sel, 'calibre'), faceta('calibre'))
  assert.deepEqual(opts.map((o) => o.valor), ['.308 Win', '9,3x62'])
})

test('la URL admite un valor o varios, y alternar no toca el resto', () => {
  assert.deepEqual(seleccion({ calibre: '.308 Win' }).calibre, ['.308 Win'])
  assert.deepEqual(seleccion({ calibre: ['.308 Win', '.22 LR'] }).calibre, ['.308 Win', '.22 LR'])
  assert.deepEqual(seleccion({}).marca, [])

  const sel = seleccion({ calibre: '.308 Win', marca: 'Sako' })
  assert.deepEqual(alternar(sel, 'calibre', '.22 LR').calibre, ['.308 Win', '.22 LR'])
  assert.deepEqual(alternar(sel, 'calibre', '.308 Win').calibre, [])
  assert.deepEqual(alternar(sel, 'calibre', '.22 LR').marca, ['Sako'])
})

test('consulta() y seleccion() son ida y vuelta: los filtros vuelven de la ficha', () => {
  const sel = { marca: ['Sako'], calibre: ['.308 Win', '6,5 Creedmoor'], canon: [], aumentos: [] }
  const qs = consulta({ familia: 'rifles', sub: 'Rifle de cerrojo', q: '', sel })
  const vuelta = new URLSearchParams(qs)

  assert.equal(vuelta.get('familia'), 'rifles')
  assert.equal(vuelta.get('sub'), 'Rifle de cerrojo')
  assert.equal(vuelta.has('q'), false)
  assert.deepEqual(seleccion(Object.fromEntries(
    [...vuelta.keys()].map((k) => [k, vuelta.getAll(k)]),
  )), sel)
})

test('consulta() sin nada puesto no deja cadena: el «volver» cae en la familia', () => {
  assert.equal(consulta({}), '')
  assert.equal(consulta({ sel: seleccion({}) }), '')
})

test('consulta() suelta las facetas sin familia ni busqueda que las acote', () => {
  // Un enlace externo del tipo /producto/<slug>?calibre=X (sin familia ni q)
  // no puede armar un «volver» que prometa ese calibre: en el catalogo, sin
  // acotar, la faceta no se lee (ver `acotado` en app/catalogo/page.tsx).
  const sel = { marca: [], calibre: ['.308 Win'], canon: [], aumentos: [] }
  assert.equal(consulta({ sel }), '')
  // Con familia o busqueda puestas, la faceta si viaja.
  assert.equal(consulta({ familia: 'rifles', sel }), 'familia=rifles&calibre=.308+Win')
  assert.equal(consulta({ q: 'tikka', sel }), 'q=tikka&calibre=.308+Win')
})
