'use client'

/* Porta js/reveal.js. css/base.css esconde `[data-reveal]` bajo `.js` (ya
 * puesta por layout.tsx): sin este observador esas piezas se quedarían en
 * opacity:0 para siempre, así que -- a diferencia del resto de esta fase,
 * que sólo toca la portada -- esto hace falta en cuanto se usa `data-reveal`
 * por primera vez. Se monta por página, como las demás piezas de esta fase;
 * la próxima página que use `data-reveal` monta su propia copia. */

import { useEffect } from 'react'

export default function Reveal() {
  useEffect(() => {
    const piezas = document.querySelectorAll<HTMLElement>('[data-reveal]')

    if (!('IntersectionObserver' in window)) {
      piezas.forEach((n) => n.classList.add('is-in'))
      return
    }

    const ojo = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('is-in')
        ojo.unobserve(e.target)
      })
    }, { rootMargin: '0px 0px -12% 0px' })

    piezas.forEach((n) => ojo.observe(n))

    return () => ojo.disconnect()
  }, [])

  return null
}
