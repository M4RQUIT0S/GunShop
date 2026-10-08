'use client'

/* Comparte que consulta abrir, igual que CartContext comparte la cesta entre
 * cabecera y ficha: ConsultaPanel vive en layout.tsx y quien pide abrirlo --
 * hoy solo la ficha de producto -- esta en otra rama del arbol.
 *
 * `abrir()` recibe titulo/rotulo/mensaje ya resueltos en vez de una clave de
 * TEMA: es lo unico que la ficha necesita (fase 5), y sirve igual de bien
 * para las cuatro consultas genericas (compra/taller/tramites/visita) que
 * porta fase 6 desde js/consulta.js -- esas solo tienen que llamar a abrir()
 * con su propio titulo/rotulo. */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type ConsultaDatos = { titulo: string; rotulo: string; mensaje: string }

/* Sin `cerrar()`: `datos` se queda puesto al cerrar el panel a proposito. Es lo
   que deja a ConsultaPanel conservar el borrador entre cerrar y reabrir; cada
   abrir() trae un objeto nuevo, asi que reabrir sigue disparando el panel. */
type ConsultaContextValue = {
  datos: ConsultaDatos | null
  abrir: (datos: ConsultaDatos) => void
}

const ConsultaContext = createContext<ConsultaContextValue | null>(null)

export function ConsultaProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<ConsultaDatos | null>(null)

  const value = useMemo(
    () => ({
      datos,
      abrir: (d: ConsultaDatos) => setDatos(d),
    }),
    [datos],
  )

  return <ConsultaContext.Provider value={value}>{children}</ConsultaContext.Provider>
}

export function useConsulta(): ConsultaContextValue {
  const ctx = useContext(ConsultaContext)
  if (!ctx) throw new Error('useConsulta debe usarse dentro de <ConsultaProvider>')
  return ctx
}
