/* Scaffold: marcado de index.html lineas 571-586. Sin 'use client' -- todavia
 * no hace falta, no hay handlers. La busqueda de verdad (lib/buscar.ts sobre
 * llano()/buscar()) y el abrir/cerrar se portan en la fase 6. */

export default function SearchPanel() {
  return (
    <dialog className="panel panel--top" id="searchPanel" aria-label="Buscar en el catálogo">
      <div className="panel__box">
        <form className="panel__buscar" id="searchForm" role="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
          <input
            id="searchInput"
            name="q"
            type="search"
            autoComplete="off"
            spellCheck="false"
            placeholder="Marca, modelo, calibre o familia"
            aria-label="Buscar en el catálogo"
          />
          <button className="panel__x" type="button" data-cierra="" aria-label="Cerrar la búsqueda">✕</button>
        </form>
        <div className="panel__lista" id="searchLista" />
        <div className="panel__pie" id="searchPie" hidden>
          <button className="btn" type="button" id="searchVer">Ver en el catálogo</button>
        </div>
      </div>
    </dialog>
  )
}
