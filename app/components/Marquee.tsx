'use client'

/* Porta el desfile de marcas de js/main.js (sección "marcas"): la lista de
 * marcas se pinta dos veces -- la animación CSS recorre la mitad justa y
 * empalma -- y la segunda copia lleva aria-hidden porque repetirla entera a
 * un lector de pantalla es ruido. El botón de pausa es el único trozo con
 * estado, de ahí que todo el desfile sea cliente. */

import { useState } from 'react'

export default function Marquee({ marcas }: { marcas: string[] }) {
  const [quieta, setQuieta] = useState(false)

  return (
    <>
      <div className={`marquee${quieta ? ' is-quieta' : ''}`} id="marquee">
        <div className="marquee__track">
          {marcas.concat(marcas).map((nombre, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="marquee__item"
              aria-hidden={i >= marcas.length || undefined}
            >
              {nombre}
            </span>
          ))}
        </div>
      </div>
      <div className="wrap">
        <button
          className="marquee__pausa"
          type="button"
          aria-pressed={quieta}
          onClick={() => setQuieta((q) => !q)}
        >
          {quieta ? 'Reanudar el desfile' : 'Pausar el desfile'}
        </button>
      </div>
    </>
  )
}
