'use client'

/* La burbuja de unidades sobre el icono de la cesta. Unico motivo por el que
 * el boton de la cesta necesita un cliente: lee CartContext para no quedarse
 * en el "0" fijo del marcado estatico. */

import { useCart } from './CartContext'

export default function CartCount() {
  const { piezas } = useCart()
  return (
    <span className={`cart__count${piezas > 0 ? ' is-on' : ''}`} aria-hidden="true">
      {piezas}
    </span>
  )
}
