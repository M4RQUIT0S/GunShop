'use client'

/* Porta js/nav.js: el menu a pantalla completa, la barra que se encoge al
 * bajar, y el toggle que lo abre. <dialog> no sirve aqui -- el menu no es un
 * <dialog>, es un div a pantalla completa igual que el original -- asi que el
 * foco atrapado lo da `inert` sobre el resto de la pagina mientras esta
 * abierto, no algo nativo del elemento.
 *
 * El menu no sabe cuantos niveles tiene: recibe el arbol ya montado
 * (`lib/catalogo.ts#arbolMenu()`, que lee `family.parent_id` de Supabase) y
 * pinta una columna por cada nodo abierto. Con los datos de hoy eso son dos
 * columnas en Rifles (familia > kind) y tres en Municion (Municion > Recarga
 * > Polvoras); si manana la base gana un nivel, sale solo. Aqui no hay
 * ninguna lista de categorias escrita a mano. */

import Link from 'next/link'
import {
  useCallback, useEffect, useRef, useState, type ReactNode,
} from 'react'
import type { Nodo } from '@/lib/catalogo'

const FLECHA_ATRAS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M19 12H6M12 5l-7 7 7 7" />
  </svg>
)

const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

const FOTO_DEFECTO = '/img/model/rifle.webp'
const FOTO_CATALOGO = '/img/model/pistol.webp'

// Todas las fotos del arbol, para precargarlas de una: sin esto el primer
// paso por cada rama ensena el hueco mientras el fichero viaja.
function fotosDe(nodos: Nodo[]): string[] {
  return nodos.flatMap((n) => (n.foto ? [n.foto] : []).concat(fotosDe(n.hijos)))
}

