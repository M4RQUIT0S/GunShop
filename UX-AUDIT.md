# UX Audit: GunShop — segunda pasada

**Score: 53/60** | **Grade: A** (primera pasada: 43/60 estática, 41/60 tras probar producción)

Fecha: 2026-10-08. Código auditado: `747f24d`, rama `main`, el mismo que sirve `gun-shop-mu.vercel.app`. Alcance: portada, catálogo, ficha, paneles de cesta, cuenta, búsqueda y consulta, 404 y páginas de error.

Método: `laws-of-ux-review` sobre el código actual, leído entero de nuevo (no se puntúa de memoria lo arreglado), más medidas en producción: tamaños de los objetivos a 390 px y el tiempo de una navegación entre filtros. Las comprobaciones de comportamiento de cada arreglo están en los commits del plan (abajo, en la primera pasada). La nota es heurística: no sustituye una prueba con usuarios ni una auditoría de accesibilidad con lector de pantalla.

| Grade | Range |
|-------|-------|
| A | 50–60 |
| B | 40–49 |
| C | 30–39 |
| D | 20–29 |
| F | 0–19 |

Puntuación bruta: **49/56** en 28 leyes aplicables (las mismas dos N/A). 21 leyes con 2, siete con 1, ninguna con 0. Normalizada: `49 / 56 × 60 = 52,5`, redondeada a **53**. Ninguna ley queda en 0. Lo que queda es parcial, y casi todo se arregla en pocas líneas.

### Qué cambió respecto a la primera pasada

| Ley | 1.ª (tras producción) | 2.ª | Por qué |
|-----|:---:|:---:|---------|
| Doherty Threshold | 0 | 1 | Carga, error y vacío ya se distinguen en búsqueda, cesta y ficha (`1919460`). Queda la navegación entre filtros sin señal (W1). |
| Mental Model | 0 | 1 | La cesta y la consulta dicen que son una simulación; el botón roto de Google ya no sale. Queda el «Añadir a la cesta» de las tarjetas (W4). |
| Peak-End Rule | 0 | 1 | Fin honesto y reversible; 404 y error con salida. Quedan la cesta vacía sin acción y los resúmenes que no se pueden abrir (S1). |
| Cognitive Bias | 0 | 1 | Sin «89 en stock» ni «48 h»; el cambio dice su fecha. Quedan dos promesas de servicio en la portada (W5). |
| Working Memory | 1 | 2 | Un filtro marcado ya no se esconde: `desplegables()`, `lib/facetas.ts:96`, con tres pruebas. |
| Law of Similarity | 1 | 2 | Miniaturas enlazadas; el mismo resumen ya no sale en dos monedas. |
| Von Restorff Effect | 1 | 2 | El aviso de demostración está junto a cada acción: ficha, cesta, consulta y cabecera del catálogo. |
| Cognitive Load | 1 | 2 | La consulta ya no explica servidores: «la consulta no se envía. Vas a ver el texto…». |
| Zeigarnik Effect | 1 | 2 | La consulta conserva el borrador al cerrar y reabrir. |
| Tesler's Law | 1 | 2 | La consulta toma nombre y correo de «Mi cuenta». |
| Paradox of the Active User | 1 | 2 | Catálogo vacío, búsqueda sin resultados y 404 ofrecen el paso que sirve. |
| Fitts's Law | 1 | 1 | Los paneles ya miden 44 px; los filtros del catálogo siguen en 31 (W2). |
| Jakob's Law | 1 | 1 | `aria-pressed` corregido; aparecen otras convenciones rotas (W3). |
| Flow | 1 | 1 | Sin cambios: el menú que se abre al pasar el ratón es una decisión de diseño (S2). |

## Critical Issues (0)

Ninguna ley en 0.

## Warnings (5)

### W1 · Doherty Threshold — Score: 1/2

**Problem:** Cambiar de familia o de filtro es una navegación al servidor. En producción, de «Óptica» a «Rifles» pasaron **~650 ms** desde el clic hasta el contenido nuevo, y en ese tiempo la página no cambia nada: ni el chip pulsado, ni la rejilla, ni el recuento. Lo mismo con cada opción de los desplegables (`app/catalogo/page.tsx:127–165`, `app/components/Desplegable.tsx:37`). Las páginas dinámicas responden en 0,6–0,9 s; el feedback de carga, error y vacío de los paneles, en cambio, ya está resuelto.

**Fix:** Next 16 trae `useLinkStatus` para esto. Un indicio dentro de cada enlace de filtro, que solo se ve si la navegación pasa de 100 ms:

```tsx
// app/components/Pendiente.tsx (nuevo, cliente)
'use client'
import { useLinkStatus } from 'next/link'
export default function Pendiente() {
  const { pending } = useLinkStatus()
  return <span className={`pendiente${pending ? ' is-on' : ''}`} aria-hidden="true" />
}
```

```tsx
// app/catalogo/page.tsx:131 — dentro de cada chip (y en Desplegable.tsx:37, en cada opción)
<Link key={f.slug} href={href({ familia: f.slug })} className="chip" aria-current={…}>
  {f.name}
  <span className="chip__n">{countsPorFamilia[f.slug] ?? 0}</span>
  <Pendiente />
</Link>
```

```css
/* css/catalog.css — aparece a los 100 ms; con movimiento reducido, sin animación */
.pendiente { width: 0.4rem; height: 0.4rem; border-radius: 50%; background: var(--tinta); opacity: 0; }
.pendiente.is-on { animation: pendiente 0s 100ms forwards; }
@keyframes pendiente { to { opacity: 1; } }
```

### W2 · Fitts's Law — Score: 1/2

**Problem:** Los controles de los paneles ya miden 44 px (`css/shop.css`, paso 6), pero lo que más se toca en el catálogo no. Medido en producción a 390 px: chips de familia **74×31**, botón de desplegable **92×31**, «Limpiar» **92×31**, «← Catálogo» de la ficha **358×31**, opciones del desplegable **190×35**, «Pausar el desfile» **166×31**. Pasan el mínimo de 24 px de WCAG 2.5.8, pero quedan lejos de los 44 que el resto del sitio ya usa. `css/catalog.css:120` (`.chip`), `:152` (`.drop__bt`), `:241` (`.drop__op`), `css/base.css:911` (`.marquee__pausa`).

**Fix:** Crecer la caja, no la letra. Los chips ya van en fila con 20 px de separación, así que el bloque gana alto sin desbordar:

```css
/* css/catalog.css:120 y :152 */
.chip, .drop__bt { min-height: 2.75rem; display: inline-flex; align-items: center; }
/* :241 */
.drop__op { min-height: 2.75rem; }
/* css/base.css:911 */
.marquee__pausa { min-height: 2.75rem; }
```

