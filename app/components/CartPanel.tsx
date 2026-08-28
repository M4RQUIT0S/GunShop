'use client'

/* Puerto de js/cart.js a partir de "--- panel ---": lineas, avisos y la
 * reserva. Que puede reservarse es logica pura en lib/cesta.ts (faltas(), que
 * corta lo que exige credencial ANMaC); aqui solo queda pintarlo y cablear el
 * <dialog>.
 *
 * Gotcha de la fase 6 (ver PLAN.md): NO se cablea crear_pedido() -- necesita
 * un perfil de cliente en la base, y la sesion de Google (AccountContext) solo
 * identifica: no crea `customer` ni pasa por la RLS de pedidos. Igual que hoy en
 * D:\GunShop (main), la reserva es enteramente del lado del cliente: se
 * apunta en localStorage['gunshop:pedidos'] y se ofrece un mailto: con el
 * detalle, no un pedido real contra la base. */

import { useEffect, useRef, useState } from 'react'
import { precio } from '@/lib/catalogo'
import { faltas, reserva as armarReserva, type Pedido } from '@/lib/cesta'
import { useCart } from './CartContext'
import { useAccount } from './AccountContext'

const PEDIDOS = 'gunshop:pedidos'

export default function CartPanel() {
  const {
    piezas, lineas, totalUsdCents, arsPorUsd, pon, vaciar, abrirTick,
  } = useCart()
  const { perfil } = useAccount()

  const ref = useRef<HTMLDialogElement>(null)
  const scrollPrevio = useRef('')
  const [hecho, setHecho] = useState<{ codigo: string; mailto: string } | null>(null)

  useEffect(() => {
    if (abrirTick === 0 || !ref.current || ref.current.open) return
    setHecho(null)
    scrollPrevio.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current.showModal()
  }, [abrirTick])

  function cerrar() {
    ref.current?.close()
  }

  const faltasList = faltas(lineas)
  const bloquea = lineas.length === 0 || faltasList.length > 0

  function reservar() {
    if (bloquea) return
    const { pedido, mailto } = armarReserva(lineas, perfil, arsPorUsd)
    try {
      const previos = JSON.parse(window.localStorage.getItem(PEDIDOS) ?? '[]') as Pedido[]
      previos.push(pedido)
      window.localStorage.setItem(PEDIDOS, JSON.stringify(previos.slice(-20)))
    } catch {
      // El resguardo en pantalla (mas abajo) vale igual sin persistirlo.
    }
    vaciar()
    setHecho({ codigo: pedido.codigo, mailto })
  }

  return (
    <dialog
      ref={ref}
      className="panel panel--side"
      id="cartPanel"
      aria-label="Cesta"
      onClose={() => { document.body.style.overflow = scrollPrevio.current }}
      onClick={(event) => { if (event.target === event.currentTarget) cerrar() }}
    >
      <div className="panel__box">
        <header className="panel__head">
          <div>
            <p className="eyebrow">Reserva en armería</p>
            <h2 className="panel__title">Cesta</h2>
            <p className="panel__resumen" id="cartResumen">
              {piezas > 0 ? `${piezas} ${piezas === 1 ? 'artículo' : 'artículos'}` : ''}
            </p>
          </div>
          <button className="panel__x" type="button" onClick={cerrar} aria-label="Cerrar la cesta">✕</button>
        </header>

        <div className="panel__lista" id="cartLines">
          {lineas.length === 0 ? (
            <p className="panel__vacio">
              La cesta está vacía. Las fichas del catálogo tienen el botón de añadir.
            </p>
          ) : (
            lineas.map((l) => (
              <div className="linea" key={l.producto.id}>
                {l.producto.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="linea__foto" src={l.producto.foto} alt="" width={96} height={60} loading="lazy" />
                ) : (
                  <span
                    className="linea__foto"
                    style={{
                      display: 'grid', placeItems: 'center', color: 'var(--gris)', fontSize: '0.65rem',
                    }}
                  >
                    Sin foto
                  </span>
                )}
                <div className="linea__cuerpo">
                  <p className="linea__name">{l.producto.marca} {l.producto.ref}</p>
                  <p className="linea__spec">
                    {l.producto.regimenEtiqueta} · {precio(l.producto.usdCents, arsPorUsd)} c/u
                  </p>
                  <div className="linea__mandos">
                    <button
                      className="linea__paso"
                      type="button"
                      aria-label={`Quitar una unidad de ${l.producto.marca} ${l.producto.ref}`}
                      onClick={() => pon(l.producto.id, l.n - 1)}
                    >
                      −
                    </button>
                    <span className="linea__n">{l.n}</span>
                    <button
                      className="linea__paso"
                      type="button"
                      aria-label={`Añadir una unidad de ${l.producto.marca} ${l.producto.ref}`}
                      onClick={() => pon(l.producto.id, l.n + 1)}
                    >
                      +
                    </button>
                    <button
                      className="linea__quita"
                      type="button"
                      aria-label={`Quitar ${l.producto.marca} ${l.producto.ref} de la cesta`}
                      onClick={() => pon(l.producto.id, 0)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                <p className="linea__total">{precio(l.producto.usdCents * l.n, arsPorUsd)}</p>
              </div>
            ))
          )}
        </div>

        <div className="panel__avisos" id="cartAvisos">
          {faltasList.map((t) => <p className="aviso aviso--falta" key={t}>{t}</p>)}
        </div>

        <footer className="panel__pie">
          <p className="panel__total"><span>Total</span><span id="cartTotal">{precio(totalUsdCents, arsPorUsd)}</span></p>
          <button className="btn" type="button" id="cartReserva" disabled={bloquea} onClick={reservar}>
            Reservar en la armería
          </button>
          {hecho && (
            <div className="hecho" id="cartHecho">
              <p className="hecho__cod">Reserva {hecho.codigo}</p>
              <p>
                Guardada 72 h. Te esperamos con el DNI; el resto se hace en el
                mostrador.
              </p>
              <a className="btn btn--ghost" href={hecho.mailto}>Enviarla al taller</a>
            </div>
          )}
        </footer>
      </div>
    </dialog>
  )
}
