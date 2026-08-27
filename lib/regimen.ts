/* Regimen legal ANMaC y modo de venta. Sin importaciones a proposito: es la
   pieza que decide si un arma se puede pagar sin que nadie mire una
   credencial, asi que tiene que poder probarse sola, sin base de datos ni
   variables de entorno. */

export type Regimen =
  | 'libre'
  | 'aire-comprimido'
  | 'uso-civil'
  | 'uso-civil-condicional'
  | 'requiere-tccm'

/* Los cuatro modos de venta del documento de alcance (§ 3). */
export type ModoVenta =
  | 'inquiry_only'
  | 'reservation'
  | 'direct_checkout'
  | 'validated_checkout'

/* El modo de venta se DERIVA del regimen; no es una columna.
 *
 * El documento pide un campo `purchase_mode`, pero guardarlo aparte crea dos
 * fuentes para la misma decision: el dia que alguien cambie el regimen de una
 * familia y no el modo, la tienda vende un arma con checkout directo. Como es
 * funcion pura del regimen, no puede desincronizarse.
 *
 * Que nada regulado caiga en `direct_checkout` no es una preferencia: lo dice
 * el propio documento (§ 15), que los requisitos legales «deben validarse con
 * normativa vigente y asesoramiento legal antes de implementar checkout
 * automatico».
 *
 * ponytail: derivado. Si hace falta forzar `reservation` en un producto
 * concreto (stock bajo), se anade `purchase_mode_override` nullable y esta
 * funcion la respeta; nunca al reves.
 */
export function modoVenta(regimen: Regimen): ModoVenta {
  switch (regimen) {
    case 'libre':
    case 'aire-comprimido':
      return 'direct_checkout'
    case 'requiere-tccm':
      return 'validated_checkout'   // exige TCCM y cupo por calibre
    case 'uso-civil':
    case 'uso-civil-condicional':
      return 'inquiry_only'         // exige CLU: no se entrega sin verla
    default:
      // Un regimen que no conocemos NO se vende: cae a consulta. Lo contrario
      // -- tratarlo como venta libre -- es entregar sin pedir la credencial.
      return 'inquiry_only'
  }
}

export function comprableDirecto(regimen: Regimen): boolean {
  return modoVenta(regimen) === 'direct_checkout'
}

/* Lo que ANMaC pide para LLEVARSE cada cosa (no para poder pagarla sola, que
 * es lo que decide modoVenta). La cesta pregunta esto por cada línea para
 * saber qué credencial exigir antes de reservar: equivalente tipado de
 * REGIMEN en js/cart.js, indexado por el mismo campo que ya resuelve la
 * base (`product.regimen`) en vez de por la etiqueta en español. */
export type Requisitos = { clu: boolean; tccm: boolean; certificado: boolean }

const REQUISITOS: Record<Regimen, Requisitos> = {
  libre: { clu: false, tccm: false, certificado: false },
  'aire-comprimido': { clu: false, tccm: false, certificado: false },
  'uso-civil': { clu: true, tccm: false, certificado: false },
  'uso-civil-condicional': { clu: true, tccm: false, certificado: true },
  'requiere-tccm': { clu: true, tccm: true, certificado: false },
}

export function requisitos(regimen: Regimen): Requisitos {
  return REQUISITOS[regimen]
}
