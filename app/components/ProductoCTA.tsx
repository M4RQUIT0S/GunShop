'use client'

/* El boton de la ficha. `direct_checkout` anade a la cesta (mismo CartContext
 * que usa el header); el resto de regimenes no puede despachar sin que
 * alguien mire una credencial (lib/regimen.ts), asi que abre ConsultaPanel
 * en vez de vender.
 *
 * El boton no guarda si el producto ya esta en la cesta: se lo pregunta a
 * CartContext en cada render, igual que hacia la ficha del sitio estatico con
 * window.GunShop.cart (CLAUDE.md: "la ficha no tiene estado propio"). */

import { useCart } from './CartContext'
import { useConsulta } from './ConsultaContext'
import type { ModoVenta } from '@/lib/catalogo'

type Props = {
  producto: { id: number; marca: string; ref: string }
  modo: ModoVenta
}

export default function ProductoCTA({ producto, modo }: Props) {
  const { unidades, add } = useCart()
  const { abrir } = useConsulta()

  if (modo === 'direct_checkout') {
    const cant = unidades[producto.id] ?? 0
    return (
      <button
        type="button"
        className={`card__add ficha__cta${cant ? ' is-added' : ''}`}
        onClick={() => add(producto.id)}
      >
        {cant ? `En la cesta (${cant})` : 'Añadir a la cesta'}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="card__add ficha__cta"
      onClick={() => abrir({
        titulo: `Consultar: ${producto.marca} ${producto.ref}`,
        rotulo: 'Cuéntenos qué necesita saber',
        mensaje: `Quisiera más información sobre ${producto.marca} ${producto.ref}.`,
      })}
    >
      Consultar
    </button>
  )
}
