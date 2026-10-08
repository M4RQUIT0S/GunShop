/* lib/cuenta.ts: que borra «Borrar mis datos». Es lo que /privacidad promete,
   asi que se fija aqui y no solo en el panel (UX-AUDIT.md, tercera pasada, W2).
   Ejecutar con:  node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts"  */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { borrarDatos, CUENTA, PEDIDOS } from '../lib/cuenta.ts'

function almacen(claves: string[]) {
  const m = new Map(claves.map((k) => [k, 'x']))
  return { m, removeItem: (k: string) => { m.delete(k) } }
}

test('«Borrar mis datos» quita el perfil y los resumenes, que llevan el nombre', () => {
  const a = almacen([CUENTA, PEDIDOS])
  borrarDatos(a)
  assert.deepEqual([...a.m.keys()], [])
})

test('«Borrar mis datos» deja la cesta: solo son ids y cantidades, y se vacia desde ella', () => {
  const a = almacen([CUENTA, PEDIDOS, 'gunshop:cesta'])
  borrarDatos(a)
  assert.deepEqual([...a.m.keys()], ['gunshop:cesta'])
})
