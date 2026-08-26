'use client'

/* Porta js/nav.js: el menu de dos niveles a pantalla completa, la barra que
 * se encoge al bajar, y el toggle que lo abre. <dialog> no sirve aqui -- el
 * menu no es un <dialog>, es un div a pantalla completa igual que el
 * original -- asi que el foco atrapado lo da `inert` sobre el resto de la
 * pagina mientras esta abierto, no algo nativo del elemento.
 *
 * El segundo nivel de "Familias" sale de `familias`, la prop que le pasa Nav
 * (Server Component via lib/catalogo.ts), no de la variable LINES de
 * js/catalog.js -- esa no existe en esta app. */

import Link from 'next/link'
import {
  useCallback, useEffect, useRef, useState, type ReactNode,
} from 'react'

type Familia = { slug: string; name: string; model_key: string | null }
type Seccion = 'familias' | 'taller' | null

const FLECHA_ATRAS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M19 12H6M12 5l-7 7 7 7" />
  </svg>
)

const FOTO_DEFECTO = '/img/model/rifle.webp'

const NIVEL1: Array<
  { label: string; foto: string } & ({ seccion: 'familias' | 'taller' } | { href: string })
> = [
  { label: 'Familias', seccion: 'familias', foto: FOTO_DEFECTO },
  { label: 'Catálogo', href: '/catalogo', foto: '/img/model/pistol.webp' },
  { label: 'Taller', seccion: 'taller', foto: '/img/model/optic.webp' },
  { label: 'Marcas', href: '/#marcas', foto: '/img/model/shotgun.webp' },
  { label: 'Requisitos', href: '/#preguntas', foto: '/img/model/cartridge.webp' },
  { label: 'Contacto', href: '/#contacto', foto: '/img/model/gcase.webp' },
]

const TALLER = [
  { label: 'Cita y elección', href: '/#paso-1', foto: '/img/model/binocular.webp' },
  { label: 'Papeles', href: '/#paso-2', foto: '/img/model/gcase.webp' },
  { label: 'Taller', href: '/#paso-3', foto: '/img/model/optic.webp' },
  { label: 'Entrega y revisión', href: '/#paso-4', foto: '/img/model/reddot.webp' },
]

export default function NavMenu({
  familias, acciones, children,
}: {
  familias: Familia[]
  acciones: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [seccion, setSeccion] = useState<Seccion>(null)
  const [foto, setFoto] = useState(FOTO_DEFECTO)
  const [stuck, setStuck] = useState(false)

  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const seccionCerrada = useRef<Seccion>(null)

  const cerrar = useCallback(() => {
    setOpen(false)
    toggleRef.current?.focus()
  }, [])

  const volver = useCallback(() => {
    seccionCerrada.current = seccion
    setSeccion(null)
  }, [seccion])

  // La barra que se encoge al pasar los 40px de scroll -- el mismo umbral en
  // todas las paginas, no solo la portada.
  useEffect(() => {
    function onScroll() { setStuck(window.scrollY > 40) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Precarga: sin esto el primer paso por cada enlace ensena el hueco
  // mientras el fichero viaja. Una vez, al montar, como en niveles().
  useEffect(() => {
    const fotos = new Set([
      ...NIVEL1.map((n) => n.foto),
      ...TALLER.map((t) => t.foto),
      ...familias.filter((f) => f.model_key).map((f) => `/img/model/${f.model_key}.webp`),
    ])
    fotos.forEach((src) => { new window.Image().src = src })
    // Solo al montar, como niveles() en el original: `familias` no cambia
    // entre renders del mismo layout.
  }, [])

  useEffect(() => {
    if (open) {
      const first = menuRef.current?.querySelector<HTMLElement>('.nav__links a, .nav__links button')
      first?.focus()
    } else {
      setSeccion(null)
    }
  }, [open])

  useEffect(() => {
    if (seccion) {
      const atras = menuRef.current?.querySelector<HTMLElement>(
        `.menu__seccion[data-seccion="${seccion}"] .menu__atras`,
      )
      atras?.focus()
      return
    }
    // Al volver a nivel1, el foco regresa al boton que abrio la seccion.
    const cual = seccionCerrada.current
    if (!cual || !open) return
    seccionCerrada.current = null
    const boton = menuRef.current?.querySelector<HTMLElement>(`[data-seccion="${cual}"][aria-expanded]`)
    boton?.focus()
  }, [seccion, open])

  // Al pasar a escritorio el panel deja de existir: hay que soltar el scroll.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 60rem)')
    function onChange(e: MediaQueryListEvent) { if (!e.matches) setOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open) cerrar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, cerrar])

  // Un <div> a pantalla completa no frena el scroll de detras por si solo.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

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
        className={`nav__menu${open ? ' is-open' : ''}${seccion ? ' is-nivel2' : ''}`}
        id="navMenu"
        onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false) }}
        onMouseLeave={() => setFoto(FOTO_DEFECTO)}
      >
        <div className="menu__rejilla">
          <nav className="menu__nav" aria-label="Principal">
            <ul className="nav__links" id="navNivel1">
              {NIVEL1.map((item, i) => (
                <li key={item.label} style={{ '--i': i } as React.CSSProperties}>
                  {'seccion' in item ? (
                    <button
                      type="button"
                      data-seccion={item.seccion}
                      data-foto={item.foto}
                      aria-expanded={seccion === item.seccion}
                      onClick={() => setSeccion(item.seccion)}
                      onMouseEnter={() => setFoto(item.foto)}
                      onFocus={() => setFoto(item.foto)}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      data-foto={item.foto}
                      onMouseEnter={() => setFoto(item.foto)}
                      onFocus={() => setFoto(item.foto)}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <div className="menu__seccion" data-seccion="taller" hidden={seccion !== 'taller'}>
              <div className="menu__volver">
                <button className="menu__atras" type="button" onClick={volver}>
                  {FLECHA_ATRAS}
                  Taller
                </button>
                <Link className="menu__todo" href="/#taller">Ver todo</Link>
              </div>
              <ul className="nav__links">
                {TALLER.map((item, i) => (
                  <li key={item.label} style={{ '--i': i } as React.CSSProperties}>
                    <Link
                      href={item.href}
                      data-foto={item.foto}
                      onMouseEnter={() => setFoto(item.foto)}
                      onFocus={() => setFoto(item.foto)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="menu__seccion" data-seccion="familias" hidden={seccion !== 'familias'}>
              <div className="menu__volver">
                <button className="menu__atras" type="button" onClick={volver}>
                  {FLECHA_ATRAS}
                  Familias
                </button>
                <Link className="menu__todo" href="/#familias">Ver todo</Link>
              </div>
              <ul className="nav__links">
                {familias.map((f, i) => {
                  const fotoFamilia = f.model_key ? `/img/model/${f.model_key}.webp` : FOTO_DEFECTO
                  return (
                    <li key={f.slug} style={{ '--i': i } as React.CSSProperties}>
                      <Link
                        href={`/catalogo?familia=${f.slug}`}
                        data-foto={fotoFamilia}
                        onMouseEnter={() => setFoto(fotoFamilia)}
                        onFocus={() => setFoto(fotoFamilia)}
                      >
                        {f.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          <div className="menu__foto" aria-hidden="true">
            <img id="menuFoto" src={foto} alt="" width={1200} height={750} />
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
