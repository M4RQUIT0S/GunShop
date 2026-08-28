'use client'

/* Reemplaza al singleton window.GunShop.account (js/account.js). Header,
 * AccountPanel y CartPanel necesitan leer el mismo perfil, y en React eso es
 * un Context.
 *
 * Dos identidades, una sola forma:
 *   - la sesion de Google (Supabase Auth), que es la de verdad; y
 *   - el perfil de contacto en localStorage, que es lo que la reserva copia
 *     en el correo y lo unico que habia antes.
 * Entrar con Google rellena el perfil; salir cierra la sesion pero NO borra
 * el perfil (para eso esta "Borrar mis datos"), porque el que lo escribio a
 * mano nunca uso Google.
 *
 * No se pide numero de CLU ni TCCM en ninguna parte: la pagina no vende
 * productos controlados -- ver lib/cuenta.ts y faltas() en lib/cesta.ts.
 *
 * `abrir()`/`abrirTick` es el mismo mecanismo que ConsultaContext usa para que
 * HeaderActions (otra rama del arbol) pueda decirle a AccountPanel que se
 * muestre. */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/lib/cuenta'

export type { Perfil }

const LLAVE = 'gunshop:cuenta'

type AccountContextValue = {
  perfil: Perfil | null
  /* Correo de la sesion de Google, o null si no hay ninguna abierta. */
  google: string | null
  listo: boolean
  fallo: string | null
  guardar: (p: Perfil) => void
  borrar: () => void
  entrarConGoogle: () => Promise<void>
  salir: () => Promise<void>
  abrirTick: number
  abrir: () => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

function leer(): Perfil | null {
  try {
    const p = JSON.parse(window.localStorage.getItem(LLAVE) ?? 'null') as Partial<Perfil> | null
    // El perfil viejo traia clu/vence/tccm; se queda con lo que sigue existiendo.
    return p?.nombre || p?.email ? { nombre: p.nombre ?? '', email: p.email ?? '' } : null
  } catch {
    return null
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [google, setGoogle] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [abrirTick, setAbrirTick] = useState(0)

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

  useEffect(() => {
    setPerfil(leer())
    setListo(true)
  }, [])

  useEffect(() => {
    // Google devuelve el rechazo ("cancelar" en la pantalla de consentimiento)
    // como ?error= en la vuelta: sin esto el usuario aterriza aqui como si no
    // hubiera pasado nada. El texto es fijo a proposito -- error_description
    // viene de la URL y no se pinta.
    if (new URLSearchParams(window.location.search).has('error')) {
      setFallo('No se completó el acceso con Google.')
    }

    // onAuthStateChange emite INITIAL_SESSION al suscribirse, asi que esto ya
    // trae la sesion que hubiera: no hace falta un getSession() aparte.
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      setGoogle(sesion?.user.email ?? null)
      if (evento !== 'SIGNED_IN' || !sesion) return
      setFallo(null)
      const meta = sesion.user.user_metadata as { full_name?: string; name?: string } | null
      guardar({
        nombre: String(meta?.full_name ?? meta?.name ?? '').trim(),
        email: sesion.user.email ?? '',
      })
    })
    return () => data.subscription.unsubscribe()
  }, [guardar])

  const entrarConGoogle = useCallback(async () => {
    setFallo(null)
    // Vuelve a la misma pagina: el canje del ?code= lo hace supabase-js solo
    // (detectSessionInUrl), sin ruta de callback. Requiere que esta URL este
    // en Authentication → URL Configuration del proyecto (ver .env.example).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
    if (error) setFallo('No se pudo abrir el acceso con Google. Inténtalo de nuevo.')
  }, [])

  const salir = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setFallo('No se pudo cerrar la sesión.')
  }, [])

  const abrir = useCallback(() => setAbrirTick((t) => t + 1), [])

  const value = useMemo(
    () => ({
      perfil, google, listo, fallo, guardar, borrar, entrarConGoogle, salir, abrirTick, abrir,
    }),
    [perfil, google, listo, fallo, guardar, borrar, entrarConGoogle, salir, abrirTick, abrir],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount debe usarse dentro de <AccountProvider>')
  return ctx
}
