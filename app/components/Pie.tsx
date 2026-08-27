'use client'

/* Porta js/portada.js función pie(). El nombre quedó del original aunque ya
 * no vive en la portada: `.foot { position: fixed }` (css/base.css) no está
 * dentro de ninguna media query -- es sitewide, no solo de portada -- así
 * que el hueco que lo destapa (el margin-bottom de #hoja) tiene que vivir
 * donde vive #hoja para toda la app: el layout raíz, no app/page.tsx.
 *
 * El alto del pie depende del ancho (sus enlaces se reparten en columnas), y
 * en pantalla estrecha la hoja de estilos devuelve el pie a `static`: se
 * comprueba con `position` en vez de repetir la media query, para que no
 * puedan decir cosas distintas un día. */

import { useEffect } from 'react'

export default function Pie() {
  useEffect(() => {
    const foot: HTMLElement | null = document.getElementById('foot')
    const hoja: HTMLElement | null = document.getElementById('hoja')
    if (!foot || !hoja) return undefined

    const mide = () => {
      const fijo = window.getComputedStyle(foot).position === 'fixed'
      hoja.style.marginBottom = fijo ? `${foot.offsetHeight}px` : ''
    }

    mide()

    // Las fuentes llegan después del primer pintado y cambian el alto del pie.
    if (document.fonts) document.fonts.ready.then(mide)

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(mide)
      ro.observe(foot)
      return () => ro.disconnect()
    }

    window.addEventListener('resize', mide)
    return () => window.removeEventListener('resize', mide)
  }, [])

  return null
}
