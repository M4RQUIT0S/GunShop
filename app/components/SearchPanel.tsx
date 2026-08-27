'use client'

/* Puerto de js/search.js. No pide nada a ningun sitio propio: busca sobre
 * listaProductos(), pedido una sola vez (al abrirse la primera vez, no en
 * cada tecla), y filtra en cliente con lib/buscar.ts. "Ver en el catalogo"
 * cierra el panel y navega a /catalogo?q=... -- ahi vive la otra mitad de la
 * busqueda: `q` entra en "Todo" y cruza con el calibre, igual que
 * `shop.catalog.buscar()` + `fuente()` hacian en el sitio estatico
 * (js/main.js). Sin `LINES` ni una rejilla compartida en esta app, ese
 * `?q=` es el unico canal que conecta el panel con el catalogo. */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listaProductos, type Producto } from '@/lib/catalogo'
import { buscar } from '@/lib/buscar'
import { useSearch } from './SearchContext'

const TOPE = 8

export default function SearchPanel() {
  const { abrirTick } = useSearch()
  const router = useRouter()

  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollPrevio = useRef('')

  const [productos, setProductos] = useState<Producto[]>([])
  const [cargado, setCargado] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (abrirTick === 0 || !ref.current || ref.current.open) return
    scrollPrevio.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setQ('')
    ref.current.showModal()
    inputRef.current?.focus()
    inputRef.current?.select()
    if (!cargado) {
      listaProductos().then((p) => {
        setProductos(p)
        setCargado(true)
      })
    }
    // Solo depende de abrirTick: `cargado` se lee, no se observa, para que
    // esto no vuelva a correr cuando la carga termina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirTick])

  function cerrar() {
    ref.current?.close()
  }

  const texto = q.trim()
  const hallados = texto ? buscar(productos, texto) : []

  function manda(destino: string) {
    cerrar()
    router.push(`/catalogo?q=${encodeURIComponent(destino)}`)
  }

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
          {texto && !hallados.length && (
            <p className="panel__vacio">
              Nada con «{texto}». Lo que no está en vitrina se encarga: pregunta en el taller.
            </p>
          )}
          {hallados.slice(0, TOPE).map((p) => (
            <button
              key={p.id}
              type="button"
              className="sug"
              onClick={() => manda(`${p.marca} ${p.ref}`)}
            >
              <span className="sug__name">{p.marca} {p.ref}</span>
              <span className="sug__spec">{p.kind} · {p.regimenEtiqueta}</span>
            </button>
          ))}
        </div>

        {hallados.length > 0 && (
          <div className="panel__pie" id="searchPie">
            <button className="btn" type="button" id="searchVer" onClick={() => manda(texto)}>
              {hallados.length === 1
                ? 'Ver la referencia en el catálogo'
                : `Ver las ${hallados.length} referencias en el catálogo`}
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