Verificar después a 320 y 390 px que la fila de familias sigue sin desbordar.

### W3 · Jakob's Law — Score: 1/2

**Problem:** El `aria-pressed` en enlaces de la primera pasada está corregido (`Desplegable.tsx:42`, `aria-current` en los chips). Aparecen cuatro convenciones más, menores:

1. **Una sugerencia de búsqueda no lleva al producto.** `SearchPanel.tsx:116–125`: pulsar «PELICAN VAULT V730» navega a `/catalogo?q=Pelican Vault V730`, una rejilla con una sola tarjeta, y hace falta otro clic. En cualquier tienda, la sugerencia abre la ficha.
2. **El contador de la cesta no existe para el lector de pantalla.** `HeaderActions.tsx:55` se llama «Cesta» y la burbuja (`CartCount.tsx`) es `aria-hidden`.
3. **`aria-label` en un `<div>` sin rol** (`app/catalogo/page.tsx:99` y `:145`): no se anuncia; el grupo de filtros queda sin nombre.
4. **El botón de pausa cambia a la vez el texto y `aria-pressed`** (`Marquee.tsx:31–36`): «Reanudar el desfile, presionado» se lee como doble estado.

**Fix:**

```tsx
// SearchPanel.tsx:116 — la sugerencia abre la ficha; el boton de abajo sigue llevando a todos los resultados
<Link key={p.id} className="sug" href={`/producto/${slugDe(p)}?q=${encodeURIComponent(texto)}`} onClick={cerrar}>
```

```tsx
// HeaderActions.tsx:55 — `piezas` ya esta en useCart()
aria-label={piezas ? `Cesta, ${piezas} ${piezas === 1 ? 'artículo' : 'artículos'}` : 'Cesta'}
```

```tsx
// app/catalogo/page.tsx:99 y :145
<div className="filters" role="group" aria-label="Filtrar por familia">
```

```tsx
// Marquee.tsx:31 — un estado, no dos: el rotulo fijo y aria-pressed dice si esta parado
<button className="marquee__pausa" type="button" aria-pressed={quieta} onClick={…}>Pausar el desfile</button>
```

### W4 · Mental Model — Score: 1/2

**Problem:** `app/catalogo/page.tsx:215` pone «Añadir a la cesta» en cada tarjeta de venta libre, con la misma clase (`.card__add`) y el mismo hover invertido que el botón real de la ficha (`css/catalog.css:386–400`). No es un botón: es parte del enlace de la tarjeta, y pulsarlo lleva a la ficha sin añadir nada. Lo introdujo el paso 5, que cambió «Compra directa» por el rótulo del botón de la ficha. En una rejilla de 89 tarjetas, es lo que más se ve.

**Fix:** El rótulo dice adónde lleva, sin perder la diferencia entre venta libre y consulta que justifica la etiqueta:

```tsx
// Before — app/catalogo/page.tsx:215
<span className="card__add">{exige ? 'Consultar' : 'Añadir a la cesta'}</span>

// After
<span className="card__add">{exige ? 'Ver y consultar' : 'Ver y añadir'}</span>
```

La alternativa (un botón de verdad que llame a `add()` sin salir del catálogo) obliga a separar el botón del enlace de la tarjeta y a convertirlo en componente de cliente. Solo vale la pena si se quiere comprar desde el listado.

### W5 · Cognitive Bias — Score: 1/2

**Problem:** Las cifras falsas se fueron, pero la portada mantiene dos promesas de servicio sin respaldo en un sitio de demostración. `app/page.tsx:129–131` y `:160–162` dicen dos veces «Lo que no está en vitrina se encarga y llega con la documentación hecha», y `:187–188` titula «Representación · Las casas que trabajamos» sobre las 56 marcas que salen del catálogo, que no son representaciones acreditadas. El cambio ya dice su fecha en el pie (`Footer.tsx:52`), pero sigue siendo del 24/08: el dato lo tiene que actualizar el dueño en `fx_rate`.

**Fix:**

```tsx
// app/page.tsx:129–131 y :160–162
<p className="lede">… Lo que no está en vitrina se puede consultar desde su ficha.</p>

// app/page.tsx:187–188
<p className="eyebrow" data-reveal>Marcas</p>
<h2 className="h-section" id="marcas-h" data-reveal style={d(1)}>Las casas del catálogo</h2>
```

## Suggestions (2)

### S1 · Peak-End Rule — Score: 1/2

**Improve:** Los finales ya son honestos y tienen salida: el resumen de la cesta, la consulta preparada, el 404 y la página de error. Quedan dos huecos. La cesta vacía (`CartPanel.tsx:110–113`) es el único estado vacío sin acción: la búsqueda tiene «Limpiar la búsqueda» y el catálogo «Ver todo el catálogo». Y los resúmenes de «Mi cuenta» (`AccountPanel.tsx:74–83`) muestran código, fecha, número de líneas y total, pero no qué había dentro.

**Code:**

```tsx
// CartPanel.tsx:111 — como los otros estados vacios
<div className="panel__vacio">
  <p>La cesta está vacía.</p>
  <a className="btn btn--ghost" href="/catalogo" onClick={cerrar}>Ver el catálogo</a>
</div>
```

```tsx
// AccountPanel.tsx:76 — el resumen ya guarda {id, n}; los nombres salen del catalogo de CartContext
const { productos } = useCart()
const nombre = (id: number) => productos.find((x) => x.id === id)
<details className="pedido">
  <summary>{p.codigo} · {fecha(…)} · {p.total}</summary>
  <ul>{p.lineas.map((l) => <li key={l.id}>{l.n} × {nombre(l.id)?.marca} {nombre(l.id)?.ref}</li>)}</ul>
</details>
```

### S2 · Flow — Score: 1/2

**Improve:** Sin cambios desde la primera pasada, y a propósito. El menú se abre a los 150 ms de pasar el ratón por el botón (`NavMenu.tsx:222`), tapa la pantalla y bloquea el scroll. El foco ya se muda sin anillo y no puede robarle lo escrito a nadie, porque los campos viven en diálogos modales. Lo que queda es la apertura accidental al cruzar la esquina superior izquierda.

**Code:** Si en uso real se abre sin querer, el ajuste más barato es alargar la espera antes de tocar la interacción:

```tsx
// NavMenu.tsx:222
espera.current = window.setTimeout(() => { porHover.current = true; setOpen(true) }, 300)
```

Es una decisión de producto (`7ab2ee4`), no un fallo: no se cambia sin el dueño.

## Compliant (21)

