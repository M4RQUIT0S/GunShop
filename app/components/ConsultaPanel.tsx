'use client'

/* Puerto PARCIAL de js/consulta.js: abrir y prellenar desde donde sea que
 * llame a `abrir({titulo, rotulo, mensaje})` -- hoy solo la ficha de producto.
 * Lo que falta para ser «un formulario para las 4 consultas» -- los cuatro
 * TEMAS (compra/taller/tramites/visita) -- vive detras del bloque «en que
 * podemos ayudarle» de la portada, que todavia no esta portado; `abrir()` ya
 * acepta lo que esos cuatro necesitaran (ver ConsultaContext.tsx).
 *
 * Es una demostracion y lo dice: el original cerraba en un mailto: a
 * taller@alcantara.example, un buzon que no existe, con un boton «Enviar». Ahora
 * se prepara el texto, se ensena tal como llegaria y no sale de aqui
 * (UX-AUDIT.md, Cognitive Load). Cuando haya una direccion real, el mailto:
 * vuelve en el resumen.
 *
 * Lo escrito no se pierde (UX-AUDIT.md, Zeigarnik): el formulario se oculta al
 * preparar el texto en vez de desmontarse, y el mensaje se guarda en un
 * borrador por consulta. Antes habia uno solo -- el campo se remontaba con el
 * mensaje de la consulta nueva --, y A -> B -> A perdia lo escrito en A
 * (UX-AUDIT.md, C2). El panel vive en el layout, asi que los borradores
 * sobreviven a la navegacion; no se guardan en disco. Nombre y correo salen de
 * «Mi cuenta» si estan guardados (UX-AUDIT.md, P7). */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useConsulta } from './ConsultaContext'
import { useAccount } from './AccountContext'

type Campos = { nombre: string; email: string; tel: string; mensaje: string }

function texto(asunto: string, c: Campos): string {
  return [
    asunto,
    '',
    c.nombre,
    c.email + (c.tel ? ` · ${c.tel}` : ''),
    '',
    c.mensaje || '(sin mensaje)',
  ].join('\n')
}

export default function ConsultaPanel() {
  const { datos } = useConsulta()
  const { perfil } = useAccount()
  const ref = useRef<HTMLDialogElement>(null)
  const volver = useRef<HTMLButtonElement>(null)
  const mensaje = useRef<HTMLTextAreaElement>(null)
  const scrollPrevio = useRef('')
  // El texto preparado; null mientras se esta rellenando el formulario.
  const [preparado, setPreparado] = useState<string | null>(null)
  // Un borrador por consulta. La clave es el titulo, que es uno por producto
  // («Consultar: Bergara B-14 Ridge»); sin borrador se ve el mensaje inicial.
  const [borradores, setBorradores] = useState<Record<string, string>>({})
  const clave = datos?.titulo ?? ''

  useEffect(() => {
    if (datos) {
      setPreparado(null)
      // Un <dialog> modal atrapa el foco pero no frena el scroll de detras.
      scrollPrevio.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      ref.current?.showModal()
    }
  }, [datos])

  // La vista que se va se lleva el boton pulsado: el foco va a la que llega.
  useEffect(() => {
    if (!ref.current?.open) return
    ;(preparado ? volver.current : mensaje.current)?.focus()
  }, [preparado])

  function preparar(event: FormEvent<HTMLFormElement>) {
    // El navegador ya comprobo obligatorios y formato de correo antes de
    // llegar aqui: repetirlo en JS seria tener dos reglas que un dia difieren.
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    const campo = (k: string) => String(f.get(k) ?? '').trim()
    setPreparado(texto(datos?.titulo ?? 'Consulta', {
      nombre: campo('nombre'), email: campo('email'), tel: campo('tel'), mensaje: campo('mensaje'),
    }))
  }

  return (
    <dialog
      ref={ref}
      className="panel panel--side"
      id="consultaPanel"
      aria-labelledby="consultaTitulo"
      onClose={() => { document.body.style.overflow = scrollPrevio.current }}
      onClick={(event) => { if (event.target === event.currentTarget) ref.current?.close() }}
    >
      <div className="panel__box">
        <header className="panel__head">
          <div>
            <p className="eyebrow">Consulta de demostración</p>
            <h2 className="panel__title" id="consultaTitulo">{datos?.titulo ?? 'Consulta'}</h2>
          </div>
          <button
            className="panel__x"
            type="button"
            aria-label="Cerrar la consulta"
            onClick={() => ref.current?.close()}
          >
            ✕
          </button>
        </header>

        <form className="form" onSubmit={preparar} hidden={!!preparado}>
          {/* key: defaultValue solo se lee al montar, y el perfil llega de
              localStorage despues; cuando llega (o cambia), el campo se
              remonta con el. */}
          <label className="campo" key={`n:${perfil?.nombre ?? ''}`}>
            <span>Nombre y apellido</span>
            <input name="nombre" type="text" required autoComplete="name" maxLength={60} defaultValue={perfil?.nombre ?? ''} />
          </label>
          <div className="campo__par">
            <label className="campo" key={`e:${perfil?.email ?? ''}`}>
              <span>Correo</span>
              <input name="email" type="email" required autoComplete="email" maxLength={80} defaultValue={perfil?.email ?? ''} />
            </label>
            <label className="campo">
              <span>Teléfono</span>
              <input name="tel" type="tel" autoComplete="tel" maxLength={24} />
            </label>
          </div>
          <label className="campo">
            <span>{datos?.rotulo ?? 'Contanos'}</span>
            <textarea
              ref={mensaje}
              name="mensaje"
              rows={4}
              maxLength={600}
              value={borradores[clave] ?? datos?.mensaje ?? ''}
              onChange={(event) => {
                const valor = event.currentTarget.value
                setBorradores((previos) => ({ ...previos, [clave]: valor }))
              }}
            />
          </label>
          <div className="form__pie">
            <button className="btn" type="submit">Preparar la consulta</button>
          </div>
          <p className="form__nota">
            Sitio de demostración: la consulta no se envía. Vas a ver el texto tal
            como le llegaría a la armería.
          </p>
        </form>

        {preparado && (
          <div className="hecho" role="status">
            <p className="hecho__cod">Consulta preparada</p>
            <p>Es una simulación: no se envió a nadie. Esto es lo que le llegaría a la armería:</p>
            <pre className="hecho__texto">{preparado}</pre>
            <button className="btn btn--ghost" type="button" ref={volver} onClick={() => setPreparado(null)}>
              Volver a editar
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
