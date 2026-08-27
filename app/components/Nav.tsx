import Link from 'next/link'
import { familias, subsPorFamilia, arbolMenu } from '@/lib/catalogo'
import NavMenu from './NavMenu'
import HeaderActions from './HeaderActions'

/* Server Component: lee las familias una vez por render de servidor y se las
 * pasa a NavMenu (cliente), que es quien de verdad necesita interactividad.
 * La marca es estatica y se resuelve aqui mismo; los tres botones de accion
 * (buscar/cuenta/cesta) si necesitan abrir sus paneles, asi que viven en
 * HeaderActions (cliente) -- un Server Component no puede llevar onClick. */

export default async function Nav({ children }: { children: React.ReactNode }) {
  const [fams, subs] = await Promise.all([familias(), subsPorFamilia()])
  const arbol = arbolMenu(fams, subs)

  return (
    <NavMenu
      arbol={arbol}
      acciones={(
        <>
          <Link className="brand" href="/" aria-label="Armería Alcántara, inicio">
            <span className="brand__name">Alcántara</span>
            <span className="brand__meta">Armería · Buenos Aires</span>
          </Link>

          <HeaderActions />
        </>
      )}
    >
      {children}
    </NavMenu>
  )
}