| Ley | Score | Evidencia |
|-----|-------|-----------|
| Aesthetic-Usability Effect | 2/2 | Lo nuevo (avisos, 404, error, resumen) reutiliza los tokens y clases del sistema: `PaginaAviso.tsx`, `.hecho`, `.panel__vacio`. |
| Law of Prägnanz | 2/2 | Iconos de trazo simple en la cabecera, `HeaderActions.tsx:35–59`. |
| Von Restorff Effect | 2/2 | Aviso de demostración junto a la acción: ficha `app/producto/[slug]/page.tsx:151`, cesta «Simulación de reserva» `CartPanel.tsx:91`, consulta `ConsultaPanel.tsx:136`, cabecera del catálogo `app/catalogo/page.tsx:92`. CTA primario diferenciado (`.btn` frente a `.btn--ghost`). |
| Law of Similarity | 2/2 | Miniaturas que se abren como parecen, `app/producto/[slug]/page.tsx:94–106`; una sola moneda en cesta y cuenta, `AccountPanel.tsx:80`. |
| Law of Proximity | 2/2 | Campos con su etiqueta, `css/shop.css` `.campo`; bloques de ficha agrupados. |
| Law of Common Region | 2/2 | Diálogos con cabecera, cuerpo y pie delimitados; tarjetas con su caja. |
| Cognitive Load | 2/2 | Notas cortas y en lenguaje de quien compra: `ConsultaPanel.tsx:136`, `CartPanel.tsx:182`. |
| Hick's Law | 2/2 | Siete entradas en el menú (Catálogo + seis familias), árbol progresivo, `NavMenu.tsx`; facetas solo con catálogo acotado. |
| Miller's Law | 2/2 | Familias y facetas agrupadas; la búsqueda enseña ocho sugerencias, `SearchPanel.tsx:20`. |
| Chunking | 2/2 | Ficha en precio, calibre, especificaciones y acción, `app/producto/[slug]/page.tsx:120–151`. |
| Choice Overload | 2/2 | Opciones dentro de desplegables, no expuestas, `Desplegable.tsx`. |
| Serial Position Effect | 2/2 | «Catálogo» primero en el menú; la acción al final de cada formulario y de la ficha. |
| Zeigarnik Effect | 2/2 | Borrador de la consulta conservado, `ConsultaPanel.tsx:101` + `ConsultaContext.tsx`; la cesta sobrevive al resumen y a la recarga. |
| Working Memory | 2/2 | Filtros marcados siempre visibles, `lib/facetas.ts:96` (probado en `test/facetas.test.ts`); los filtros viajan a la ficha y vuelven. |
| Postel's Law | 2/2 | Búsqueda sin acentos ni mayúsculas, `lib/buscar.ts`; un valor de filtro huérfano en la URL sigue en su lista para quitarlo. |
| Tesler's Law | 2/2 | La consulta toma nombre y correo de la cuenta, `ConsultaPanel.tsx:107` y `:112`; un solo campo de nombre, como en la cuenta. |
| Occam's Razor | 2/2 | Una acción principal por vista: la ficha, `ProductoCTA.tsx`, y el pie de la cesta. |
| Pareto Principle | 2/2 | Catálogo y búsqueda accesibles desde la primera pantalla y desde la cabecera. |
| Selective Attention | 2/2 | Jerarquía título → precio → acción; los diálogos aíslan la tarea; movimiento reducido respetado. |
| Paradox of the Active User | 2/2 | Salidas donde hacía falta deducirlas: `app/catalogo/page.tsx:225`, `SearchPanel.tsx:110`, `app/not-found.tsx:20`, `app/error.tsx:17`. |
| Parkinson's Law | 2/2 | Campos acotados (`maxLength`) en cuenta y consulta. |

## N/A (2)

- **Law of Uniform Connectedness:** sigue sin haber recorridos secuenciales ni relaciones que pidan conectores.
- **Goal-Gradient Effect:** no hay un proceso de varios pasos con progreso medible; el resumen es una sola acción.

## Action Plan (do in this order)

1. **Señal mientras navega un filtro** — `useLinkStatus` en chips, opciones y «Limpiar» → `app/catalogo/page.tsx:127`, `Desplegable.tsx:37`, `app/components/Pendiente.tsx` (nuevo).
2. **Rótulo de la tarjeta que dice lo que hace** — «Ver y añadir» / «Ver y consultar» → `app/catalogo/page.tsx:215`.
3. **Convenciones** — sugerencia que abre la ficha, contador de la cesta anunciado, `role="group"` en los filtros, pausa con un solo estado → `SearchPanel.tsx:116`, `HeaderActions.tsx:55`, `app/catalogo/page.tsx:99`, `Marquee.tsx:31`.
4. **Filtros a 44 px** → `css/catalog.css:120`, `:152`, `:241`; `css/base.css:911`.
5. **Promesas de la portada** → `app/page.tsx:129`, `:160`, `:187`.
6. **Cesta vacía con salida y resúmenes que se abren** → `CartPanel.tsx:111`, `AccountPanel.tsx:76`.
7. **Retraso del menú al pasar el ratón** — solo si el dueño lo decide → `NavMenu.tsx:222`.

Los pasos 1 a 6 suben la nota a 55/56 en bruto (59/60); el 7, si se hace, a 56/56. Fuera de las 30 leyes siguen abiertos B1 (registro por correo en Auth), el alta de Google, `fx_rate` del 24/08, Pelican/Peli y la foto de la V730: todo eso es configuración o datos que decide el dueño.

## Verificación de esta pasada

- Código releído entero en `747f24d`: los diez componentes de interfaz, las tres páginas, `error.tsx`, `global-error.tsx`, `not-found.tsx` y las reglas de CSS de los objetivos medidos.
- Producción, a 390 px: tamaños medidos con `getBoundingClientRect()` (W2), sin desbordamiento horizontal (`scrollWidth` 390) en catálogo, ficha y portada.
- Producción: navegación «Óptica» → «Rifles» cronometrada desde el clic, ~650 ms sin cambio visible (W1).
- Build y suite (34/34) en verde sobre `747f24d`, con el último commit.
- No verificado: lector de pantalla y recorrido completo con teclado; contraste (los tokens no cambiaron desde la primera pasada).

---

# Primera pasada (2026-10-07) — historial

**Score: 41/60** tras la prueba en producción (43/60 en la revisión estática) | **Grade: B**. Se conserva entera porque el código cita sus hallazgos («UX-AUDIT.md, P2», «Peak-End»…). Todo lo que propone está aplicado: ver su plan de acción, con los commits.

