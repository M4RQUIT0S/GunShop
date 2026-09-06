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

/* Cuantas laminas hay lo dice el DOM, no esta lista: desde que la segunda y
 * la tercera salen del catalogo, una portada sin novedades trae menos de
 * tres y los puntos de sobra no llevaban a ningun sitio. */
const rotulo = (i: number) =>
  ETIQUETAS[i] ? `Ir a la ${ETIQUETAS[i]} lámina` : `Ir a la lámina ${i + 1}`

export default function RielLaminas() {
  const [cuantas, setCuantas] = useState(0)
  const [activo, setActivo] = useState(0)
  const [enPantalla, setEnPantalla] = useState(false)

  useEffect(() => {
    const zona = document.getElementById('laminas')
    if (!zona || !('IntersectionObserver' in window)) return

    const laminas = Array.from(zona.querySelectorAll<HTMLElement>('.lamina'))
    if (!laminas.length) return

    setCuantas(laminas.length)

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
    <div className={`riel${enPantalla ? ' is-on' : ''}`} id="riel" hidden={!cuantas}>
      {Array.from({ length: cuantas }, (_, i) => (
        <button
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="riel__punto"
          type="button"
          data-lamina={i}
          aria-current={activo === i}
          aria-label={rotulo(i)}
          onClick={() => irA(i)}
        />
      ))}
    </div>
  )
}
