# Armería Alcántara

Armería argentina para tiro deportivo y caza: catálogo con scroll infinito,
fondo 3D que gira con el scroll y navegación responsive. Cada ficha lleva su
régimen ANMaC y el precio en pesos o dólares.

Sitio estático sin build ni dependencias: abre `index.html` en el navegador.

```
node test/selftest.js   # catálogo, paginación, geometría 3D e imágenes
```

- `index.html` · estructura y orden de carga de los scripts
- `css/tokens.css` · paleta y escala tipográfica
- `js/scene.js` · motor 3D: dibuja el esquema cuando no hay imagen
- `js/meshes.js` · las 7 mallas horneadas en Blender (generado, no editar)
- `img/` · una foto por producto y una genérica por modelo, 1200x750
- `tools/models.py` · modela las mallas en Blender y las hornea a `js/meshes.js`
- `tools/fotos.py` · baja las fotos libres de `img/model/` y comprueba la licencia
- `js/catalog.js` · 102 referencias reales, precios en USD y cambio a pesos
- `js/main.js` · rejilla infinita, filtros y cesta

Marcas, modelos y fichas técnicas son reales. Los precios son de referencia
del mercado argentino y se muestran en pesos o en dólares. Página de
demostración.

Las fotos de `img/product/` son de catálogo del fabricante o del distribuidor
y **no están aclaradas para redistribuir**: antes de producción hay que
sustituirlas por fotos del taller o pedir permiso. Cada una lleva su origen en
`img/product/CREDITS.md`. Las de `img/model/` sí son de licencia libre.
