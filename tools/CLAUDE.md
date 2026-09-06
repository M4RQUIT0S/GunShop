# Herramientas conservadas (`tools/`)

Ninguna corre en build ni en CI; son insumo manual de fases anteriores de la
migración y del respaldo 3D aparcado.

| Fichero | Para qué | Se corre cuando |
|---|---|---|
| `tools/seed-supabase.js` | Generó `db/supabase/seed-productos.sql` (idempotente) leyendo `js/catalog.js`. **Hoy no corre**: al fusionar el port en `main` se borró el sitio estático y con él su catálogo, que era la última copia. El SQL que produjo está commiteado y aplicado; para volver a generarlo hay que sacar `js/catalog.js` del historial (rama `main-antes-del-merge`) o apuntar el script a Supabase | no se corre hoy |
| `tools/seed.js` | Genera el `db/seed.sql` del esquema Postgres viejo (`db/schema.sql`) desde un `js/catalog.js` local — ese fichero ya no existe en esta rama (se borró en la fase de limpieza junto con el resto del sitio estático), así que hoy **no corre** sin apuntarlo a otra fuente. Se conserva como referencia de cómo se generó `db/seed.sql` | no se corre hoy; ver nota más abajo |
| `tools/models.py` | Modela las 8 piezas del respaldo 3D en Blender y hornea `js/meshes.js` | si el respaldo 3D vuelve a activarse |
| `tools/fotos.py` | Baja las fotos genéricas de `public/img/model/` desde Wikimedia Commons, sólo licencias redistribuibles | si hace falta una foto genérica nueva |
| `tools/marca.py` | Hornea el monograma en PNG (`--tam`). Existe porque Google pide el logo del consent screen en mapa de bits y no acepta SVG | si hace falta el monograma en otro tamaño |