export default function NavMenu({
  arbol, acciones, children,
}: {
  arbol: Nodo[]
  acciones: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  /* El camino abierto, por indices: [] es solo el nivel 1, [4] es Municion
   * desplegada, [4,2] es Municion > Recarga. Guardar el camino y no «que
   * nodo esta abierto» es lo que hace que el numero de columnas no este
   * escrito en ningun sitio. */
  const [camino, setCamino] = useState<number[]>([])
  const [foto, setFoto] = useState(FOTO_DEFECTO)
  const [stuck, setStuck] = useState(false)

  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const cerrado = useRef<number[] | null>(null)

  // Las columnas: la primera es el arbol entero, cada siguiente son los hijos
  // del nodo elegido en la anterior.
  const columnas: Nodo[][] = [arbol]
  const abiertos: Nodo[] = []
  camino.forEach((i) => {
    const nodo = columnas[columnas.length - 1][i]
    if (!nodo) return
    abiertos.push(nodo)
    columnas.push(nodo.hijos)
  })

  const cerrar = useCallback(() => {
    setOpen(false)
    toggleRef.current?.focus()
  }, [])

  // Recoge hasta dejar el camino en `n` niveles, no cierra el menu entero.
  const retroceder = useCallback((n: number) => {
    setCamino((c) => {
      cerrado.current = c
      return c.slice(0, n)
    })
  }, [])

  // La barra que se encoge al pasar los 40px de scroll -- el mismo umbral en
  // todas las paginas, no solo la portada.
  useEffect(() => {
    function onScroll() { setStuck(window.scrollY > 40) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const fotos = new Set([FOTO_DEFECTO, FOTO_CATALOGO, ...fotosDe(arbol)])
    fotos.forEach((src) => { new window.Image().src = src })
    // Solo al montar: el arbol no cambia entre renders del mismo layout.
  }, [])

  useEffect(() => {
    if (open) {
      menuRef.current?.querySelector<HTMLElement>('.nav__links a, .nav__links button')?.focus()
    } else {
      setCamino([])
    }
  }, [open])

  // El foco sigue al nivel: al abrir uno se va a su boton de volver, y al
  // recogerlo regresa al nodo que lo abrio.
  useEffect(() => {
    if (!open) return
    const previo = cerrado.current
    cerrado.current = null
    if (camino.length && (!previo || previo.length < camino.length)) {
      menuRef.current
        ?.querySelector<HTMLElement>('.menu__subs.is-ultima .menu__atras')
        ?.focus()
      return
    }
    if (!previo) return
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-camino="${previo.join('-')}"]`)
      ?.focus()
  }, [camino, open])

  // Al pasar a escritorio el panel deja de existir: hay que soltar el scroll.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 60rem)')
    function onChange(e: MediaQueryListEvent) { if (!e.matches) setOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Escape recoge un nivel cada vez y solo cierra el menu cuando ya no queda
  // ninguno: si cerrase todo de golpe, salir de una subcategoria por error
  // costaria volver a abrir el menu entero.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !open) return
      if (camino.length) retroceder(camino.length - 1)
      else cerrar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, camino, cerrar, retroceder])

  // Un <div> a pantalla completa no frena el scroll de detras por si solo.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  // Una columna del menu: enlace si el nodo es hoja, boton que despliega si
  // tiene hijos. Es la misma funcion en todos los niveles.
  function fila(nodo: Nodo, i: number, nivel: number) {
    const suCamino = [...camino.slice(0, nivel), i]
    const enfoca = () => setFoto(nodo.foto ?? abiertos[nivel - 1]?.foto ?? FOTO_DEFECTO)
    return (
      <li key={nodo.href + nodo.etiqueta} style={{ '--i': i } as React.CSSProperties}>
        {nodo.hijos.length ? (
          <button
            className="menu__cat"
            type="button"
            data-camino={suCamino.join('-')}
            aria-expanded={camino[nivel] === i}
            onClick={() => { enfoca(); setCamino(suCamino) }}
            onMouseEnter={enfoca}
            onFocus={enfoca}
          >
            {nodo.etiqueta}
            {CHEVRON}
          </button>
        ) : (
          <Link href={nodo.href} onMouseEnter={enfoca} onFocus={enfoca}>
            {nodo.etiqueta}
          </Link>
        )}
      </li>
    )
  }

  return (
    <>
      <div className="nav__backdrop" id="navBackdrop" aria-hidden="true" onClick={cerrar} />

      <header className={`nav${stuck ? ' is-stuck' : ''}`} id="nav">
        <div className="nav__inner">
          <button
            ref={toggleRef}
            className="nav__toggle"
            id="navToggle"
            type="button"
            aria-expanded={open}
            aria-controls="navMenu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="nav__bars" aria-hidden="true"><i /><i /><i /></span>
            <span className="nav__palabra" aria-hidden="true">
              <span className="nav__palabra-abre">Menú</span>
              <span className="nav__palabra-cierra">Cerrar</span>
              <span className="nav__palabra-ancha">Cerrar</span>
            </span>
            <span className="sr-only nav__label">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
          </button>
          {acciones}
        </div>
      </header>

      <div
        ref={menuRef}
        className={`nav__menu${open ? ' is-open' : ''}${camino.length ? ' is-nivel2' : ''}`}
        id="navMenu"
        onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false) }}
        onMouseLeave={() => setFoto(abiertos.at(-1)?.foto ?? FOTO_DEFECTO)}
      >
        <div className="menu__rejilla">
          <nav className="menu__nav" aria-label="Principal">
            <ul className="nav__links">
              <li style={{ '--i': 0 } as React.CSSProperties}>
                <Link
                  href="/catalogo"
                  onMouseEnter={() => setFoto(FOTO_CATALOGO)}
                  onFocus={() => setFoto(FOTO_CATALOGO)}
                >
                  Catálogo
                </Link>
              </li>
              {columnas[0].map((n, i) => fila(n, i, 0))}
            </ul>
          </nav>

          <div className="menu__derecha">
            {/* Una columna por nivel abierto, en cascada hacia la derecha. */}
            {columnas.slice(1).map((hijos, k) => (
              <div
                className={`menu__subs${k === columnas.length - 2 ? ' is-ultima' : ''}`}
                key={abiertos[k].href + abiertos[k].etiqueta}
              >
                <div className="menu__volver">
                  <button
                    className="menu__atras"
                    type="button"
                    onClick={() => retroceder(k)}
                  >
                    {FLECHA_ATRAS}
                    {abiertos[k].etiqueta}
                  </button>
                  <Link className="menu__todo" href={abiertos[k].href}>Ver todo</Link>
                </div>
                <ul className="nav__links">
                  {hijos.map((n, i) => fila(n, i, k + 1))}
                </ul>
              </div>
            ))}

            <div className="menu__foto" aria-hidden="true">
              <img id="menuFoto" src={foto} alt="" width={1200} height={750} />
            </div>
          </div>
        </div>
      </div>

      {/* El resto de la pagina queda fuera del foco mientras el menu esta
          abierto: `inert` es lo que impide que Tab se escape hacia el
          contenido tapado detras, que un <div> a pantalla completa no frena
          por si solo (a diferencia de un <dialog> modal). */}
      <div inert={open ? true : undefined} style={{ display: 'contents' }}>
        {children}
      </div>
    </>
  )
}
