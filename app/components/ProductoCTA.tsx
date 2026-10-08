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
  const { unidades, add, catalogo, recargarCatalogo } = useCart()
  const { abrir } = useConsulta()

  if (modo === 'direct_checkout') {
    const cant = unidades[producto.id] ?? 0
    // add() no hace nada sin el catalogo (lo necesita para el gate legal): el
    // boton no se ofrece activo hasta tenerlo, y si fallo, reintenta.
    if (catalogo === 'error') {
      return (
        <button type="button" className="card__add ficha__cta" onClick={recargarCatalogo}>
          No se pudo cargar · Reintentar
        </button>
      )
    }
    // El boton dice lo que hace y el estado va aparte. Antes pasaba a «En la
    // cesta (1)» y volver a pulsarlo sumaba otra unidad sin decirlo
    // (UX-AUDIT.md, tercera pasada, W2). El estado se pinta siempre, vacio si
    // no hay nada: una region role="status" que aparece de golpe no siempre se
    // anuncia, y una que cambia si.
    return (
      <div className="ficha__accion">
        <button
          type="button"
          className={`card__add ficha__cta${cant ? ' is-added' : ''}`}
          disabled={catalogo === 'cargando'}
          aria-busy={catalogo === 'cargando'}
          onClick={() => add(producto.id)}
        >
          {cant ? 'Añadir otra unidad' : 'Añadir a la cesta'}
        </button>
        <p className="ficha__en-cesta" role="status">{cant ? `En la cesta: ${cant}` : ''}</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="card__add ficha__cta"
      onClick={() => abrir({
        titulo: `Consultar: ${producto.marca} ${producto.ref}`,
        rotulo: 'Contanos qué necesitás saber',
        mensaje: `Quisiera más información sobre ${producto.marca} ${producto.ref}.`,
      })}
    >
      Consultar
    </button>
  )
}
