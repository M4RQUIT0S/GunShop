'use client'

/* Puerto de js/account.js, ya sin la cartera de credenciales: la pagina no
 * vende productos controlados, asi que no pide numero de CLU, vencimiento ni
 * TCCM. Queda la identidad de contacto -- nombre y correo -- que es lo unico
 * que la reserva copia en el correo al taller, y el acceso con Google, que la
 * rellena sin escribirla.
 *
 * Sin contraseña a proposito: o entras con Google, o dejas los datos en este
 * navegador. Ver AccountContext.tsx. El formulario es no controlado (como en
 * el original, que leia/escribia `nodo.form.campo.value` a mano): se remonta
 * con `key=` cuando cambia el perfil o se abre el panel, para que los valores
 * por defecto reflejen lo guardado. */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Pedido } from '@/lib/cesta'
import { useAccount, type Perfil } from './AccountContext'

const PEDIDOS = 'gunshop:pedidos'

function fecha(iso: string): string {
  const t = String(iso || '').split('-')
  return t.length === 3 ? `${t[2]}/${t[1]}/${t[0]}` : iso
}

const grupos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/* La G de Google. Va en el boton porque sus normas de marca piden el logo
   cuando el boton dice "con Google"; el resto del boton es el fantasma de
   siempre, que es lo que pega con el lienzo negro. */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.55 10.78l7.98-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function Estado({ perfil, google }: { perfil: Perfil | null; google: string | null }) {
  if (!perfil && !google) {
    return (
      <p>
        Sin datos cargados. Entra con Google o deja tu nombre y correo: es lo único
        que la reserva necesita para llegar al taller.
      </p>
    )
  }
  return (
    <>
      <p className="estado__quien">{perfil?.nombre || google || 'Cuenta iniciada'}</p>
      <p>{google ? `Sesión con Google · ${google}` : perfil?.email}</p>
    </>
  )
}

function Pedidos() {
  const [lista, setLista] = useState<Pedido[]>([])

  useEffect(() => {
    try {
      setLista(JSON.parse(window.localStorage.getItem(PEDIDOS) ?? '[]') as Pedido[])
    } catch {
      setLista([])
    }
  }, [])

  if (!lista.length) return null

  return (
    <>
      <h3 className="panel__sub">Tus reservas</h3>
      {lista.slice().reverse().map((p) => (
        <p className="pedido" key={p.codigo}>
          <span className="pedido__cod">{p.codigo}</span>
          <span>
            {fecha(String(p.fecha).slice(0, 10))} · {p.lineas.length}
            {p.lineas.length === 1 ? ' línea' : ' líneas'} · US$ {grupos.format(p.usdCents / 100)}
          </span>
        </p>
      ))}
    </>
  )
}

export default function AccountPanel() {
  const {
    perfil, google, fallo, guardar, borrar, entrarConGoogle, salir, abrirTick,
  } = useAccount()

  const ref = useRef<HTMLDialogElement>(null)
  const scrollPrevio = useRef('')

  useEffect(() => {
    if (abrirTick === 0 || !ref.current || ref.current.open) return
    scrollPrevio.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current.showModal()
  }, [abrirTick])

  function cerrar() {
    ref.current?.close()
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // El navegador ya valida obligatorios y formato: no hace falta reescribir
    // eso en JS.
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    guardar({
      nombre: String(f.get('nombre') ?? '').trim(),
      email: String(f.get('email') ?? '').trim(),
    })
  }

  return (
    <dialog
      ref={ref}
      className="panel panel--side"
      id="accountPanel"
      aria-label="Mi cuenta"
      onClose={() => { document.body.style.overflow = scrollPrevio.current }}
      onClick={(event) => { if (event.target === event.currentTarget) cerrar() }}
    >
      <div className="panel__box">
        <header className="panel__head">
          <div>
            <p className="eyebrow">Tiro deportivo y caza</p>
            <h2 className="panel__title">Mi cuenta</h2>
          </div>
          <button className="panel__x" type="button" onClick={cerrar} aria-label="Cerrar la cuenta">✕</button>
        </header>

        <div className="panel__estado" id="accEstado">
          <Estado perfil={perfil} google={google} />
        </div>

        {/* El perfil puede cambiar sin que el panel se cierre (entrar con
            Google lo reescribe), asi que la clave lleva las dos cosas. */}
        <form
          className="form"
          id="accForm"
          key={`${abrirTick}:${perfil?.email ?? ''}:${perfil?.nombre ?? ''}`}
          onSubmit={onSubmit}
        >
          {google ? (
            <button className="btn btn--ghost btn--google" type="button" onClick={salir}>
              <LogoGoogle />
              Cerrar la sesión de Google
            </button>
          ) : (
            <button className="btn btn--ghost btn--google" type="button" onClick={entrarConGoogle}>
              <LogoGoogle />
              Continuar con Google
            </button>
          )}
          {fallo && <p className="aviso aviso--falta" role="status">{fallo}</p>}

          <p className="form__o"><span>o déjalos a mano</span></p>

          <label className="campo">
            <span>Nombre y apellido</span>
            <input name="nombre" type="text" required autoComplete="name" maxLength={60} defaultValue={perfil?.nombre ?? ''} />
          </label>
          <label className="campo">
            <span>Correo</span>
            <input name="email" type="email" required autoComplete="email" maxLength={80} defaultValue={perfil?.email ?? ''} />
          </label>
          <div className="form__pie">
            <button className="btn" type="submit" id="accGuarda">
              {perfil ? 'Actualizar datos' : 'Guardar en este navegador'}
            </button>
            <button className="btn btn--ghost" type="button" id="accSalir" hidden={!perfil} onClick={borrar}>
              Borrar mis datos
            </button>
          </div>
          <p className="form__nota">
            Solo nombre y correo: la tienda no vende piezas que exijan credencial
            ANMaC, así que no te pedimos la CLU ni la Tarjeta de Consumo en ningún
            momento. Lo que escribas aquí se queda en este navegador; la sesión de
            Google solo sirve para identificarte.
          </p>
        </form>

        <div className="panel__pedidos" id="accPedidos">
          {/* key: releer localStorage en cada apertura -- una reserva hecha
              en CartPanel mientras este estaba desmontado (o simplemente
              antes de abrirlo por primera vez) no dispara el efecto solo. */}
          <Pedidos key={abrirTick} />
        </div>
      </div>
    </dialog>
  )
}
