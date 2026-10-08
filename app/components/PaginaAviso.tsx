import type { ReactNode } from 'react'

/* Pagina corta de aviso -- error, 404 -- con el mismo marco que /privacidad.
 * Sin estado ni datos: la usan error.tsx (cliente) y not-found.tsx (servidor),
 * y ninguna de las dos puede contar con que Supabase responda. */
export default function PaginaAviso({
  eyebrow, titulo, children,
}: { eyebrow: string; titulo: string; children: ReactNode }) {
  return (
    <main id="contenido" className="section" style={{ paddingTop: 'calc(var(--nav-h-ancha) + 1rem)' }}>
      <div className="wrap">
        <div className="catalog__head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="h-section">{titulo}</h1>
          </div>
        </div>
        <div className="legal aviso-pagina">{children}</div>
      </div>
    </main>
  )
}
