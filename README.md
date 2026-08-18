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
- `img/` · renders de Cycles: 4 por ficha y 24 de fondo por pieza (generado)
- `tools/models.py` · las modela y las exporta
- `tools/fotos.py` · baja las fotos libres de `img/model/` y comprueba la licencia
- `tools/render.py` · el horno de Cycles del 3D apartado; la página ya no lo usa
- `js/catalog.js` · 102 referencias reales, precios en USD y cambio a pesos
- `js/main.js` · rejilla infinita, filtros y cesta

Marcas, modelos y fichas técnicas son reales. Los precios son de referencia
del mercado argentino y se muestran en pesos o en dólares. Página de
demostración.

Las imágenes de producto son renders propios, no fotos de fabricante: esas
tienen derechos y no se pueden redistribuir. Si se dispone de fotos con
licencia, entran por el campo `photo:` de cada producto.
