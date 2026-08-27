'use client'

/* Reemplaza al singleton window.GunShop.account (js/account.js). Header,
 * AccountPanel y CartPanel (que pregunta por la CLU/TCCM antes de dejar
 * reservar) necesitan leer el mismo perfil, y en React eso es un Context.
 *
 * Sin contraseña a proposito -- guardar una en localStorage seria peor que no
 * tenerla. El alta de verdad, con hash y sesion, es la tabla `customer` de
 * db/schema.sql. `abrir()`/`abrirTick` es el mismo mecanismo que
 * ConsultaContext usa para que HeaderActions (otra rama del arbol) pueda
 * decirle a AccountPanel que se muestre. */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import type { Perfil } from '@/lib/cuenta'

export type { Perfil }

const LLAVE = 'gunshop:cuenta'

type AccountContextValue = {
  perfil: Perfil | null
  listo: boolean
  guardar: (p: Perfil) => void
  borrar: () => void
  abrirTick: number
  abrir: () => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

function leer(): Perfil | null {
  try {
    return JSON.parse(window.localStorage.getItem(LLAVE) ?? 'null') as Perfil | null
  } catch {
    return null
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [listo, setListo] = useState(false)
  const [abrirTick, setAbrirTick] = useState(0)

  useEffect(() => {
    setPerfil(leer())
    setListo(true)
  }, [])

  const guardar = useCallback((p: Perfil) => {
    setPerfil(p)
    try {
      window.localStorage.setItem(LLAVE, JSON.stringify(p))
    } catch {
      // Sin almacen los datos duran lo que la pagina; no es un fallo.
    }
  }, [])

  const borrar = useCallback(() => {
    setPerfil(null)
    try {
      window.localStorage.removeItem(LLAVE)
    } catch {
      // Nada que borrar si no hay almacen.
    }
  }, [])

  const abrir = useCallback(() => setAbrirTick((t) => t + 1), [])

  const value = useMemo(
    () => ({
      perfil, listo, guardar, borrar, abrirTick, abrir,
    }),
    [perfil, listo, guardar, borrar, abrirTick, abrir],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount debe usarse dentro de <AccountProvider>')
  return ctx
}
