/* Scaffold: marcado de index.html lineas 608-657. El puerto casi literal de
 * js/account.js (cargar/guardar en localStorage['gunshop:cuenta'], estado de
 * la CLU, pedidos) es fase 6. */

export default function AccountPanel() {
  return (
    <dialog className="panel panel--side" id="accountPanel" aria-label="Mi cuenta">
      <div className="panel__box">
        <header className="panel__head">
          <div>
            <p className="eyebrow">Legítimo usuario</p>
            <h2 className="panel__title">Mi cuenta</h2>
          </div>
          <button className="panel__x" type="button" data-cierra="" aria-label="Cerrar la cuenta">✕</button>
        </header>

        <div className="panel__estado" id="accEstado" />

        <form className="form" id="accForm">
          <label className="campo">
            <span>Nombre y apellido</span>
            <input name="nombre" type="text" required autoComplete="name" maxLength={60} />
          </label>
          <label className="campo">
            <span>Correo</span>
            <input name="email" type="email" required autoComplete="email" maxLength={80} />
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
              />
            </label>
            <label className="campo">
              <span>Vence el</span>
              <input name="vence" type="date" required />
            </label>
          </div>
          <label className="campo campo--check">
            <input name="tccm" type="checkbox" />
            <span>Tengo Tarjeta de Consumo (TCCM) vigente</span>
          </label>
          <div className="form__pie">
            <button className="btn" type="submit" id="accGuarda">Guardar en este navegador</button>
            <button className="btn btn--ghost" type="button" id="accSalir" hidden>Borrar mis datos</button>
          </div>
          <p className="form__nota">
            Sin contraseña y sin servidor: estos datos se quedan en este navegador y no
            se envían a ninguna parte. La armería comprueba la credencial original en
            el mostrador, siempre.
          </p>
        </form>

        <div className="panel__pedidos" id="accPedidos" />
      </div>
    </dialog>
  )
}
