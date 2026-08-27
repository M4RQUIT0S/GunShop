'use client'

/* Reemplaza al singleton window.GunShop.cart del sitio estatico (js/cart.js).
 * Header, ficha y panel necesitan leer y tocar la misma cesta, y en React eso
 * es un Context, no una variable global.
 *
 * Guarda solo `{id: unidades}`, igual que el original: el producto (precio,
 * nombre, regimen) se vuelve a resolver contra el catalogo al pintar, nunca
 * se guarda la ficha entera. Ese catalogo fresco lo trae este mismo Context
 * (una vez, al montar) para que CartPanel no tenga que pedirlo por su cuenta:
 * `lineas` ya llega resuelta, y una referencia que desaparece del catalogo
 * simplemente no aparece en `lineas` aunque su id siga en `unidades`. */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { listaProductos, cambio, comprableDirecto, type Producto } from '@/lib/catalogo'
import type { Linea } from '@/lib/cesta'

const LLAVE = 'gunshop:cesta'
const MAX_UNIDADES = 99

type Unidades = Record<number, number>

type CartContextValue = {
  unidades: Unidades
  piezas: number
  productos: Producto[]
  arsPorUsd: number
  catalogoListo: boolean
  lineas: Linea[]
  totalUsdCents: number
  pon: (id: number, n: number) => void
  add: (id: number) => void
  vaciar: () => void
  abrirTick: number
  abrir: () => void
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
  const [productos, setProductos] = useState<Producto[]>([])
  const [arsPorUsd, setArsPorUsd] = useState(0)
  const [catalogoListo, setCatalogoListo] = useState(false)
  const [abrirTick, setAbrirTick] = useState(0)

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

  // El catalogo fresco, pedido una sola vez: es contra esto que se resuelve
  // el precio de cada linea, nunca contra lo guardado en localStorage.
  useEffect(() => {
    let cancelado = false
    Promise.all([listaProductos(), cambio()]).then(([p, tc]) => {
      if (cancelado) return
      setProductos(p)
      setArsPorUsd(tc)
      setCatalogoListo(true)
    })
    return () => {
      cancelado = true
    }
  }, [])

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

  // El gate legal tiene que vivir aca, no solo en el boton que hoy es el
  // unico llamador (ProductoCTA): sin el catalogo cargado, o si el producto
  // no permite compra directa, no se agrega -- mismo criterio fail-safe que
  // modoVenta()/requisitos() en lib/regimen.ts.
  const add = useCallback((id: number) => {
    const producto = productos.find((p) => p.id === id)
    if (!producto || !comprableDirecto(producto.regimen)) return
    setUnidades((previas) => ({
      ...previas,
      [id]: Math.min(MAX_UNIDADES, (previas[id] ?? 0) + 1),
    }))
  }, [productos])

  const vaciar = useCallback(() => setUnidades({}), [])

  const abrir = useCallback(() => setAbrirTick((t) => t + 1), [])

  // El badge de la cabecera cuenta todo lo guardado hasta que el catalogo
  // confirma que existe; una vez listo, una referencia que desaparecio ya no
  // suma ("se cae sola", CLAUDE.md).
  const piezas = useMemo(() => {
    if (!catalogoListo) return Object.values(unidades).reduce((s, n) => s + n, 0)
    const validos = new Set(productos.map((p) => p.id))
    return Object.entries(unidades).reduce((s, [id, n]) => (validos.has(Number(id)) ? s + n : s), 0)
  }, [unidades, productos, catalogoListo])

  const lineas = useMemo<Linea[]>(() => {
    const porId = new Map(productos.map((p) => [p.id, p]))
    return Object.entries(unidades)
      .map(([id, n]) => ({ producto: porId.get(Number(id)), n }))
      .filter((l): l is Linea => !!l.producto)
  }, [unidades, productos])

  const totalUsdCents = useMemo(
    () => lineas.reduce((s, l) => s + l.producto.usdCents * l.n, 0),
    [lineas],
  )

  const value = useMemo(
    () => ({
      unidades,
      piezas,
      productos,
      arsPorUsd,
      catalogoListo,
      lineas,
      totalUsdCents,
      pon,
      add,
      vaciar,
      abrirTick,
      abrir,
    }),
    [
      unidades, piezas, productos, arsPorUsd, catalogoListo, lineas, totalUsdCents,
      pon, add, vaciar, abrirTick, abrir,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
