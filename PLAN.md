# Rediseño con el sistema de Himon + fotos reales

Portar a GunShop el lenguaje visual de la plantilla Himon (Framer, autor Sang)
y sustituir los renders 3D por fotografías reales, una por modelo.

El 3D queda apartado: no se modela más. `js/scene.js` sobrevive sólo como
último respaldo de la ficha, no como fondo.

## Sistema extraído de Himon

Medido del CSS servido en himon.framer.website, no a ojo:

- Color: `#1c1c1c` tinta, `#f2f2f2`/`#f0f0eb` papel, grises
  `#4a4f59` `#696a6d` `#7e7f85` `#c6c7cc` `#bdbdc2`, y un único acento
  lima `#bde74e` (hover `#b4db46`).
- Tipografía: Geist + Geist Mono (ambas OFL). Peso máximo 500, nunca 700.
- Escala: hero 88/70/54/44 en mayúsculas, sección 64/48/40, h3 40/32,
  cuerpo 18/17/16/15/14, mono 14/13/12.
- Tracking negativo escalado: −0.05em en titulares, −0.02em en cuerpo.
- Radio 4px. Espaciado en múltiplos de 4. Sin bordes de 1px: separa el fondo.
- Ancho de contenido 1200, medida de lectura 700–850.
- Cortes 640 / 810 / 1200 / 1680.
- Movimiento: `cubic-bezier(.44, 0, .56, 1)` a 0.4s. Sin rebote.
- `backdrop-filter: blur(6px)` en la barra.

## Fases

- [ ] 1. Fotos: ocho imágenes reales de licencia libre a `img/model/`.
- [ ] 2. Tokens: `css/tokens.css` con la paleta, la escala y la curva.
- [ ] 3. Base: página clara con secciones oscuras, barra, portada, pie.
- [ ] 4. Catálogo: ficha en el estilo nuevo.
- [ ] 5. Secciones: métricas, servicios, proceso, marcas, preguntas.
- [ ] 6. Animaciones: entrada por scroll, marquesina, contadores.
- [ ] 7. Selftest y CLAUDE.md al día.

## Decisiones

- **Fotos libres, no de fabricante.** El repositorio es público: subir fotos
  de producto de Glock o Beretta las redistribuye hoy, no el día que salga a
  producción. Con material de Wikimedia Commons (dominio público, CC0, CC BY)
  la ficha enseña una foto real igual y el repositorio queda limpio. Se
  reemplazan por las definitivas tocando `img/model/`, sin tocar código.
- **No se borra nada de `img/`.** Los 224 renders horneados quedan como tramo
  intermedio de la cascada. `img/hero/` (192 ficheros) sí queda sin uso al
  quitar el lienzo del fondo: pendiente de decidir si se borra.
