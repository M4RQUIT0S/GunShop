'use client'

/* Porta js/portada.js función riel(): marca en cuál de las tres láminas está
 * el lector -- un IntersectionObserver con una franja de un pixel en mitad
 * de la pantalla decide cuál se está mirando -- y salta a la que se le pida.
 * El riel solo tiene sentido mientras se ven las láminas: un segundo
 * observer apaga `.is-on` en cuanto #laminas sale de pantalla.
 *
 * El marcado nace `hidden` (como en el original) y sólo se descubre si hay
 * IntersectionObserver y #laminas existe -- degradación correcta: sin JS o
 * sin soporte, el riel simplemente no aparece. */

import { useEffect, useState } from 'react'

const ETIQUETAS = ['primera', 'segunda', 'tercera']

export default function RielLaminas() {
  const [visible, setVisible] = useState(false)
  const [activo, setActivo] = useState(0)
  const [enPantalla, setEnPantalla] = useState(false)

  useEffect(() => {
    const zona = document.getElementById('laminas')
    if (!zona || !('IntersectionObserver' in window)) return

    const laminas = Array.from(zona.querySelectorAll<HTMLElement>('.lamina'))
    if (!laminas.length) return

    setVisible(true)

    const ojoActivo = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        setActivo(laminas.indexOf(e.target as HTMLElement))
      })
    }, { rootMargin: '-50% 0px -50% 0px' })
    laminas.forEach((l) => ojoActivo.observe(l))

    const ojoZona = new IntersectionObserver(
      (entradas) => setEnPantalla(entradas[0].isIntersecting),
      { threshold: 0 },
    )
    ojoZona.observe(zona)

    return () => {
      ojoActivo.disconnect()
      ojoZona.disconnect()
    }
  }, [])

  function irA(i: number) {
    const destino = document.querySelectorAll('#laminas .lamina')[i]
    if (!destino) return
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    destino.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className={`riel${enPantalla ? ' is-on' : ''}`} id="riel" hidden={!visible}>
      {ETIQUETAS.map((etiqueta, i) => (
        <button
          key={etiqueta}
          className="riel__punto"
          type="button"
          data-lamina={i}
          aria-current={activo === i}
          aria-label={`Ir a la ${etiqueta} lámina`}
          onClick={() => irA(i)}
        />
      ))}
    </div>
  )
}
