'use client'

/* Porta js/nav.js: el menu a pantalla completa, la barra que se encoge al
 * bajar, y el toggle que lo abre. <dialog> no sirve aqui -- el menu no es un
 * <dialog>, es un div a pantalla completa igual que el original -- asi que el
 * foco atrapado lo da `inert` sobre el resto de la pagina mientras esta
 * abierto, no algo nativo del elemento.
 *
 * El nivel 1 son las familias mismas (Rifles, Escopetas...), no una entrada
 * «Familias» que hay que abrir primero; al pulsar una, sus subcategorias se
 * despliegan a la derecha, en la columna de la foto. Ni las familias ni las
 * subcategorias son una lista escrita aqui: salen de Supabase via Nav
 * (`familias()` y `subsPorFamilia()`), asi que una familia o un `kind` nuevo
 * en la base aparece en el menu solo. */

import Link from 'next/link'
import {
  useCallback, useEffect, useRef, useState, type ReactNode,
} from 'react'

type Familia = { slug: string; name: string; model_key: string | null }

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

const fotoDe = (f: Familia) => (f.model_key ? `/img/model/${f.model_key}.webp` : FOTO_DEFECTO)

export default function NavMenu({
  familias, subs, acciones, children,
}: {
  familias: Familia[]
  subs: Record<string, string[]>
  acciones: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Slug de la familia con las subcategorias desplegadas, o null.
  const [abierta, setAbierta] = useState<string | null>(null)
  const [foto, setFoto] = useState(FOTO_DEFECTO)
  const [stuck, setStuck] = useState(false)

  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const subsRef = useRef<HTMLDivElement>(null)
  const familiaCerrada = useRef<string | null>(null)

  const familia = familias.find((f) => f.slug === abierta) ?? null

  const cerrar = useCallback(() => {
    setOpen(false)
    toggleRef.current?.focus()
  }, [])

  const volver = useCallback(() => {
    familiaCerrada.current = abierta
    setAbierta(null)
  }, [abierta])

  // La barra que se encoge al pasar los 40px de scroll -- el mismo umbral en
  // todas las paginas, no solo la portada.
  useEffect(() => {
    function onScroll() { setStuck(window.scrollY > 40) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Precarga: sin esto el primer paso por cada familia ensena el hueco
  // mientras el fichero viaja. Una vez, al montar, como en niveles().
  useEffect(() => {
    const fotos = new Set([FOTO_DEFECTO, '/img/model/pistol.webp', ...familias.map(fotoDe)])
    fotos.forEach((src) => { new window.Image().src = src })
    // Solo al montar: `familias` no cambia entre renders del mismo layout.
  }, [])

  useEffect(() => {
    if (open) {
      const first = menuRef.current?.querySelector<HTMLElement>('.nav__links a, .nav__links button')
      first?.focus()
    } else {
      setAbierta(null)
    }
  }, [open])

  useEffect(() => {
    if (abierta) {
      subsRef.current?.querySelector<HTMLElement>('.menu__atras')?.focus()
      return
    }
    // Al cerrar el despliegue, el foco vuelve al boton de la familia.
    const cual = familiaCerrada.current
    if (!cual || !open) return
    familiaCerrada.current = null
    menuRef.current?.querySelector<HTMLElement>(`[data-familia="${cual}"]`)?.focus()
  }, [abierta, open])

  // Al pasar a escritorio el panel deja de existir: hay que soltar el scroll.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 60rem)')
    function onChange(e: MediaQueryListEvent) { if (!e.matches) setOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Escape recoge primero el despliegue y solo despues cierra el menu: si
  // cerrase las dos cosas de golpe, salir de una subcategoria por error
  // costaria volver a abrir el menu entero.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !open) return
      if (abierta) volver()
      else cerrar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, abierta, cerrar, volver])

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
        className={`nav__menu${open ? ' is-open' : ''}${abierta ? ' is-nivel2' : ''}`}
        id="navMenu"
        onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false) }}
        onMouseLeave={() => setFoto(familia ? fotoDe(familia) : FOTO_DEFECTO)}
      >
        <div className="menu__rejilla">
          <nav className="menu__nav" aria-label="Principal">
            <ul className="nav__links">
              <li style={{ '--i': 0 } as React.CSSProperties}>
                <Link
                  href="/catalogo"
                  onMouseEnter={() => setFoto('/img/model/pistol.webp')}
                  onFocus={() => setFoto('/img/model/pistol.webp')}
                >
                  Catálogo
                </Link>
              </li>
              {familias.map((f, i) => (
                <li key={f.slug} style={{ '--i': i + 1 } as React.CSSProperties}>
                  <button
                    className="menu__cat"
                    type="button"
                    data-familia={f.slug}
                    aria-expanded={abierta === f.slug}
                    aria-controls="menuSubs"
                    onClick={() => {
                      setFoto(fotoDe(f))
                      setAbierta((a) => (a === f.slug ? null : f.slug))
                    }}
                    onMouseEnter={() => setFoto(fotoDe(f))}
                    onFocus={() => setFoto(fotoDe(f))}
                  >
                    {f.name}
                    {CHEVRON}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="menu__derecha">
            {familia && (
              <div className="menu__subs" id="menuSubs" ref={subsRef}>
                <div className="menu__volver">
                  <button className="menu__atras" type="button" onClick={volver}>
                    {FLECHA_ATRAS}
                    {familia.name}
                  </button>
                  <Link className="menu__todo" href={`/catalogo?familia=${familia.slug}`}>
                    Ver todo
                  </Link>
                </div>
                <ul className="nav__links">
                  {(subs[familia.slug] ?? []).map((kind, i) => (
                    <li key={kind} style={{ '--i': i } as React.CSSProperties}>
                      <Link
                        href={`/catalogo?familia=${familia.slug}&sub=${encodeURIComponent(kind)}`}
                      >
                        {kind}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
