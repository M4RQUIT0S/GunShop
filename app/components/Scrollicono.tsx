'use client'

/* Porta el indicador de scroll de index.html (`#scrollicono`): una barra fija
 * de 4x80 px abajo al centro que se apaga en el mismo umbral en que la barra
 * de navegación se pega (`scrollY > 40`, ver NavMenu.tsx `onScroll`). Es el
 * mismo hecho -- "ya no estamos arriba" -- visto por dos componentes que no
 * comparten estado; si el umbral de uno cambia sin tocar el otro, discrepan.
 *
 * Vive en la portada (no en el layout) porque -- como `#riel` -- es decoración
 * de las láminas: en cualquier otra página no hay nada de lo que "bajar".
 * `js/portada.js` no lo tocaba (era `nav.js` quien lo apagaba junto al propio
 * `is-stuck`); acá se separa en su propio componente para no acoplar la
 * portada al nav. */

import { useEffect, useState } from 'react'

export default function Scrollicono() {
  const [off, setOff] = useState(false)

  useEffect(() => {
    const onScroll = () => setOff(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return <span className={`scrollicono${off ? ' is-off' : ''}`} id="scrollicono" aria-hidden="true" />
}
