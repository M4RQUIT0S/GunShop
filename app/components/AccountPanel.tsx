'use client'

/* Puerto casi literal de js/account.js. Sin contraseña a proposito -- ver
 * AccountContext.tsx. El formulario es no controlado (como en el original,
 * que leia/escribia `nodo.form.campo.value` a mano): se remonta con
 * `key={abrirTick}` en cada apertura para que los valores por defecto
 * reflejen el perfil guardado, igual que `pinta()` los reescribia cada vez
 * que `abrir()` mostraba el panel. */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Pedido } from '@/lib/cesta'
import { useAccount, type Perfil } from './AccountContext'

const PEDIDOS = 'gunshop:pedidos'

function fecha(iso: string): string {
  const t = String(iso || '').split('-')
  return t.length === 3 ? `${t[2]}/${t[1]}/${t[0]}` : iso
}

function dias(iso: string): number {
  const falta = Date.parse(`${iso}T00:00:00`) - Date.now()
  return Math.floor(falta / 86400000)
}

const grupos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function Estado({ perfil }: { perfil: Perfil | null }) {
  if (!perfil) {
    return (
      <p>
        Sin datos cargados. Con la CLU aquí, la cesta ya sabe qué puede
        reservarse y qué no.
      </p>
    )
  }
  const d = perfil.vence ? dias(perfil.vence) : null
  let clase = 'estado__clu'
  let texto: string
  if (d === null) {
    texto = `CLU ${perfil.clu} · sin vencimiento cargado`
  } else if (d < 0) {
    clase = 'estado__clu is-mal'
    texto = `CLU ${perfil.clu} · venció el ${fecha(perfil.vence)}`
  } else if (d <= 90) {
    clase = 'estado__clu is-ojo'
    texto = `CLU ${perfil.clu} · vence en ${d} días: ya estás en plazo de renovación`
  } else {
    texto = `CLU ${perfil.clu} · vigente hasta ${fecha(perfil.vence)}`
  }
  return (
    <>
      <p className={clase}>{texto}</p>
      <p>
        {perfil.tccm
          ? 'TCCM declarada: puedes comprar munición dentro de tu cupo.'
          : 'Sin TCCM: la munición queda fuera hasta declararla.'}
      </p>
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
    perfil, guardar, borrar, abrirTick,
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
    // El navegador ya valida obligatorios, formato y fecha: no hace falta
    // reescribir eso en JS.
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    guardar({
      nombre: String(f.get('nombre') ?? '').trim(),
      email: String(f.get('email') ?? '').trim(),
      clu: String(f.get('clu') ?? '').trim(),
      vence: String(f.get('vence') ?? ''),
      tccm: f.get('tccm') === 'on',
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
            <p className="eyebrow">Legítimo usuario</p>
            <h2 className="panel__title">Mi cuenta</h2>
          </div>
          <button className="panel__x" type="button" onClick={cerrar} aria-label="Cerrar la cuenta">✕</button>
        </header>

        <div className="panel__estado" id="accEstado">
          <Estado perfil={perfil} />
        </div>

        <form className="form" id="accForm" key={abrirTick} onSubmit={onSubmit}>
          <label className="campo">
            <span>Nombre y apellido</span>
            <input name="nombre" type="text" required autoComplete="name" maxLength={60} defaultValue={perfil?.nombre ?? ''} />
          </label>
          <label className="campo">
            <span>Correo</span>
            <input name="email" type="email" required autoComplete="email" maxLength={80} defaultValue={perfil?.email ?? ''} />
          </label>
          <div className="campo__par">
            <label className="campo">
              <span>Nº de CLU</span>
              <input
                name="clu"
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{4,12}"
                title="Entre 4 y 12 cifras"
                autoComplete="off"
                defaultValue={perfil?.clu ?? ''}
              />
            </label>
            <label className="campo">
              <span>Vence el</span>
              <input name="vence" type="date" required defaultValue={perfil?.vence ?? ''} />
            </label>
          </div>
          <label className="campo campo--check">
            <input name="tccm" type="checkbox" defaultChecked={!!perfil?.tccm} />
            <span>Tengo Tarjeta de Consumo (TCCM) vigente</span>
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
            Sin contraseña y sin servidor: estos datos se quedan en este navegador y no
            se envían a ninguna parte. La armería comprueba la credencial original en
            el mostrador, siempre.
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
