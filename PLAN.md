# Precios argentinos + selector ARS/USD

Estado: fase 1 en curso · 2026-08-13

## Decisión de diseño

El precio se guarda **en USD** y los pesos se derivan con una única constante
`ARS_POR_USD`. En Argentina las armas se cotizan en dólares justamente por la
inflación: guardar pesos obligaría a reescribir 102 números cada mes; así se
toca uno.

## Fases

- [ ] 1 · Investigar precios reales del mercado argentino (anclas por familia)
      y el tipo de cambio del día. Derivar multiplicadores por familia.
- [ ] 2 · Reescribir los precios de `js/catalog.js` en USD.
- [ ] 3 · Selector ARS/USD: reformatea las fichas ya pintadas sin recargar la
      rejilla, recuerda la elección, formato `es-AR`.
- [ ] 4 · selftest + comprobación visual (los importes en pesos son de 8
      cifras: hay que ver que no rompan la ficha).
- [ ] 5 · Actualizar el pendiente de `CLAUDE.md` y commit.

## Cuidado con

- `main.js:217` usa `catalog.price()` para formatear el **recuento** del hero
  (102 referencias). No puede acabar diciendo «US$ 102».
- Volver a paginar al cambiar de moneda perdería la posición del scroll.
- `localStorage` en `try/catch`: sobre `file://` algunos navegadores lo bloquean.

## Fuera de alcance (avisar, no tocar)

Las licencias D/E/F y el domicilio de Eibar son españoles. Con precios
argentinos eso queda incoherente; adaptarlo a ANMaC/CLU es otra tarea.
