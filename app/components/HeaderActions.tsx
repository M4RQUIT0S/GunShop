'use client'

/* Los tres botones de la barra (buscar/cuenta/cesta). Viven en su propio
 * cliente porque Nav.tsx es un Server Component y no puede llevar onClick: le
 * pasa este componente ya montado dentro de `acciones`, igual que ya hacia
 * con <CartCount/>. Cada boton solo dispara el `abrir()` de su Context; el
 * <dialog> que de verdad abre vive en su propio panel (CartPanel/
 * AccountPanel/SearchPanel), igual que en el sitio estatico cada modulo
 * (cart.js/account.js/search.js) escuchaba su propio boton por id. */

import Link from 'next/link'
import { useCart } from './CartContext'
import { useAccount } from './AccountContext'
import { useSearch } from './SearchContext'
import CartCount from './CartCount'

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2)
    .map((t) => t.charAt(0).toUpperCase()).join('')
}

export default function HeaderActions() {
  const { abrir: abrirCesta } = useCart()
  const { abrir: abrirCuenta, perfil } = useAccount()
  const { abrir: abrirBusqueda } = useSearch()

  return (
    <div className="nav__actions">
      <button
        className="icon-btn"
        id="btnSearch"
        type="button"
        aria-label="Buscar en el catálogo"
        onClick={abrirBusqueda}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      </button>
      <button
        className={`icon-btn${perfil ? ' is-on' : ''}`}
        id="btnAccount"
        type="button"
        aria-label={perfil ? `Mi cuenta · ${perfil.nombre}` : 'Mi cuenta'}
        onClick={abrirCuenta}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="12" cy="8.5" r="4" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
        <span className="icon-btn__ini" aria-hidden="true" hidden={!perfil}>
          {perfil ? iniciales(perfil.nombre) : ''}
        </span>
      </button>
      <button className="icon-btn cart" id="btnCart" type="button" aria-label="Cesta" onClick={abrirCesta}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M4 7h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z" />
          <path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7" />
        </svg>
        <CartCount />
      </button>
      <Link className="nav__visita" href="/#contacto">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        <span>Visitar la armería</span>
      </Link>
    </div>
  )
}
