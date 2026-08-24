# Rediseño: portada en el lenguaje de Rolls-Royce Motor Cars

Rama `rediseno-rr`. Sale de `c9bb373` (main).

## Qué se pidió

Recrear <https://www.rolls-roycemotorcars.com/en_US/home.html> entera, con las
imágenes y el contenido de la armería y sin perder el estilo del original.
Después, una base de datos para Supabase —no Docker— que escale.

## Lo que se midió del original (Chrome sin ventana, no de memoria)

Alto total 3352 px sobre una vista de 804. No es una portada larga: son
**tres láminas de 100vh apiladas** (`top` 0 / 804 / 1608), un bloque de tres
fichas y el pie.

| Cosa | Medida |
|---|---|
| Lienzo | `#000`, tinta `#fff`, pieza `#151515` |
| Filetes | `rgba(255,255,255,.32)` y `#7c7c7c`; separador de ficha `#222` |
| Titular | 70/80 px, peso **300**, VERSALITA, tracking 2,5 px → 15,4 px |
| Rótulo de sección | 20/30 px, peso 400, versalita, tracking 2,5 px |
| Ficha | 16/26 px, peso 400, versalita, tracking 2,5 px |
| Botón | píldora `radius 30px`, alto 46, fondo `#fff`, tinta `#151515` |
| Nav | fija, 120 px de alto, `z 5001`, degradado de 804 px por detrás |
| Pie | **fijo por debajo**: el contenido se desliza por encima y lo descubre |
| Riel de puntos | fijo a la izquierda, marca en qué lámina estás |
| Fuente | «Riviera Nights», propietaria — hay que sustituirla |

## Fases

- [x] 0 · Medir el original y crear la rama
- [x] 1 · Espec.: tipografía, paleta, mapa de secciones, movimiento
- [x] 2 · Portada nueva: `index.html` + capa CSS en el lenguaje medido
- [x] 3 · Los tres paneles (cesta, cuenta, lupa) al mismo idioma
- [ ] 4 · Base de datos para Supabase: migraciones, RLS, semilla
      (0001–0006 escritas; faltan índices, funciones, semilla y README)
- [ ] 5 · Comprobación (selftest, navegador, movimiento reducido) y commit

## Reglas que siguen en pie

- Sitio estático: nada de `import`/`export`, se abre con doble clic.
- El orden de los `<script>` de `index.html` no cambia.
- Los `id` del marcado son la interfaz con `js/`: si se renombran, se
  rompen la cesta, la lupa y la cuenta. Se conservan todos.
- `js/meshes.js` e `img/` siguen generados.

## Lo que cambia respecto a `main`

La portada dejaba de ser Himon (papel claro, acento lima, radio 4 px,
tracking negativo) y pasa a ser el lenguaje del original: negro, versalita
con tracking positivo, píldoras y filetes. Es un cambio de sistema, no un
retoque; por eso va en rama y por eso hay que reescribir la sección
«Diseño» de `CLAUDE.md` antes de cerrar.
