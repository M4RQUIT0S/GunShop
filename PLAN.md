# Más subcategorías dentro de la armería

Ampliar el segundo nivel de filtros con las subcategorías de armería que tiene
triestina.com.ar y a GunShop le faltan. **Sin armas usadas** (pedido expreso:
una usada es unidad única con número de serie, y el catálogo del front no
modela unidades).

## Estado

- [x] **1. Chips que no se recortan.** `.filters` era una sola fila con
      `overflow-x: auto` y la barra oculta: lo que no cabía desaparecía sin
      pista. Ahora `flex-wrap: wrap`. Por debajo de 40rem envuelve a tres
      líneas, así que ahí deja de ser `sticky` — pegada se comía 169 px de una
      vista de 844.
- [x] **2. Filtro de calibre.** `<select>` nativo que cruza con familia,
      subcategoría y búsqueda. Saca el calibre con `catalog.calibre()`, la
      misma función con la que la cesta cuenta el cupo de la TCCM.
- [ ] **3. Subcategorías nuevas de producto — BLOQUEADO POR FOTOGRAFÍA.**
- [ ] **4. Retirar este cuaderno** cuando se cierre la fase 3.

## Por qué está bloqueada la fase 3

No es la taxonomía: es que **no hay foto honesta** para las subcategorías que
faltan (revólver, bípode, monturas, linterna, protección auditiva y ocular,
caja de munición, cinturón, colimador, dies).

Se buscó en Commons dos veces —por texto libre y por categoría, filtrando por
licencia redistribuible, ancho mínimo y apaisada— y se **miraron** las
candidatas, que es lo que el CLAUDE.md manda hacer. Las tres mejores fallaron:

| Slug | Título prometedor | Lo que era de verdad |
|---|---|---|
| `revolver` | *Francotte revolver 11 mm* (CC BY 4.0) | Revólver de espiga de 1870 con el nº de inventario «AM 40611» impreso |
| `mount` | *Zeiss rail scope mounting system* (CC BY-SA 4.0) | No es foto: corte vectorial en plano |
| `flashlight` | *3 Flashlights white* (CC BY-SA 4.0) | Linternas de cromo con publicidad de «GOETTL Air Conditioning» |

El resto de categorías de Commons son fotos de polígono militar —soldados
*usando* protección auditiva— y no de producto. «Reloading dies» devuelve un
grupo punk alemán llamado Die Kassierer.

Esto confirma lo que ya dice el CLAUDE.md: *«Commons no sirve para este nivel:
no tiene fotografía de producto de modelos comerciales concretos.»*

**Salidas posibles**, por orden de limpieza:

1. Fotografiar en el taller. Es lo que el CLAUDE.md ya pide para las 76 fotos
   de `img/product/`, así que resuelve las dos deudas a la vez.
2. Pedir permiso al distribuidor y anotarlo en `img/product/CREDITS.md`.
3. Añadir las subcategorías **sin producto nuevo**, dejando que caigan a la
   genérica de su familia. Se descartó: cuatro fichas de «Catalejo» enseñando
   la misma foto de visor es peor que no tener la subcategoría.

## Régimen: lo que se deja fuera y por qué

- **Fulminantes y pólvora.** Componente explosivo; no está claro que sea venta
  libre en la ANMaC y equivocarse es entregarlo sin pedir credencial. El
  CLAUDE.md avisa de que una etiqueta desconocida cae en «Venta libre».
- **Vainas y puntas.** Inertes, casi seguro venta libre, pero *casi* no basta
  para esto. Fuera hasta verificarlo.
- **Armas usadas.** Fuera por pedido.
