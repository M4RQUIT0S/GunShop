/* Que ningun producto regulado acabe en checkout directo.
   Ejecutar con:  node --test test/  */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modoVenta, comprableDirecto } from '../lib/regimen.ts'

const REGULADOS = ['uso-civil', 'uso-civil-condicional', 'requiere-tccm'] as const
const LIBRES = ['libre', 'aire-comprimido'] as const

test('nada regulado se vende con checkout directo', () => {
  for (const r of REGULADOS) {
    assert.notEqual(
      modoVenta(r), 'direct_checkout',
      `${r} no puede pagarse sin validacion: exige credencial`
    )
    assert.equal(comprableDirecto(r), false)
  }
})

test('lo que exige CLU solo se consulta', () => {
  assert.equal(modoVenta('uso-civil'), 'inquiry_only')
  assert.equal(modoVenta('uso-civil-condicional'), 'inquiry_only')
})

test('la municion pasa por validacion, ni consulta ni compra directa', () => {
  // Exige TCCM y cupo por calibre; lo comprueba crear_pedido() en la base.
  assert.equal(modoVenta('requiere-tccm'), 'validated_checkout')
})

test('lo no regulado si se compra directo', () => {
  for (const r of LIBRES) assert.equal(modoVenta(r), 'direct_checkout')
})

test('un regimen desconocido cae en consulta, nunca en compra', () => {
  // Es el fallo mas caro posible: una etiqueta nueva mal escrita no puede
  // abrir la venta libre de un arma.
  // @ts-expect-error se prueba a proposito un valor fuera del tipo
  assert.equal(modoVenta('inventado'), 'inquiry_only')
})
