'use client'

/* Solo el "abrir": a diferencia de Cart/Account, el panel de busqueda no
 * comparte datos con nadie mas -- solo necesita que HeaderActions (otra rama
 * del arbol) le diga que se muestre. Mismo mecanismo de tick que
 * CartContext/AccountContext/ConsultaContext. */

import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react'

type SearchContextValue = { abrirTick: number; abrir: () => void }

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [abrirTick, setAbrirTick] = useState(0)
  const abrir = useCallback(() => setAbrirTick((t) => t + 1), [])
  const value = useMemo(() => ({ abrirTick, abrir }), [abrirTick, abrir])
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch debe usarse dentro de <SearchProvider>')
  return ctx
}
