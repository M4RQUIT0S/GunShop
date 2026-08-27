'use client'

/* Puerto PARCIAL de js/consulta.js: abrir y prellenar desde donde sea que
 * llame a `abrir({titulo, rotulo, mensaje})` -- hoy solo la ficha de producto
 * (fase 5) -- con el mismo cierre en mailto: que el original (sin servidor,
 * no hay otro sitio honesto donde mandar esto). El PLAN.md de la fase 6
 * describe esto como "un formulario para las 4 consultas"; lo que falta para
 * serlo del todo -- las cuatro TEMAS (compra/taller/tramites/visita) y el
 * <select> de familia que solo "compra" usa -- vive detras del bloque "en
 * que podemos ayudarle" de la portada, que esta fase no toca (no esta en el
 * alcance que dio la fase 6, y ese bloque tampoco esta portado todavia).
 * `abrir()` ya acepta lo que esas cuatro necesitaran (ver
 * ConsultaContext.tsx): la proxima fase que porte ese bloque solo tiene que
 * llamarlo con su propio titulo/rotulo/mensaje. */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useConsulta } from './ConsultaContext'

function correo(asunto: string, datos: {
  nombre: string; apellido: string; email: string; tel: string; mensaje: string
}): string {
  const cuerpo = [
    `${datos.nombre} ${datos.apellido}`,
    datos.email + (datos.tel ? ` · ${datos.tel}` : ''),
    '',
    datos.mensaje || '(sin mensaje)',
  ].join('\n')
  return 'mailto:taller@alcantara.example' +
    `?subject=${encodeURIComponent(asunto)}` +
    `&body=${encodeURIComponent(cuerpo)}`
}

export default function ConsultaPanel() {
  const { datos, cerrar } = useConsulta()
  const ref = useRef<HTMLDialogElement>(null)
  const scrollPrevio = useRef('')
  // href del mailto: tras enviar; null mientras se esta rellenando el form.
  const [enviado, setEnviado] = useState<string | null>(null)

  useEffect(() => {
    if (datos) {
      setEnviado(null)
      // Un <dialog> modal atrapa el foco pero no frena el scroll de detras.
      scrollPrevio.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      ref.current?.showModal()
    }
  }, [datos])

  function enviar(event: FormEvent<HTMLFormElement>) {
    // El navegador ya comprobo obligatorios y formato de correo antes de
    // llegar aqui: repetirlo en JS seria tener dos reglas que un dia difieren.
    event.preventDefault()
    const datosForm = new FormData(event.currentTarget)
    setEnviado(correo(datos?.titulo ?? 'Consulta', {
      nombre: String(datosForm.get('nombre') ?? '').trim(),
      apellido: String(datosForm.get('apellido') ?? '').trim(),
      email: String(datosForm.get('email') ?? '').trim(),
      tel: String(datosForm.get('tel') ?? '').trim(),
      mensaje: String(datosForm.get('mensaje') ?? '').trim(),
    }))
  }

  return (
    <dialog
      ref={ref}
      className="panel panel--side"
      id="consultaPanel"
      aria-labelledby="consultaTitulo"
      onClose={() => { document.body.style.overflow = scrollPrevio.current; cerrar() }}
      onClick={(event) => { if (event.target === event.currentTarget) ref.current?.close() }}
    >
      <div className="panel__box">
        <header className="panel__head">
          <div>
            <p className="eyebrow">Consulta</p>
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

        {!enviado ? (
          <form className="form" onSubmit={enviar}>
            <div className="campo__par">
              <label className="campo">
                <span>Nombre</span>
                <input name="nombre" type="text" required autoComplete="given-name" maxLength={40} />
              </label>
              <label className="campo">
                <span>Apellido</span>
                <input name="apellido" type="text" required autoComplete="family-name" maxLength={40} />
              </label>
            </div>
            <div className="campo__par">
              <label className="campo">
                <span>Correo</span>
                <input name="email" type="email" required autoComplete="email" maxLength={80} />
              </label>
              <label className="campo">
                <span>Teléfono</span>
                <input name="tel" type="tel" autoComplete="tel" maxLength={24} />
              </label>
            </div>
            <label className="campo">
              <span>{datos?.rotulo ?? 'Cuéntenos'}</span>
              {/* key remonta el campo al abrir con otro mensaje prellenado:
                  defaultValue solo se lee en el primer render. */}
              <textarea key={datos?.mensaje ?? ''} name="mensaje" rows={4} maxLength={600} defaultValue={datos?.mensaje ?? ''} />
            </label>
            <div className="form__pie">
              <button className="btn" type="submit">Enviar la consulta</button>
            </div>
            <p className="form__nota">
              Sin servidor: esto no se envía a ninguna parte. Al enviar se prepara un
              correo con lo escrito para que salga desde su propio programa de correo,
              que es la única forma honesta de que llegue sin servidor detrás.
            </p>
          </form>
        ) : (
          <div className="hecho">
            <p className="hecho__cod">{datos?.titulo ?? 'Consulta'}</p>
            <p>
              Lo escrito no ha salido de este navegador. Abajo va preparado para
              enviarlo desde su correo; si prefiere, llame al (011) 0000-0000 de
              martes a sábado.
            </p>
            <a className="btn" href={enviado}>Abrir el correo</a>
          </div>
        )}
      </div>
    </dialog>
  )
}
