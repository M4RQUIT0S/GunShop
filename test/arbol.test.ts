/* El arbol del menu y la rama de una familia, sobre fixtures: son funciones
   puras, no hace falta Supabase ni .env.local.
   Ejecutar con:  node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts"  */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arbolMenu, rama, raices, type Familia, type Nodo } from '../lib/familia.ts'

// La forma de Supabase despues de 0010, recortada: una familia plana (rifles,
// que se abre en sus `kind`) y la rama de tres niveles de municion.
const f = (id: number, slug: string, name: string, parentId: number | null): Familia =>
  ({ id, slug, name, model_key: 'cartridge', licencia: 'Uso civil', parentId })

const FAMS: Familia[] = [
  f(1, 'rifles', 'Rifles', null),
  f(5, 'municion', 'Municion', null),
  f(7, 'balas', 'Balas', 5),
  f(8, 'cartuchos', 'Cartuchos', 5),
  f(9, 'recarga', 'Recarga', 5),
  f(13, 'recarga-polvoras', 'Pólvoras', 9),
  f(14, 'recarga-puntas', 'Puntas', 9),
]

const KINDS = {
  rifles: ['Rifle de cerrojo', 'Rifle del 22'],
  cartuchos: ['Cartuchería de caza'],
}

const busca = (nodos: Nodo[], etiqueta: string): Nodo => {
  const n = nodos.find((x) => x.etiqueta === etiqueta)
  assert.ok(n, `no hay nodo «${etiqueta}»`)
  return n
}

test('el nivel 1 son las raices, nunca las hijas', () => {
  const arbol = arbolMenu(FAMS, KINDS)
  assert.deepEqual(arbol.map((n) => n.etiqueta), ['Rifles', 'Municion'])
  assert.deepEqual(raices(FAMS).map((x) => x.slug), ['rifles', 'municion'])
})

test('una familia sin hijas se abre en sus kind', () => {
  const rifles = busca(arbolMenu(FAMS, KINDS), 'Rifles')
  assert.deepEqual(rifles.hijos.map((n) => n.etiqueta), ['Rifle de cerrojo', 'Rifle del 22'])
  assert.equal(rifles.hijos[0].href, '/catalogo?familia=rifles&sub=Rifle%20de%20cerrojo')
})

test('una familia con hijas se abre en ellas, no en sus kind', () => {
  const municion = busca(arbolMenu(FAMS, KINDS), 'Municion')
  assert.deepEqual(municion.hijos.map((n) => n.etiqueta), ['Balas', 'Cartuchos', 'Recarga'])
})

test('el tercer nivel llega hasta las hijas de Recarga', () => {
  const municion = busca(arbolMenu(FAMS, KINDS), 'Municion')
  const recarga = busca(municion.hijos, 'Recarga')
  assert.deepEqual(recarga.hijos.map((n) => n.etiqueta), ['Pólvoras', 'Puntas'])
  // Hojas: sin hijos, y su enlace filtra por su propia familia.
  assert.deepEqual(recarga.hijos[0].hijos, [])
  assert.equal(recarga.hijos[0].href, '/catalogo?familia=recarga-polvoras')
})

test('Cartuchos es hoja del arbol de familias pero se abre en sus kind', () => {
  const municion = busca(arbolMenu(FAMS, KINDS), 'Municion')
  const cartuchos = busca(municion.hijos, 'Cartuchos')
  assert.deepEqual(cartuchos.hijos.map((n) => n.etiqueta), ['Cartuchería de caza'])
})

test('la rama de una familia se lleva a sus descendientes; la de una hoja, solo a ella', () => {
  assert.deepEqual(
    [...rama(FAMS, 'municion')].sort(),
    ['balas', 'cartuchos', 'municion', 'recarga', 'recarga-polvoras', 'recarga-puntas'],
  )
  assert.deepEqual(rama(FAMS, 'cartuchos'), ['cartuchos'])
  // Un slug que no existe no revienta: se filtra por el tal cual.
  assert.deepEqual(rama(FAMS, 'inventada'), ['inventada'])
})

test('un ciclo en parent_id no cuelga el render', () => {
  // Nada en la base impide escribir esto, y el servidor entero se queda
  // colgado si el recorrido no lo corta.
  const CICLO: Familia[] = [
    f(1, 'a', 'A', null),
    f(2, 'b', 'B', 1),
    { ...f(3, 'c', 'C', 2), id: 3 },
    { ...f(1, 'a', 'A', 3), id: 1 },
  ]
  assert.ok(rama(CICLO, 'a').length <= CICLO.length)
  assert.ok(arbolMenu(CICLO, {}).length >= 0)
})
