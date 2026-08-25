# Terminar el port de rolls-roycemotorcars.com

Lo que faltaba del original, medido contra fuentes reales — **no de memoria**.

## De dónde salen las medidas

La extensión de Chrome no conecta y el sitio no responde ni a `curl` ni a
WebFetch (bot protection). La fuente es la captura del **11 de agosto de 2026**
en el Internet Archive, más su hoja de estilos completa:

```
http://web.archive.org/web/20260811191207/https://www.rolls-roycemotorcars.com/en_GB/home.html
.../etc.clientlibs/rrmc/clientlibs/clientlib-components.<hash>.css   (866 KB, 6.477 reglas)
```

Cada número de abajo sale de una regla de ese CSS. Lo que no está ahí — el
movimiento interno del indicador de scroll, que su JS dibuja — va marcado como
inventado.

## Fases

- [x] **1 · Los cinco detalles medidos**
  - [x] `MENÚ` ↔ `CERRAR` con `<span>` fantasma que reserva el ancho
        (`.rrmc-primary-nav-copy-{open,close,phantom}`: los dos primeros
        `position:absolute`, el fantasma `visibility:hidden`)
  - [x] Enlaces del menú a la derecha, entrando desde la izquierda
        (`.rrmc-menu-link-anim { text-align:right; transform:translateX(-100%) }`)
  - [x] Flecha del botón primario: 16×16, `opacity:0` → hover `opacity:1` +
        `translate3d(4px,0,0)`, 0,4 s (`.rrmc-button-arrow`)
  - [x] Indicador de scroll: 4×80 px fijo abajo al centro, `z-index:100`,
        se desvanece en 1 s (`.rrmc-homepage-scroll-icon`)
  - [x] Iconos sociales del pie: 18 px de alto, 24 px de separación, en fila
        (`.rrmc-footer-social`)
- [x] **2 · Menú de dos niveles** (`.rrmc-global-menu-grid`)
  - [x] Dos paneles: foto a la izquierda, enlaces a la derecha (la izquierda
        ocupa 9–12 de 24 columnas según el ancho ≈ 40-50 %)
  - [x] La foto cambia al señalar cada enlace (`is-selected` / `is-default`)
  - [x] Segundo nivel con «Volver» y «Ver todo», generado del catálogo
  - [x] En estrecho el panel de foto desaparece y el nivel 2 tapa al 1
- [x] **3 · Bloque de consulta y formulario modal** (`.rrmc-enquire-block`)
  - [x] Filas de 76 px con filete debajo, 28 px de separación, 80 % de ancho,
        icono a un lado y flecha al otro, `opacity:.8` al señalar
  - [x] Un solo `<dialog>` para las cuatro consultas, con el asunto cambiado
  - [x] Sin servidor: se dice que no se envía nada, como en el panel de cuenta
- [x] **4 · Cierre**
  - [x] `test/selftest.js` en verde
  - [x] `CLAUDE.md` al día
  - [x] Commit y push

## Decisiones tomadas por el camino

- **Los filetes van con los tokens del repo, no con el `#fff` del original.**
  El bloque de consulta del original separa con blanco puro; aquí manda la
  regla escrita en `CLAUDE.md` (separación por filete, `--filete` sobre foto).
- **El original centra mal el indicador de scroll**: `left: calc(50% - 4px)`
  con `width: 4px` lo deja 2 px a la izquierda. Aquí va centrado.
- **El fantasma del botón de menú lleva «Cerrar», no «Menú».** El original
  usa `MENU` porque en su tipografía es la palabra ancha; en español la ancha
  es `CERRAR`, y el fantasma tiene que ser la ancha o el botón salta.
- **No se copian**: aviso de cookies, selector de idioma, buscador de
  concesionarios con reCAPTCHA y los ocho formularios de captación. Esta
  tienda no pone cookies ni tiene traducciones, y un consentimiento de mentira
  es peor que ninguno.
