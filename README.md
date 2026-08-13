# Armería Alcántara

Armería argentina para tiro deportivo y caza: catálogo con scroll infinito,
esquema 3D de fondo que gira con el scroll y navegación responsive. Cada
ficha lleva su régimen ANMaC y el precio en pesos o dólares.

Sitio estático sin build ni dependencias: abre `index.html` en el navegador.

```
node test/selftest.js   # catálogo, paginación y geometría 3D
```

- `index.html` · estructura y orden de carga de los scripts
- `css/tokens.css` · paleta y escala tipográfica
- `js/scene.js` · motor 3D (fondo y fichas)
- `js/meshes.js` · mallas horneadas en Blender (generado, no editar)
- `tools/models.py` · las modela y las exporta
- `js/catalog.js` · 102 referencias reales, precios en USD y cambio a pesos
- `js/main.js` · rejilla infinita, filtros y cesta

Marcas, modelos y fichas técnicas son reales. Los precios son de referencia
del mercado argentino y se muestran en pesos o en dólares. Página de
demostración.
