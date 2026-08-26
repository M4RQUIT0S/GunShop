'use client'

/* Scaffold: marcado y estructura de index.html lineas 588-606. La logica de
 * lineas, avisos de regimen y reserva -- js/cart.js a partir de "--- panel
 * ---" -- se porta en la fase 6. Lo unico vivo aca es el resumen, que ya lee
 * CartContext para probar que header y panel comparten el mismo estado. */

import { useCart } from './CartContext'

export default function CartPanel() {
  const { piezas } = useCart()

  return (
    <dialog className="panel panel--side" id="cartPanel" aria-label="Cesta">
      <div className="panel__box">
        <header className="panel__head">
          <div>
            <p className="eyebrow">Reserva en armería</p>
            <h2 className="panel__title">Cesta</h2>
            <p className="panel__resumen" id="cartResumen">
              {piezas > 0 ? `${piezas} ${piezas === 1 ? 'artículo' : 'artículos'}` : ''}
            </p>
          </div>
          <button className="panel__x" type="button" data-cierra="" aria-label="Cerrar la cesta">✕</button>
        </header>
        <div className="panel__lista" id="cartLines">
          <p className="panel__vacio">
            La cesta está vacía. Las fichas del catálogo tienen el botón de añadir.
          </p>
        </div>
        <div className="panel__avisos" id="cartAvisos" />
        <footer className="panel__pie">
          <p className="panel__total"><span>Total</span><span id="cartTotal">$ 0</span></p>
          <button className="btn" type="button" id="cartReserva">Reservar en la armería</button>
          <div className="hecho" id="cartHecho" hidden />
        </footer>
      </div>
    </dialog>
  )
}
