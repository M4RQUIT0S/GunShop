import Link from 'next/link'
import { familias } from '@/lib/catalogo'
import NavMenu from './NavMenu'
import CartCount from './CartCount'

/* Server Component: lee las familias una vez por render de servidor y se las
 * pasa a NavMenu (cliente), que es quien de verdad necesita interactividad.
 * La marca y los botones de accion tambien se resuelven aqui -- no piden
 * estado propio, salvo el contador de la cesta -- y viajan como children
 * hacia el cliente sin dejar de renderizarse en el servidor. */

export default async function Nav({ children }: { children: React.ReactNode }) {
  const fams = await familias()

  return (
    <NavMenu
      familias={fams}
      acciones={(
        <>
          <Link className="brand" href="/" aria-label="Armería Alcántara, inicio">
            <span className="brand__name">Alcántara</span>
            <span className="brand__meta">Armería · Buenos Aires</span>
          </Link>

          <div className="nav__actions">
            {/* Fase 6: onClick abre searchPanel/accountPanel via
                showModal(); por ahora es marcado, no logica. */}
            <button className="icon-btn" id="btnSearch" type="button" aria-label="Buscar en el catálogo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
            </button>
            <button className="icon-btn" id="btnAccount" type="button" aria-label="Mi cuenta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <circle cx="12" cy="8.5" r="4" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
              <span className="icon-btn__ini" aria-hidden="true" hidden />
            </button>
            <button className="icon-btn cart" id="btnCart" type="button" aria-label="Cesta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M4 7h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z" />
                <path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7" />
              </svg>
              <CartCount />
            </button>
            <a className="nav__visita" href="/#contacto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <span>Visitar la armería</span>
            </a>
          </div>
        </>
      )}
    >
      {children}
    </NavMenu>
  )
}
