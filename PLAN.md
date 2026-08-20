# Buscar, cuenta, cesta y la base de datos

Objetivo: que los tres botones de la barra dejen de ser adornos y que quede
escrito el esquema de base de datos con el que esta tienda funcionaria de
verdad el dia que tenga servidor.

La pagina sigue siendo estatica: sin build, sin dependencias, doble clic en
`index.html`. El estado del usuario vive en `localStorage`; el esquema SQL es
para el futuro backend y no lo lee nadie desde el navegador.

## Fases

- [x] 1. Reglas de regimen en `js/catalog.js` (que exige cada familia, calibre
      de la municion, cartuchos por caja y tope TCCM). Una sola fuente para la
      cesta y para el seed de la base.
- [x] 2. `js/cart.js` + panel: lineas, cantidades, total, avisos de regimen,
      persistencia. La ficha deja de sumar a un contador y suma a la cesta.
- [x] 3. `js/search.js` + panel: busca sobre el catalogo ya construido y
      manda el resultado a la rejilla.
- [x] 4. `js/account.js` + panel: perfil local (CLU, vencimiento, TCCM). La
      cesta lo usa para decir que falta antes de reservar.
- [ ] 5. `db/schema.sql`: catalogo, existencias serializadas con CUIM, clientes,
      credenciales, pedidos, tramites ANMaC, taller. `tools/seed.js` lo llena
      desde `js/catalog.js`.
- [ ] 6. Selftest y documentacion.