Fecha: 2026-10-07. Código auditado: `11426ea`, rama `main` — el mismo commit que sirve producción.
Auditoría estática con `laws-of-ux-review`: JSX, CSS, contextos y funciones de búsqueda/filtros. Una reproducción local con datos sintéticos confirmó el caso de filtros ocultos. La sección [Verificación en producción](#verificación-en-producción-2026-10-07) añade la prueba sobre el despliegue de Vercel y la base de Supabase: confirma los hallazgos de abajo con datos reales y suma nueve nuevos (P1–P9) y cinco de backend (B1–B5). La nota es una evaluación heurística, no una certificación de accesibilidad ni una medición con usuarios.

Puntuación bruta: **40/56** en 28 leyes aplicables; dos N/A. Se normaliza a 60: `40 / 56 × 60 = 42,86`, redondeado a 43. Hay 15 leyes con 2, diez con 1 y tres con 0. Una nota B no compensa los fallos críticos del flujo.

| Grade | Range |
|-------|-------|
| A | 50–60 |
| B | 40–49 |
| C | 30–39 |
| D | 20–29 |
| F | 0–19 |

Las correcciones siguientes son propuestas, no cambios implementados. Los fragmentos muestran el cambio relevante; cuando requieren estado o handlers nuevos se indica expresamente. Se conserva el diseño Alcántara y el bloqueo actual de productos controlados.

## Critical Issues (3)

### Doherty Threshold — Score: 0/2

**Problem:** En `app/components/SearchPanel.tsx:40` la petición solo tiene `.then`; `cargado` no gobierna el resultado vacío de la línea 104. Escribir durante la carga produce «Nada con…» antes de conocer los resultados; un rechazo no tiene recuperación. En `app/components/CartContext.tsx:88` tampoco hay captura de error, mientras `CartPanel.tsx:84` interpreta las líneas todavía no resueltas como cesta vacía. `ProductoCTA.tsx:22` omite `catalogoListo`: el botón parece activo aunque `add()` pueda ignorarlo (`CartContext.tsx:115`). Esto demuestra falta de feedback, no una latencia medida superior a 400 ms.

**Fix:** Modelar estados carga/listo/error y reintento, conservar la consulta al reintentar y anunciar cambios con `role="status"`. Exponer el estado de catálogo al panel y al CTA. No habilitar una acción hasta disponer de los datos que necesita.

```tsx
// Before — SearchPanel.tsx:104
{texto && !hallados.length && <p className="panel__vacio">Nada con «{texto}».</p>}

// After — requiere estado `carga` y handler `reintentar` con try/catch
{carga === 'cargando' && <p role="status">Cargando catálogo…</p>}
{carga === 'error' && <div>
  <p role="alert">No pudimos cargar el catálogo.</p>
  <button type="button" onClick={reintentar}>Reintentar</button>
</div>}
{carga === 'listo' && texto && !hallados.length &&
  <p role="status">No hay resultados para «{texto}».</p>}
```

Para las rutas, valorar `loading.tsx` y límites de error según la documentación instalada de Next. Un `loading.tsx` de página no cubre automáticamente las lecturas del layout raíz (`Nav`/`Footer`); no dar por resuelta toda espera con ese único archivo.

### Mental Model — Score: 0/2

**Problem:** `app/components/CartPanel.tsx:154` anuncia «Reserva» y «Guardada 72 h», pero `reservar()` solo escribe en localStorage y crea un mailto (`:50–59`). No existe confirmación del establecimiento. El destinatario sigue siendo `.example` (`lib/cesta.ts:70`). Además, el catálogo etiqueta «Compra directa» (`app/catalogo/page.tsx:214`) aunque no hay checkout real. La persona puede creer que ya tiene algo reservado.

**Fix:** Mientras sea una demo, describir explícitamente una simulación local, retirar plazos/promesas y no ofrecer contactos de ejemplo como operativos. Cambiar también «Tus reservas» en `AccountPanel.tsx:74` por «Borradores en este navegador». No resolverlo inventando datos comerciales ni habilitando ventas.

```tsx
// Before — CartPanel.tsx:154–157
<p className="hecho__cod">Reserva {hecho.codigo}</p>
<p>Guardada 72 h. Te esperamos con el DNI; el resto se hace en el mostrador.</p>

// After — mensaje coherente incluso si localStorage no pudo escribir
<p className="hecho__cod">Resumen de demostración {hecho.codigo}</p>
<p>No se envió ninguna solicitud ni se confirmó una reserva.</p>
```

### Peak-End Rule — Score: 0/2

**Problem:** Al terminar, `CartPanel.tsx:58` vacía la cesta. El panel muestra a la vez «La cesta está vacía», un total vacío/cero y el supuesto resguardo. Reabrir elimina `hecho` (`:35`). El historial de cuenta solo muestra código, fecha, cantidad de líneas y dólares (`AccountPanel.tsx:75`), sin poder recuperar el detalle para revisarlo. El cierre del flujo transmite éxito y pierde el contexto antes de un envío verificable.

**Fix:** Separar la vista de edición de una vista de resumen y conservar las líneas. Vaciar solo mediante una acción explícita; abrir un cliente de correo no prueba envío. Permitir volver a editar. El resumen debe explicar su estado de demostración como en el hallazgo anterior.

```tsx
// Before — CartPanel.tsx:58–59
vaciar()
setHecho({ codigo: pedido.codigo, mailto })

// After — conservar la selección y presentar un resumen reversible
setHecho({ codigo: pedido.codigo, mailto })
// En el JSX del resumen:
<button type="button" onClick={() => setHecho(null)}>Volver a editar</button>
```

## Warnings (8)

### Working Memory — Score: 1/2

**Problem:** `app/catalogo/page.tsx:77` oculta una faceta cuando sus opciones bajan de dos aunque siga seleccionada. «Limpiar» está dentro del bloque `desplegables.length > 0` (`:145–168`). Una selección activa puede desaparecer de la interfaz; si desaparecen todas las facetas también se pierde el borrado directo. La vuelta desde ficha sí conserva correctamente la URL.

**Fix:** Mantener visibles las facetas seleccionadas, incluir sus valores aunque ya no tengan coincidencias y mostrar «Limpiar filtros» independientemente del número de desplegables. Añadir chips por valor activo permite retirarlos sin recordar qué estaba seleccionado.

```tsx
// page.tsx:77 — condición propuesta
.filter(({ f, opts }) => opts.length >= 2 || (sel[f.clave] ?? []).length > 0)
// page.tsx:145 — condición propuesta del contenedor
{(desplegables.length > 0 || hayFiltro) && /* barra de filtros */}
```

Reproducción local: dos referencias de óptica, A/2x y B/4x. Seleccionar marca A y aumento 2x deja un resultado válido, cero desplegables y ningún «Limpiar». Usa las funciones reales `aplicarFacetas()` y `opciones()`; no afirma que esa pareja exista en la base actual.

### Fitts's Law — Score: 1/2

**Problem:** La cabecera tiene blancos de 44 px (`css/base.css:299`), pero los cierres de panel miden 36 px (`css/shop.css:117`) y los pasos de cantidad 28 px (`:222`), con raíz de 16 px. Esto reduce la comodidad táctil. No se declara incumplimiento WCAG por estar por debajo de 44 px.

**Fix:** Ampliar blancos y permitir que sus filas envuelvan a ancho pequeño. Verificar después a 320 y 390 px para no introducir desbordamiento.

```css
.panel__x, .linea__paso { width: 2.75rem; height: 2.75rem; }
.linea__quita { min-height: 2.75rem; padding-inline: 0.5rem; }
.linea__mandos { flex-wrap: wrap; }
```

### Jakob's Law — Score: 1/2

**Problem:** Los enlaces de filtro usan `aria-pressed` (`app/components/Desplegable.tsx:37`, `app/catalogo/page.tsx:128` y `:137`), estado de botón que no corresponde al rol nativo de enlace. El check visual está oculto a tecnologías de asistencia. La cabecera y los diálogos, por el contrario, siguen patrones convencionales.

**Fix:** Mantener enlaces reales y anunciar «Aplicar/Quitar filtro …» en su nombre accesible; representar selección con `data-selected` para CSS y un texto accesible. Para las categorías, utilizar `aria-current` cuando corresponda al conjunto actual. Actualizar los selectores de `css/catalog.css:253` y `:261` junto con el marcado.

```tsx
// Desplegable.tsx:33 — conservar href y los hijos actuales
<Link href={href(o.valor)} className="drop__op"
  data-selected={activo}
  aria-label={`${activo ? 'Quitar' : 'Aplicar'} filtro ${faceta.rotulo}: ${o.valor}`}>
  {/* valor, cantidad y check actuales */}
</Link>
```

### Law of Similarity — Score: 1/2

**Problem:** En `app/producto/[slug]/page.tsx:93` las fotos secundarias se presentan como miniaturas pero son imágenes de 88 px sin enlace ni selector (`css/catalog.css:425`). No permiten inspeccionar el detalle que su presentación sugiere. El hallazgo es condicional: se manifiesta cuando un producto tiene varias fotos.

**Fix:** Usar enlaces a las imágenes originales con nombre accesible «Ver fotografía N de …», o implementar un visor con controles de teclado y retorno del foco. La primera opción mantiene el componente de servidor y evita añadir complejidad innecesaria.

### Cognitive Bias — Score: 1/2

**Problem:** `app/page.tsx:143` llama «Referencias en stock» a `productos.length`, pero `lib/catalogo.ts:51` no consulta existencias y `:126` solo excluye discontinuados. «Entrega en armería 48 h» (`app/page.tsx:144`) es fijo. `app/catalogo/page.tsx:97` refuerza la expectativa con «Disponibilidad real». La información genera confianza sin evidencia operativa en ese flujo.

**Fix:** Cambiar los rótulos a «Referencias en catálogo» y «Catálogo de demostración»; retirar la cifra de entrega hasta contar con un dato confirmado. No añadir reseñas, urgencias ni escasez ficticias. La presencia real de stock y el plazo comercial no se verificaron en esta auditoría.

### Von Restorff Effect — Score: 1/2

**Problem:** La advertencia «Página de demostración» solo aparece al final del pie (`app/components/Footer.tsx:69`), mientras los CTA y las afirmaciones comerciales tienen mayor prominencia. Se puede completar la interacción sin advertir la limitación decisiva. Los CTA visualmente diferenciados sí están bien resueltos.

**Fix:** Incluir un aviso visible al inicio del contenido y junto al resultado de la simulación: `<p className="aviso">Sitio de demostración. No se confirman reservas ni compras.</p>`. Evitar un modal obligatorio. Retirar enlaces de contacto/redes de ejemplo (`Footer.tsx:26`, `:34`, `:45`) o identificarlos como no disponibles, sin sustituirlos por direcciones inventadas.

### Cognitive Load — Score: 1/2

**Problem:** `app/components/ConsultaPanel.tsx:121` explica «Sin servidor» y «la única forma honesta…»; exige comprender arquitectura para entender qué ocurrirá. El botón «Enviar la consulta» (`:118`) solo prepara un enlace y el paso posterior todavía no envía nada (`:55`).

**Fix:** Cambiar el botón a «Preparar mensaje de demostración» y la nota a «Podés revisar el texto antes de continuar. Esta demostración no envía mensajes». Eliminar la explicación de backend de la interfaz y conservarla en documentación. Mientras el destinatario sea `.example`, no presentar «Abrir el correo» como canal útil.

### Zeigarnik Effect — Score: 1/2

**Problem:** `app/components/ConsultaPanel.tsx:89` desmonta el formulario al preparar el correo. Cerrar y reabrir (`:42`) elimina ese resultado y remonta los campos sin el texto editado. No hay volver ni borrador; la tarea incompleta resulta difícil de retomar. La cesta sí persiste su selección antes de completar.

**Fix:** Guardar los campos en estado de borrador durante la sesión, ofrecer «Volver a editar» desde el resumen y reiniciar solo por descarte explícito o al iniciar una consulta nueva con aviso adecuado. Es suficiente estado React; no hace falta persistir nombre, correo y mensaje adicionalmente en disco.

## Suggestions (2)

### Flow — Score: 1/2

**Improve:** La apertura por hover tras 150 ms (`app/components/NavMenu.tsx:220`) mueve el foco al menú (`:110`) y bloquea el scroll (`:168`). Pasar el puntero puede interrumpir la tarea sin clic. Es comportamiento deliberado del proyecto; no se propone eliminarlo automáticamente ni se afirma frecuencia de activaciones accidentales sin una prueba con usuarios.

**Code:** Separar activación por hover de activación por clic/teclado. Como primer ajuste, condicionar el `.focus()` a `!porHover.current` y comprobar Tab, Escape y cierre con ratón. Evaluar en navegador si el bloqueo modal al hover necesita una interacción menos invasiva.

### Paradox of the Active User — Score: 1/2

**Improve:** El estado vacío del catálogo únicamente informa «0 referencias» (`app/catalogo/page.tsx:222`); el de búsqueda aconseja preguntar en el taller sin acción útil (`app/components/SearchPanel.tsx:104`). Hay que deducir cómo salir del atasco.

**Code:** Cuando `productos.length === 0`, mostrar «No hay coincidencias» y un enlace para quitar facetas conservando familia/búsqueda (`href({ familia, sub: subActivo, q: busqueda })`); si no hay facetas, ofrecer «Ver todo el catálogo». En búsqueda, ofrecer «Limpiar búsqueda» que haga `setQ('')` y devuelva foco al input. No dirigir al teléfono de ejemplo.

## Compliant (15)

Cumplimiento observable en código, pendiente de contraste visual y pruebas de interacción:

| Ley | Score | Evidencia |
|-----|-------|-----------|
| Aesthetic-Usability Effect | 2/2 | Tokens y tipografía coherentes, `css/tokens.css:7`; no se penalizan los cantos vivos decididos por marca. |
| Law of Prägnanz | 2/2 | Iconos sencillos y rotulados en `app/components/HeaderActions.tsx:28`. |
| Law of Proximity | 2/2 | Campos con etiqueta agrupada, `css/shop.css:342`, y bloques de ficha, `css/catalog.css:432`. |
| Law of Common Region | 2/2 | Diálogos, encabezado, cuerpo y pie delimitados, `css/shop.css:47`, `:79`, `:136`. |
| Hick's Law | 2/2 | Familias y árbol progresivo, `app/components/NavMenu.tsx:173`; facetas acotadas, `app/catalogo/page.tsx:47`. |
| Miller's Law | 2/2 | Información agrupada por familia/tipo, no una lista plana de todas las decisiones. No se impone un límite universal de siete productos. |
| Chunking | 2/2 | Datos de ficha separados en precio, atributos y especificaciones, `app/producto/[slug]/page.tsx:99`. |
| Choice Overload | 2/2 | Facetas bajo desplegables en vez de todas las opciones expuestas, `app/components/Desplegable.tsx:24`. |
| Serial Position Effect | 2/2 | «Catálogo» primero en navegación, `app/components/NavMenu.tsx:259`; acción al final de cada formulario. |
| Postel's Law | 2/2 | Búsqueda tolera acentos, mayúsculas y espacios, `lib/buscar.ts:14`, `:30`; no se exige búsqueda difusa por defecto. |
| Tesler's Law | 2/2 | El sistema conserva contexto de vuelta y resuelve datos; formulario de cuenta reducido a nombre/correo, `AccountPanel.tsx:163`. |
| Occam's Razor | 2/2 | Una acción principal en ficha, `app/components/ProductoCTA.tsx:25`; no se añade un wizard innecesario. |
| Pareto Principle | 2/2 | Catálogo accesible desde primera lámina y menú, búsqueda en cabecera, `app/page.tsx:89`, `HeaderActions.tsx:28`. |
| Selective Attention | 2/2 | Jerarquía de título, precio y metadatos; diálogos aíslan la tarea y existe movimiento reducido, `css/base.css:1182`. |
| Parkinson's Law | 2/2 | Formularios breves, autocompletado y longitudes acotadas, `ConsultaPanel.tsx:94`, `:115`. Sin inventar tiempos de realización. |

## N/A (2)

- **Law of Uniform Connectedness:** no hay un recorrido secuencial visual ni relaciones que necesiten conectores; no se añaden líneas decorativas para puntuar.
- **Goal-Gradient Effect:** no existe un proceso real de varios pasos con progreso medible. El problema actual es el estado veraz y recuperable de la acción, no la ausencia de una barra porcentual.

## Verificación en producción (2026-10-07)

**Entorno.** Frontend `https://gun-shop-mu.vercel.app`, despliegue `dpl_4GJM6UdLVHkfx5on143f7XnXJkwP` (READY, región `iad1`), construido desde `11426ea`: lo auditado arriba es exactamente lo que está en producción. Backend Supabase `oarrodfyqwkyhrqdfaaq` (us-west-2, Postgres 17.6) en `ACTIVE_HEALTHY`; el HTTP 521 de esta mañana no se repitió.

**Método.** Navegador real a 984 px y a 390 px (Codex y Claude Code, misma mañana); `curl` contra las páginas y la API de Auth; consultas SQL de solo lectura, asesores de seguridad y rendimiento de Supabase; grupos de errores de Vercel de los últimos 7 días. No se escribió nada en la base ni en la configuración de Vercel o Supabase. Lo único que tocó producción fue el `localStorage` del navegador de pruebas (una reserva simulada, `AY13M5G`).

### Lo que funciona

- Todas las rutas responden con su código: `/`, `/catalogo`, ficha y `/privacidad` 200; ficha inexistente y ruta inexistente 404.
- Recorrido de búsqueda completo: «Pelican» → resultado → «Ver la referencia en el catálogo» → `/catalogo?q=Pelican` → ficha → «← Catálogo» vuelve con `?q=Pelican`. Familia + marca + aumentos viajan a la ficha y vuelven con ella.
- Sin errores ni avisos de consola en búsqueda, ficha, cesta y cuenta.
- A 390 px no hay desbordamiento horizontal (`scrollWidth` 375).
- Ficha de producto controlado (Bergara B-14 Ridge): muestra «Consultar», no la cesta, y abre la consulta con el mensaje ya escrito.
- RLS activa en las 24 tablas de `public`. Con la clave publicable, `customer`, `sales_order` y `stock_level` responden 401 `42501`; el catálogo responde 200 con 89 productos activos.
- Tiempo hasta el primer byte (tres muestras): portada prerenderizada 0,32 s; `/catalogo` 0,72–0,87 s (1,83 s en frío); familia 0,70–0,75 s; ficha 0,62–0,67 s. Sólo la portada queda por debajo de los 400 ms de Doherty; las dinámicas no muestran estado intermedio mientras tanto (ver P6).

### Hallazgos de la revisión estática, confirmados en producción

| Ley | Evidencia en producción |
|-----|-------------------------|
| Mental Model / Peak-End | Pelican Vault V730 → «Reservar en la armería»: el panel muestra a la vez «La cesta está vacía», «Total $ 0», «Reserva AY13M5G · Guardada 72 h» y «Enviarla al taller» → `mailto:taller@alcantara.example`. Captura: `docs/ux-evidence/2026-10-07-cesta-confirmacion.jpg`. |
| Working Memory | Con datos reales, `?familia=optica&marca=Swarovski&aumentos=2-16x`: el desplegable Marca desaparece aunque `marca=Swarovski` sigue aplicado; quedan «Aumentos 1» y «Limpiar». Ya no es sólo una reproducción sintética. Captura (390 px): `docs/ux-evidence/2026-10-07-filtro-marca-oculto.jpg`. |
| Fitts's Law | Medidas reales en la cesta: cerrar 36×36 px, ± 28×28 px, «Quitar» 61×27 px; sólo «Reservar» llega a 46 px de alto. |
| Cognitive Load | El panel de consulta dice en producción «Sin servidor: esto no se envía a ninguna parte… la única forma honesta…». |
| Cognitive Bias | La cifra de stock no es sólo «sin fuente»: es falsa (ver P2). |

### Hallazgos nuevos

**P1 — «Continuar con Google» no lleva a Google (crítico · Mental Model, Jakob).** En Supabase Auth el proveedor está desactivado: `GET /auth/v1/authorize?provider=google` responde `400 {"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}` y `/auth/v1/settings` sólo tiene `email` activo. `signInWithOAuth()` no devuelve error en ese caso —arma la URL y redirige—, así que el aviso de `AccountContext.tsx:121` no sale nunca: quien pulsa abandona la tienda y aterriza en ese JSON de `supabase.co`. En el navegador de pruebas la redirección ni siquiera llegó a producirse y el botón quedó sin respuesta visible. Fix: no pintar el botón mientras el proveedor no esté dado de alta (una variable pública que se enciende al configurarlo) y, en el panel, cargar Client ID y Secret en *Authentication → Providers → Google*.

**P2 — «Referencias en stock: 89» con 17 en existencias (crítico · Cognitive Bias).** `disponible()` > 0 para 17 de los 79 productos que tienen variante (20 variantes). `stock_level` tiene 9 filas y 108 unidades; `firearm_unit`, 24 unidades `in_stock`. Los otros 10 productos activos no tienen `product_variant` (B5). La cifra de la portada es `productos.length` (`app/page.tsx:143`) y el catálogo la refuerza con «Disponibilidad real» y «Compra directa» en cada tarjeta. Fix: «Referencias en catálogo»; para hablar de existencias, contar con `disponible()`, que ya está concedida a `anon` a propósito.

**P3 — Cambio congelado desde el 24/08 (advertencia · Cognitive Bias).** El último `fx_rate` es 1 US$ = $ 1.520 del 2026-08-24: seis semanas. Todos los precios en pesos salen de ahí y el pie dice «Cambio aplicado» sin fecha. Fix: que `cambio()` (`lib/catalogo.ts`) traiga también `day` y el pie diga «Cambio del 24/08/2026».

**P4 — La misma reserva en dos monedas (advertencia · Law of Similarity).** La cesta muestra «$ 425.600»; «Tus reservas», «US$ 280» (`AccountPanel.tsx:75`). Fix: la misma moneda en los dos sitios.

**P5 — 404 por defecto y en inglés (advertencia · Jakob, Paradox of the Active User).** `/producto/no-existe-xyz` y `/ruta-inexistente` muestran «This page could not be found.» sin enlace al catálogo; no existen `app/not-found.tsx` ni `app/error.tsx`. Ahí acaba también un enlace compartido a una referencia descatalogada, porque la RLS oculta `discontinued_at`. Fix: `app/not-found.tsx` en español con «Ver el catálogo» y la búsqueda.

**P6 — Una caída de Supabase es un error de servidor sin explicación (advertencia · Doherty, Peak-End).** Vercel registró el 2026-10-04 a las 04:49 tres grupos de error en `/`, en este mismo despliegue: `No se pudieron leer las subcategorias: TypeError: fetch failed` y `No se pudo leer el catalogo: TypeError: fetch failed`. Sin `app/error.tsx`, el visitante ve la página de error genérica de Next. Con el 521 de esta mañana en el build, es un fallo real y repetido, no hipotético. Fix: `app/error.tsx` en español con «Reintentar» (`reset()`), y `app/global-error.tsx`, porque el layout también lee la base (`Nav`).

**P7 — La consulta vuelve a pedir lo que la cuenta ya sabe (advertencia · Tesler's Law).** `ConsultaPanel.tsx` no lee `AccountContext`: con nombre y correo guardados en «Mi cuenta», la consulta los pide otra vez, y además partidos en nombre y apellido cuando la cuenta guarda un único «Nombre y apellido». Fix: un solo campo de nombre, con `defaultValue` desde `useAccount().perfil`.

**P8 — Usted en un panel, tú en otro (sugerencia · Jakob).** Consulta: «Cuéntenos», «su propio programa de correo». Cuenta y cesta: «Entra con Google», «deja tu nombre», «Te esperamos». Para el mercado argentino lo esperable es el voseo («Entrá», «dejá»); elegir uno y aplicarlo a todos los paneles.

**P9 — Errores de datos visibles (sugerencia · Aesthetic-Usability).** `family.name` dice «Optica» y «Municion», y eso sale en chips, baldosas y «14 referencias en OPTICA»; la ficha técnica de la prensa RCBS dice «Fundicion de hierro»; la marquesina repite la marca como «Pelican» y «Peli». La foto de Pelican Vault V730 muestra una maleta de escopeta con correa de otra marca y parece no corresponder a la referencia. Fix: corrección de datos en la base (`update public.family set name = 'Óptica' where slug = 'optica'`, ídem Munición) y revisar las marcas y la foto. No se tocó la base.

### Backend y alojamiento

Fuera de las 30 leyes, pero encontrados al probar el despliegue.

**B1 — Registro por correo abierto en la API.** `/auth/v1/settings`: proveedor `email` activo, `disable_signup: false`, con confirmación por correo. La interfaz no ofrece registro por correo, pero cualquiera con la clave publicable —que viaja al navegador— puede darse de alta, confirmar el correo y, ya como `authenticated`, encadenar `registrar_cliente()` → `cart` → `crear_pedido()`. Para referencias de venta libre eso crea pedidos `reserved` reales que descuentan `disponible()`, sin panel en la tienda para verlos. Hoy hay 0 clientes y 0 pedidos. Fix, en el panel y no en el repo: si el único acceso previsto es Google, desactivar «Allow new users to sign up» del proveedor Email. No se cambió: es configuración de la cuenta.

**B2 — Funciones `SECURITY DEFINER` expuestas (asesor de seguridad: 7 avisos WARN).** `disponible(bigint)` ejecutable por `anon`; `crear_pedido`, `cupo_tccm`, `disponible`, `es_staff`, `mi_cliente` y `registrar_cliente` por `authenticated`. Todas están concedidas a propósito (`0006_rls.sql:356–358`, `0008_funciones.sql:474–478`), fijan `search_path = ''` y las que escriben comprueban `auth.uid()`. No es una fuga por sí misma; lo que la vuelve explotable es B1. `disponible()` deja contar existencias por id de variante a cualquiera, lo que es aceptable si P2 se resuelve mostrándolas.

**B3 — Sin cabeceras de seguridad.** `/catalogo` sólo trae `Strict-Transport-Security`; faltan `Content-Security-Policy` (al menos `frame-ancestors`), `X-Content-Type-Options: nosniff` y `Referrer-Policy`. No hay `next.config.*` en el repo. Fix: un `next.config.ts` mínimo con `headers()`.

**B4 — Asesor de rendimiento (INFO).** 13 claves foráneas sin índice y 22 índices sin uso. Con 89 productos y 0 pedidos no tiene efecto medible; revisarlo cuando haya pedidos reales.

**B5 — Diez productos sin variante.** Las diez referencias de Recarga (Hornady, Federal, CCI, Vihtavuori, Alliant, Sierra, RCBS) no tienen `product_variant`: se ven y tienen precio, pero `crear_pedido()` y `disponible()` trabajan por variante y no podrían reservarlas ni contarlas nunca. Hoy no afecta a la interfaz porque son `requiere-tccm` y sólo admiten consulta.

### No verificado

- OAuth completo: imposible mientras el proveedor de Google esté desactivado.
- Envío de correo: el `mailto:` no se abrió, y su destinatario es `.example`.
- Lector de pantalla y navegación con teclado sobre producción.
- Feedback de carga lenta en la búsqueda: no se provocó sin limitar la red.
- Logs individuales de Vercel: el conector de Codex respondió 403 fuera del detalle del proyecto; los grupos de errores de 7 días sí se leyeron.

### Puntuación tras la prueba en producción

Bajan dos leyes: **Tesler's Law** 2 → 1 (P7) y **Cognitive Bias** 1 → 0 (P2, P3). Bruta: **38/56**, normalizada `38 / 56 × 60 = 40,71` → **41/60 (B)**. Los demás hallazgos nuevos caen en leyes que ya tenían 0 o 1.

## Action Plan (do in this order)

1. ✅ **Corregir la falsa confirmación y conservar el resumen** — textos de demo, edición reversible y eliminación de promesas sin respaldo → `app/components/CartPanel.tsx:48`, `AccountPanel.tsx:74`. *Hecho:* el panel se llama «Simulación de reserva», el botón «Preparar el resumen»; el resumen dice que no se envió ni reservó nada, no vacía la cesta (líneas fijas a la vista, «Volver a editar» y «Vaciar la cesta», con el foco en la vista nueva), y el `mailto:` a `.example` ya no se ofrece. «Tus reservas» pasó a «Resúmenes en este navegador» y `/privacidad` describe el flujo nuevo. Captura: `docs/ux-evidence/2026-10-07-cesta-resumen-corregido.jpg`.
2. ✅ **Google y registro** — ocultar «Continuar con Google» hasta que el proveedor esté dado de alta (P1) y, en el panel de Supabase, cerrar el registro por correo si no se va a usar (B1) → `AccountPanel.tsx:154`. *Hecho (`a676c07`):* `googleActivo()` pregunta a Auth y el botón aparece solo cuando haya proveedor. **B1 sigue pendiente:** es configuración del panel, decisión del dueño.
3. ✅ **Distinguir carga, error y ausencia de resultados** — feedback y reintento; CTA coherente con estado de datos; `app/error.tsx` para las caídas de Supabase (P6) → `SearchPanel.tsx:40`, `CartContext.tsx:88`, `ProductoCTA.tsx:22`. *Hecho (`1919460`):* estado de carga en `CartContext`, que la búsqueda reutiliza; `error.tsx` y `global-error.tsx`.
4. ✅ **Mantener filtros visibles y removibles** — conservar selecciones y mostrar siempre limpieza cuando se aplican filtros; confirmado con datos reales → `app/catalogo/page.tsx:74`. *Hecho (`f425716`):* `desplegables()` en `lib/facetas.ts`, con tres pruebas.
5. ✅ **Alinear mensajes y contactos con la demo** — stock real (P2), fecha del cambio (P3), una sola moneda (P4), plazos, advertencia visible, sin correo/teléfono ficticios accionables → `app/page.tsx:143`, `lib/catalogo.ts` (`cambio()`), `Footer.tsx:26`, `ConsultaPanel.tsx:118`, `AccountPanel.tsx:75`. *Hecho (`1cd905b`; la consulta, en el paso 7).* El cambio sigue siendo del 24/08: actualizar `fx_rate` es tarea del dueño.
6. ✅ **Corregir semántica de filtros y tamaño de controles** → `Desplegable.tsx:37`, `app/catalogo/page.tsx:128`, `css/shop.css:115`. *Hecho (`6c17de0`).*
7. ✅ **Conservar borradores, reutilizar el perfil y ofrecer salidas** — consulta prellenada desde la cuenta (P7), 404 en español con camino de vuelta (P5), estados vacíos → `ConsultaPanel.tsx:89`, `app/not-found.tsx` (nuevo), `app/catalogo/page.tsx:222`, `SearchPanel.tsx:104`. *Hecho (`9356ca8`):* la consulta tampoco finge enviarse: prepara el texto y lo enseña.
8. ✅ **Revisar miniaturas y activación por hover** — inspección de imágenes y foco predecible → `app/producto/[slug]/page.tsx:93`, `NavMenu.tsx:110`. *Hecho (`727883e`):* miniaturas enlazadas (hoy ningún producto tiene más de una foto). El foco del menú al abrir con el ratón se revisó y se deja: se muda sin anillo y los campos de texto viven en diálogos modales, que vuelven inerte la cabecera.
9. ✅ **Pulido de texto, datos y cabeceras** — un solo tratamiento (P8), tildes, marca duplicada y foto (P9, en la base), cabeceras de seguridad (B3). *Hecho:* voseo en todos los paneles y en `/privacidad`; migración `0012_tildes` aplicada (Óptica, Munición, «Fundición de hierro»); `next.config.ts` con tres cabeceras. **Pendiente, decisión del dueño:** «Pelican» y «Peli» son el nombre estadounidense y el europeo del mismo fabricante, y unirlas cambia dos URL de ficha y sus fotos; la foto de Pelican Vault V730 sigue sin corresponder.

Plan aplicado el 2026-10-08. La nota de arriba (41/60) es la de antes de corregir: hace falta otra pasada de `laws-of-ux-review` sobre el código nuevo para puntuarlo.

Validación posterior a una implementación: navegador a 320/390 px y escritorio; Tab/Enter/Escape y lector de pantalla; carga lenta, fallo y reintento; filtros cruzados que dejan una sola opción; cierre y reapertura de borradores; estado final sin afirmación de reserva enviada. Build y pruebas existentes no cubren por sí solos estos escenarios UX.

## Verificación del cierre documental

- Primer intento (mañana): `npx next build` compiló y tipó, pero falló al prerenderizar `/catalogo` por un HTTP 521 de Supabase; las pruebas de slug fallaron por lo mismo. Commit aplazado por la regla del proyecto.
- Segundo intento, con Supabase en `ACTIVE_HEALTHY`: `npx next build` correcto (6 páginas, `/` prerenderizada con `revalidate` 10 min) y suite completa **31/31** en verde, incluidas las dos de slug contra la base real.
- La documentación no cambia código de la app; las correcciones siguen siendo propuestas.
