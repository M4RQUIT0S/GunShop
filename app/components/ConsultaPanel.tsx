/* Scaffold: marcado de index.html lineas 668-719. El puerto de js/consulta.js
 * (arma el mailto:, cambia titulo/rotulo segun `data-consulta`) es fase 6. */

export default function ConsultaPanel() {
  return (
    <dialog className="panel panel--side" id="consultaPanel" aria-labelledby="consultaTitulo">
      <div className="panel__box">
        <header className="panel__head">
          <div>
            <p className="eyebrow">Consulta</p>
            <h2 className="panel__title" id="consultaTitulo">Consulta</h2>
          </div>
          <button className="panel__x" type="button" data-cierra="" aria-label="Cerrar la consulta">✕</button>
        </header>

        <form className="form" id="consultaForm">
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
          <label className="campo" id="consultaFamiliaCampo" hidden>
            <span>Qué le interesa</span>
            <select name="familia" id="consultaFamilia" />
          </label>
          <label className="campo">
            <span id="consultaMensajeRotulo">Cuéntenos</span>
            <textarea name="mensaje" rows={4} maxLength={600} />
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

        <div className="hecho" id="consultaHecho" hidden />
      </div>
    </dialog>
  )
}
