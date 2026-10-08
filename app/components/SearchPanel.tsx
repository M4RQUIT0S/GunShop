'use client'

/* Puerto de js/search.js. No pide nada a ningun sitio propio: busca sobre el
 * catalogo que CartContext ya carga una vez por pagina (antes lo pedia aparte
 * al abrirse), y filtra en cliente con lib/buscar.ts. Mientras ese catalogo
 * carga o si fallo, lo dice: un «nada con...» antes de tener datos mentia
 * (UX-AUDIT.md, Doherty). "Ver en el catalogo"
 * cierra el panel y navega a /catalogo?q=... -- ahi vive la otra mitad de la
 * busqueda: `q` entra en "Todo" y cruza con el calibre, igual que
 * `shop.catalog.buscar()` + `fuente()` hacian en el sitio estatico
 * (js/main.js). Sin `LINES` ni una rejilla compartida en esta app, ese
 * `?q=` es el unico canal que conecta el panel con el catalogo. */

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { buscar } from '@/lib/buscar'
import { slugDe } from '@/lib/catalogo'
import { useSearch } from './SearchContext'
import { useCart } from './CartContext'

const TOPE = 8

export default function SearchPanel() {
  const { abrirTick } = useSearch()
  const { productos, catalogo, recargarCatalogo } = useCart()
  const router = useRouter()

  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollPrevio = useRef('')

  const [q, setQ] = useState('')
  /* Se navega dentro de una transicion y el panel se cierra al llegar, no al
   * pulsar: antes se cerraba en el acto y quedaba a la vista la pagina vieja
   * mientras llegaba la nueva, ~650 ms sin señal (UX-AUDIT.md, tercera pasada,
   * W1). Mientras tanto, el punto de `.pendiente` late en lo pulsado. */
  const [yendo, startTransition] = useTransition()
  const [destino, setDestino] = useState<string | null>(null)

  useEffect(() => {
    if (abrirTick === 0 || !ref.current || ref.current.open) return
    scrollPrevio.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setQ('')
    ref.current.showModal()
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [abrirTick])

  function cerrar() {
    ref.current?.close()
  }

  const texto = q.trim()
  const hallados = texto ? buscar(productos, texto) : []

  function limpiar() {
    setQ('')
    inputRef.current?.focus()
  }

  function ir(href: string) {
    setDestino(href)
    startTransition(() => router.push(href))
  }

  useEffect(() => {
    if (yendo || !destino) return
    setDestino(null)
    cerrar()
  }, [yendo, destino])

  function manda(busqueda: string) {
    ir(`/catalogo?q=${encodeURIComponent(busqueda)}`)
  }

  const pendiente = (href: string) => (
    <span className={`pendiente${yendo && destino === href ? ' is-on' : ''}`} aria-hidden="true" />
  )

  return (
    <dialog
      ref={ref}
      className="panel panel--top"
      id="searchPanel"
      aria-label="Buscar en el catálogo"
      onClose={() => { document.body.style.overflow = scrollPrevio.current }}
      onClick={(event) => { if (event.target === event.currentTarget) cerrar() }}
    >
      <div className="panel__box">
        <form
          className="panel__buscar"
          id="searchForm"
          role="search"
          onSubmit={(event) => { event.preventDefault(); if (hallados.length) manda(texto) }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
          <input
            ref={inputRef}
            id="searchInput"
            name="q"
            type="search"
            autoComplete="off"
            spellCheck="false"
            placeholder="Marca, modelo, calibre o familia"
            aria-label="Buscar en el catálogo"
            value={q}
            onChange={(event) => setQ(event.currentTarget.value)}
          />
          <button className="panel__x" type="button" onClick={cerrar} aria-label="Cerrar la búsqueda">✕</button>
        </form>

        <div className="panel__lista" id="searchLista">
          {!texto && (
            <p className="panel__vacio">
              Marca, modelo, calibre o familia: «Glock», «.308», «munición», «maleta».
            </p>
          )}
          {texto && catalogo === 'cargando' && (
            <p className="panel__vacio" role="status">Cargando el catálogo…</p>
          )}
          {catalogo === 'error' && (
            <div className="panel__vacio" role="alert">
              <p>No se pudo cargar el catálogo.</p>
              <button className="btn btn--ghost" type="button" onClick={recargarCatalogo}>Reintentar</button>
            </div>
          )}
          {texto && catalogo === 'listo' && !hallados.length && (
            <div className="panel__vacio" role="status">
              <p>No hay resultados para «{texto}».</p>
              <button className="btn btn--ghost" type="button" onClick={limpiar}>Limpiar la búsqueda</button>
            </div>
          )}
          {/* Una sugerencia abre su ficha, como en cualquier tienda; antes
              llevaba a un catalogo con esa sola tarjeta y hacia falta otro
              clic (UX-AUDIT.md, segunda pasada, W3). `?q=` hace que el
              «volver» de la ficha regrese a estos resultados. El boton de
              abajo sigue llevando a todos. */}
          {hallados.slice(0, TOPE).map((p) => {
            const href = `/producto/${slugDe(p)}?q=${encodeURIComponent(texto)}`
            return (
              <Link
                key={p.id}
                className="sug"
                href={href}
                onClick={(event) => {
                  // Con una tecla de modificador (otra pestaña) manda el navegador.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                  event.preventDefault()
                  ir(href)
                }}
              >
                <span className="sug__name">{p.marca} {p.ref}</span>
                <span className="sug__spec">{p.kind} · {p.regimenEtiqueta}</span>
                {pendiente(href)}
              </Link>
            )
          })}
        </div>

        {hallados.length > 0 && (
          <div className="panel__pie" id="searchPie">
            <button className="btn" type="button" id="searchVer" aria-busy={yendo} onClick={() => manda(texto)}>
              {hallados.length === 1
                ? 'Ver la referencia en el catálogo'
                : `Ver las ${hallados.length} referencias en el catálogo`}
              {pendiente(`/catalogo?q=${encodeURIComponent(texto)}`)}
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
