'use client'

/* Reemplaza al singleton window.GunShop.cart del sitio estatico (js/cart.js).
 * Header, ficha y panel necesitan leer y tocar la misma cesta, y en React eso
 * es un Context, no una variable global.
 *
 * Guarda solo `{id: unidades}`, igual que el original: el producto (precio,
 * nombre, regimen) se vuelve a resolver contra el catalogo al pintar, nunca
 * se guarda la ficha entera. La logica de lineas, avisos de regimen y reserva
 * -- lo que en js/cart.js vive despues de "--- panel ---" -- se porta en la
 * fase 6, cuando el panel deja de ser un scaffold. */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'

const LLAVE = 'gunshop:cesta'
const MAX_UNIDADES = 99

type Unidades = Record<number, number>

type CartContextValue = {
  unidades: Unidades
  piezas: number
  pon: (id: number, n: number) => void
  add: (id: number) => void
}

const CartContext = createContext<CartContextValue | null>(null)

function leer(): Unidades {
  try {
    const crudo = JSON.parse(window.localStorage.getItem(LLAVE) ?? '{}') as Record<string, unknown>
    const out: Unidades = {}
    for (const [id, n] of Object.entries(crudo)) {
      const cant = Math.max(0, Math.min(MAX_UNIDADES, Math.floor(Number(n) || 0)))
      if (cant) out[Number(id)] = cant
    }
    return out
  } catch {
    return {}
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [unidades, setUnidades] = useState<Unidades>({})
  // El valor inicial tiene que coincidir en servidor y cliente para no chocar
  // con la hidratacion; localStorage solo existe en el navegador, asi que la
  // cesta real se lee recien montado.
  const [listo, setListo] = useState(false)

  useEffect(() => {
    setUnidades(leer())
    setListo(true)
  }, [])

  // Persistir en un efecto aparte, no dentro de cada setter, evita repetir el
  // mismo try/catch en pon() y en add(). No se persiste antes de `listo`: si
  // no, el primer render (cesta vacia) pisaria lo guardado antes de leerlo.
  useEffect(() => {
    if (!listo) return
    try {
      window.localStorage.setItem(LLAVE, JSON.stringify(unidades))
    } catch {
      // Sin almacen la cesta no sobrevive a la recarga; no es un fallo.
    }
  }, [unidades, listo])

  const pon = useCallback((id: number, n: number) => {
    const cant = Math.max(0, Math.min(MAX_UNIDADES, Math.floor(n)))
    setUnidades((previas) => {
      if (!cant) {
        const { [id]: _quitado, ...resto } = previas
        return resto
      }
      return { ...previas, [id]: cant }
    })
  }, [])

  const add = useCallback((id: number) => {
    setUnidades((previas) => ({
      ...previas,
      [id]: Math.min(MAX_UNIDADES, (previas[id] ?? 0) + 1),
    }))
  }, [])

  const piezas = useMemo(
    () => Object.values(unidades).reduce((s, n) => s + n, 0),
    [unidades],
  )

  const value = useMemo(
    () => ({ unidades, piezas, pon, add }),
    [unidades, piezas, pon, add],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
