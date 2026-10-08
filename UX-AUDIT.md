# UX Audit: GunShop — tercera pasada

**Score: 58/60** | **Grade: A** (segunda pasada: 53/60; seguimiento de Codex: 50/60, antes de cerrar C1/C2)

Fecha: 2026-10-08. Código auditado: `76ad356`, rama `main`; la implementación es `26731a9`, la misma que sirve `gun-shop-mu.vercel.app`. Alcance: portada, catálogo, ficha, paneles de cesta, cuenta, búsqueda y consulta, 404 y páginas de error.

Método: `laws-of-ux-review` sobre el código actual, releído entero en lugar de dar por buenos los arreglos, más recorridos cronometrados en producción. La nota es heurística: no sustituye una prueba con usuarios ni una auditoría con lector de pantalla.

| Grade | Range |
|-------|-------|
| A | 50–60 |
| B | 40–49 |
| C | 30–39 |
| D | 20–29 |
| F | 0–19 |

Puntuación bruta: **54/56** en 28 leyes aplicables (las mismas dos N/A). 26 leyes con 2, dos con 1, ninguna con 0. Normalizada: `54 / 56 × 60 = 57,86`, redondeada a **58**. Lo que queda son tres hallazgos nuevos, que las pasadas anteriores no vieron, en dos leyes.

### Qué cambió respecto a la segunda pasada y al seguimiento de Codex

| Ley | 2.ª | Codex | 3.ª | Por qué |
|-----|:---:|:---:|:---:|---------|
| Fitts's Law | 1 | 1 | 2 | Zona de toque de 45 px en filtros, «volver» y pausa (`80631b4`). |
| Jakob's Law | 1 | 1 | 2 | Sugerencia que abre la ficha, contador anunciado, grupos con nombre, pausa con un solo estado (`89f5767`). |
| Cognitive Bias | 1 | 1 | 2 | Fuera las promesas de encargo y de representación (`658450f`). |
| Peak-End Rule | 1 | 1 | 2 | Cesta vacía con salida y resúmenes que se abren (`efb0998`). |
| Flow | 1 | 1 | 2 | El menú espera 300 ms (`8339679`). No probado con usuarios. |
| Working Memory | 2 | 1 | 2 | C1 cerrado: el resumen muestra las unidades (`26731a9`). |
| Zeigarnik Effect | 2 | 1 | 2 | C2 cerrado: un borrador por consulta (`26731a9`). |
| Doherty Threshold | 1 | 1 | 1 | Los filtros ya avisan (`3a94bd1`), pero el resto de las navegaciones no (W1). |
| Mental Model | 1 | 1 | 1 | Las tarjetas ya dicen adónde llevan (`e7d2171`), pero hay dos acciones que no hacen lo que dicen (W2). |

## Critical Issues (0)

Ninguna ley en 0.

## Warnings (2)

### W1 · Doherty Threshold — Score: 1/2

**Problem:** El paso 1 de la segunda pasada puso el indicio solo en los filtros. Las demás navegaciones al servidor siguen sin señal, y son las que más se usan. Cronometrado en producción:

- **Tarjeta → ficha:** ~650 ms (620 ms aún en el catálogo, ficha a los 678) sin nada que cambie. Es la navegación más frecuente de la tienda. `app/catalogo/page.tsx:184` (el `<Link>` de la tarjeta).
- **«← Catálogo» de la ficha → catálogo:** **952 ms** sin señal. `app/producto/[slug]/page.tsx:111`.
- **Sugerencia de búsqueda → ficha:** el diálogo se cierra en el acto (`SearchPanel.tsx:128`, `onClick={cerrar}`) y queda a la vista la página de antes mientras llega la nueva. Lo mismo con «Ver las N referencias» (`:57–59`, `cerrar()` y luego `router.push`).

**Fix:** El mismo `Pendiente.tsx`, dentro de esos enlaces. En la búsqueda, el diálogo se cierra al llegar y no al pulsar:

```tsx
// app/catalogo/page.tsx:225 — el punto junto al rótulo de la tarjeta
<span className="card__add">{exige ? 'Ver y consultar' : 'Ver y añadir'}<Pendiente /></span>

// app/producto/[slug]/page.tsx:111
<Link href={volver} className="chip">← {rotulo}<Pendiente /></Link>
```

```tsx
// SearchPanel.tsx — cerrar cuando cambia la ruta, no al pulsar; la sugerencia lleva su punto
const ruta = usePathname()
useEffect(() => { ref.current?.close() }, [ruta])
<Link className="sug" href={…}>{/* nombre, ficha */}<Pendiente /></Link>   // sin onClick={cerrar}
```

```css
/* css/catalog.css — dentro de la píldora, no fuera de la tarjeta */
.card__add { position: relative; }
.card__add .pendiente { right: 0.5rem; }
```

### W2 · Mental Model — Score: 1/2

**Problem:** Dos acciones no hacen lo que su nombre da a entender.

1. **«En la cesta (1)» añade otra unidad.** `ProductoCTA.tsx:42–44`: tras el primer clic, el botón cambia su texto a un estado («En la cesta (1)») pero sigue llamando a `add()`. En producción: «Añadir a la cesta» → «En la cesta (1)» → «En la cesta (2)». Quien vuelve a pulsar para confirmar, o con lector de pantalla (el botón no tiene otro nombre), suma unidades sin saberlo.
2. **«Borrar mis datos» no borra todos los datos.** `AccountContext.tsx:74–81` solo quita `gunshop:cuenta`. Los resúmenes (`gunshop:pedidos`) se quedan, y guardan el nombre del cliente (`lib/cesta.ts:68`) y ahora también qué compró. Además, el botón está oculto si no hay perfil (`AccountPanel.tsx:190`, `hidden={!perfil}`): con resúmenes y sin perfil no hay forma de borrarlos desde la tienda. Y `/privacidad` (`app/privacidad/page.tsx:162`) promete lo contrario: que lo guardado en el navegador dura «hasta que pulses Borrar mis datos».

**Fix:**

```tsx
// ProductoCTA.tsx:38–45 — el botón dice la acción; el estado va aparte, anunciado
<>
  {cant > 0 && <p className="ficha__en-cesta" role="status">En la cesta: {cant}</p>}
  <button type="button" className={`card__add ficha__cta${cant ? ' is-added' : ''}`} … onClick={() => add(producto.id)}>
    {cant ? 'Añadir otra unidad' : 'Añadir a la cesta'}
  </button>
</>
```

```tsx
// AccountContext.tsx:74 — «mis datos» son también los resúmenes
const borrar = useCallback(() => {
  setPerfil(null)
  try {
    window.localStorage.removeItem(LLAVE)
    window.localStorage.removeItem('gunshop:pedidos')
  } catch { /* nada que borrar */ }
}, [])
```

```tsx
// AccountPanel.tsx:190 — visible también si solo hay resúmenes; la lista se vuelve a leer al borrar
hidden={!perfil && !hayResumenes}
```

`/privacidad:162` tiene que decir exactamente qué borra el botón (nombre, correo y resúmenes) y que la cesta se vacía desde la cesta.

## Suggestions (0)

Ninguna: S1 y S2 de la segunda pasada están cerrados.

## Compliant (26)

| Ley | Score | Evidencia |
|-----|-------|-----------|
| Aesthetic-Usability Effect | 2/2 | Los arreglos reutilizan el sistema: el indicio es un punto de `--tinta`, la zona de toque es invisible y no mueve el subrayado. |
| Law of Prägnanz | 2/2 | Iconos de trazo simple, `HeaderActions.tsx`. |
| Von Restorff Effect | 2/2 | Aviso de demostración junto a cada acción: ficha, cesta, consulta, cabecera del catálogo. |
| Law of Similarity | 2/2 | Moneda única; tarjetas con rótulo de enlace («Ver y…») distinto del botón de la ficha. |
| Law of Proximity | 2/2 | Campos con su etiqueta; la cantidad junto a su línea en el resumen. |
| Law of Common Region | 2/2 | Diálogos con cabecera, cuerpo y pie; cada resumen de la cuenta en su `<details>`. |
| Cognitive Load | 2/2 | Notas cortas, sin explicar la arquitectura. |
| Hick's Law | 2/2 | Siete entradas de menú; facetas solo con catálogo acotado. |
| Miller's Law | 2/2 | Ocho sugerencias de búsqueda como máximo, `SearchPanel.tsx:20`. |
| Chunking | 2/2 | Ficha en precio, calibre, especificaciones y acción. |
| Choice Overload | 2/2 | Opciones dentro de desplegables. |
| Cognitive Bias | 2/2 | Cifras que salen de la base; sin promesas de servicio; el cambio dice su fecha. |
| Fitts's Law | 2/2 | 44–45 px en cabecera, paneles, filtros, «volver», opciones y pausa (medido con `elementFromPoint`). |
| Flow | 2/2 | Menú a 300 ms (cerrado a los 257 ms, abierto a los 359 con el puntero real); borradores que no se pierden. |
| Serial Position Effect | 2/2 | «Catálogo» primero; la acción al final de cada formulario. |
| Peak-End Rule | 2/2 | Todos los estados vacíos y de error tienen salida; el resumen se puede repasar. |
| Zeigarnik Effect | 2/2 | Un borrador por consulta, `ConsultaPanel.tsx` (A → B → A verificado por Claude y por Codex). |
| Working Memory | 2/2 | Filtros siempre visibles; unidades a la vista en el resumen. |
| Jakob's Law | 2/2 | Sugerencias a la ficha, `aria-current` en chips, grupos con nombre, contador de la cesta anunciado. |
| Postel's Law | 2/2 | Búsqueda sin acentos; filtro huérfano quitable. |
| Tesler's Law | 2/2 | La consulta toma nombre y correo de la cuenta. |
| Occam's Razor | 2/2 | Una acción principal por vista. |
| Pareto Principle | 2/2 | Catálogo y búsqueda desde la primera pantalla. |
| Selective Attention | 2/2 | Jerarquía título → precio → acción; diálogos que aíslan la tarea. |
| Paradox of the Active User | 2/2 | Salidas en catálogo vacío, búsqueda sin resultados, cesta vacía, 404 y error. |
| Parkinson's Law | 2/2 | Campos acotados (`maxLength`). |

## N/A (2)

- **Law of Uniform Connectedness:** sin recorridos secuenciales que pidan conectores.
- **Goal-Gradient Effect:** sin procesos de varios pasos con progreso medible.

## Action Plan (do in this order)

1. ✅ **«Borrar mis datos» que borre los resúmenes, y la política que lo diga** — es el único hallazgo que toca datos personales → `AccountContext.tsx:74`, `AccountPanel.tsx:190`, `app/privacidad/page.tsx:162`. *Hecho (`5ffc549`):* `borrarDatos()` en `lib/cuenta.ts` quita perfil y resúmenes y deja la cesta (`test/cuenta.test.ts`, 2 pruebas); el botón sale también si solo hay resúmenes; `/privacidad` dice exactamente qué borra. Verificado en `next dev`.
2. ✅ **El botón de la ficha dice la acción** — «Añadir otra unidad», con «En la cesta: N» aparte → `ProductoCTA.tsx:38`. *Hecho (`7ddcb6e`):* el estado va en un `role="status"` siempre montado, para que el cambio se anuncie. Verificado 0 → 1 → 2 y a 390 px.
3. ✅ **Indicio en tarjetas, «volver» y búsqueda** — `Pendiente` en esos enlaces; el diálogo se cierra al llegar → `app/catalogo/page.tsx:225`, `app/producto/[slug]/page.tsx:111`, `SearchPanel.tsx:128`. *Hecho (`72aef8a`):* en la búsqueda, `useTransition` + `router.push` (el patrón de la guía de Next 16) en vez de `usePathname`, porque «Ver las N» puede navegar dentro de `/catalogo` sin cambiar de ruta. Verificado: indicio en tarjeta y «volver»; el panel sigue abierto con el indicio y se cierra al llegar.

Plan aplicado el 2026-10-08. Sin nota nueva: los tres cierres son los de W1 y W2, y la siguiente pasada tendría que confirmarlos.

Con los tres, la nota llegaría a 56/56 en bruto (60/60). Fuera de las 30 leyes siguen abiertos B1 (registro por correo en Auth), el alta de Google, `fx_rate` del 24/08, Pelican/Peli y la foto de la V730: configuración o datos que decide el dueño.

## Verificación de esta pasada

- Código releído en `76ad356` (implementación `26731a9`): los componentes de interfaz, las tres páginas, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `AccountContext.tsx` y las reglas de CSS tocadas desde la segunda pasada.
- Producción, cronometrado desde el clic: tarjeta de Accesorios → ficha de Pelican Vault V730, ~650 ms sin indicio; «← volver» de la ficha → catálogo, 952 ms sin indicio.
- Producción: el botón de la ficha pasa de «Añadir a la cesta» a «En la cesta (1)» y a «En la cesta (2)», y la cesta guarda `{16: 2}`. Se dejó vacía al terminar.
- «Borrar mis datos»: verificado en el código (`AccountContext.tsx:77` solo quita `gunshop:cuenta`) frente a la promesa de `/privacidad:162`.
- Los cierres de la segunda pasada y de C1/C2 los verificó Codex por su cuenta en producción (sección siguiente). Esta pasada no los repitió, salvo releer el código.
- No verificado: lector de pantalla y recorrido completo con teclado; contraste (los tokens no cambiaron).

---

# UX Audit: GunShop — Seguimiento Codex

**Score: 50/60** | **Grade: A** — puntuación histórica de la detección de C1/C2, anterior a sus arreglos. La verificación posterior de cierres se registra debajo; no equivale a una tercera auditoría de las 30 leyes.

**Último commit revisado:** `1f557db4d2e0b8600881a59e074387e88055b633` (implementación `26731a9`). Producción verificada con Vercel: `dpl_3yRYSZ1Kt1sQQ2sdVS9AuNh3eN9E`, READY, SHA `1f557db`, alias `https://gun-shop-mu.vercel.app`. Checkpoint anterior: `dfdc0ce` / implementación `747f24d`, despliegue `dpl_8kSD2xrVt4Jw1MzJDmo77o96MGmY`.

## Verificación posterior — cierres confirmados por Codex (2026-10-08)

**C1 y C2 resueltos**, comprobados en producción tras `26731a9`. **Sin fallos nuevos confirmados** en los ocho commits de implementación desde `344b8a2`; el historial y las propuestas originales se conservan abajo.

| ID | Estado comprobado | Evidencia y commit |
|----|-------------------|-------------------|
| C1 | Resuelto | Cesta con Swarovski ×2 y Pelican ×1: el resumen muestra «2 unidades» y «1 unidad», no hay mandos de edición y el foco llega a «Volver a editar». `26731a9`, `CartPanel.tsx:142`. [Captura](docs/ux-evidence/2026-10-08-c1-unidades-corregidas.png). |
| C2 | Resuelto | Ridge A → HMR B → atrás a A → adelante a B conserva `BORRADOR A: medidas del Ridge.` y `BORRADOR B: medidas del HMR.`. Preparar la consulta de demostración y volver a editar conserva B; nombre/correo sintéticos, sin envío. `26731a9`, `ConsultaPanel.tsx:52` y `:134`. [Captura de A recuperado](docs/ux-evidence/2026-10-08-c2-borrador-conservado.png). |
| W1 | Resuelto en el recorrido probado | Óptica → Rifles: `.pendiente.is-on` aparece en Rifles antes de cambiar la URL y desaparece al llegar; CSS con demora de 100 ms y alternativa sin animación para movimiento reducido. `3a94bd1`, `Pendiente.tsx:13`, `css/catalog.css:288`. Se comprobó el estado y la configuración de animación, no se cronometraron fotogramas. |
| W2 | Resuelto en los controles probados | A 390 px, chips y «Limpiar» conservan caja de 30,65 px pero `::before` amplía 7 px arriba/abajo: `elementFromPoint` a ±5 px fuera de la caja sigue alcanzando el mismo enlace. Opción de Marca: 43,99 px. Sin desbordamiento horizontal (`scrollWidth` 375, viewport 390). `80631b4`, `css/catalog.css:261`. |
| W3 | Resuelto | Buscar Pelican → sugerencia abre `/producto/pelican-vault-v730?q=Pelican`, cierra el diálogo y vuelve a `/catalogo?q=Pelican`; cabecera «Cesta, 2 artículos»; dos grupos de filtros con nombre en el DOM accesible; pausa cambia a «Reanudar el desfile» sin `aria-pressed` y activa `.is-quieta`. `89f5767`. No sustituye la prueba con lector de pantalla. |
| W4 | Resuelto | Tarjeta libre «Ver y añadir» y controlada «Ver y consultar», ambas enlaces a la ficha. `e7d2171`, `app/catalogo/page.tsx:225`. |
| W5 | Resuelto | Los dos textos de encargos ahora dicen «se puede consultar desde su ficha»; título de marcas «Las casas del catálogo». `658450f`, `app/page.tsx:131`, `:163`, `:193`. |
| S1 | Resuelto | Resumen nuevo abierto con Enter en Mi cuenta: «2 × Swarovski Z8i 2-16x50 P» y total histórico en pesos. Tras quitar la referencia de prueba, cesta vacía → «Ver el catálogo» → `/catalogo`. `efb0998`, `AccountPanel.tsx:81`, `CartPanel.tsx:116`. [Captura](docs/ux-evidence/2026-10-08-resumen-detalle-verificado.png). |
| S2 | Implementado; revisión independiente parcial | `8339679` cambia 150 → 300 ms en `NavMenu.tsx:228`, y el PLAN lo registra como decisión del dueño. Se revisó el diff; Codex no volvió a cronometrar la entrada del puntero. No se inventa una regresión ni se certifica ese tiempo con la prueba de otro recorrido. |

- Los recorridos W1–W5 se probaron sobre el despliegue `658450f` (`dpl_7MGLZqjSj7SYK2bPcHLGVjBa1Tm3`), S1 sobre `8339679` (`dpl_4ffW19NsW36b4ubQCjVHBtBF8TKz`) y C1/C2 sobre `1f557db`, todos READY. Los archivos de cada arreglo no cambiaron entre las revisiones de sus diffs y las pruebas; las ediciones concurrentes de Claude en otros archivos se dejaron fuera de los cierres hasta desplegarse.
- El posible bloqueo de scroll anotado por Claude no se reprodujo con la pestaña visible: cerrar Consulta y Cesta dejó `open: false` y `document.body.style.overflow === ''`; después de cerrar Cesta, el desplazamiento cambió `scrollY` de 254,84 a 678,11. No se registra como fallo confirmado. No se indujeron errores de producción ni se cambiaron Vercel/Supabase.
- Build y suite completos repetidos una vez tras estabilizarse `1f557db`, porque el intento anterior coincidió con ediciones concurrentes de C1/C2. **36/36** pruebas correctas; sin modificaciones de implementación de Codex.
- Permanecen fuera de estos cierres las decisiones de Google, registro por correo, cambio, marcas/foto y la prueba con lector de pantalla. Los resúmenes locales de esta tanda son simulaciones (`AZIYNL4` y el de la prueba de dos líneas); no son pedidos en Supabase.

## Detección inicial de C1/C2 — historial

Se revisaron los diffs de los arreglos y sus pruebas, y se contrastaron los estados de cesta y consulta en el navegador real. **Dos hallazgos adicionales confirmados**, sin duplicar W1–W5, S1–S2 ni las decisiones pendientes de Supabase. La nota actualiza solamente Working Memory y Zeigarnik (2 → 1 cada una); mantiene las otras valoraciones de la segunda pasada. Bruta: **47/56**; normalizada: `47 / 56 × 60 = 50,36` → **50/60**. Esta ampliación no convierte la nota en una certificación de accesibilidad.

| Grade | Range |
|-------|-------|
| A | 50–60 |
| B | 40–49 |
| C | 30–39 |
| D | 20–29 |
| F | 0–19 |

## Critical Issues (0)

No se confirmó un problema crítico nuevo en esta tanda.

## Warnings (7)

En la detección inicial se mantenían W1–W5 y se añadían C1/C2 con prioridad P2. **Los siete están cerrados en los recorridos comprobados arriba**; esta sección conserva el problema y el arreglo propuesto cuando estaban abiertos.

### C1 · Working Memory — Score: 1/2 — el resumen oculta las unidades por línea

**Problem:** `app/components/CartPanel.tsx:136–159` oculta todo `.linea__mandos` cuando existe `hecho`. Ahí también está el único texto de cantidad por producto (`:145`). El resumen conserva nombre, precio unitario y subtotal, pero obliga a recordar o calcular cuántas unidades contiene cada referencia. La cabecera muestra el total de artículos, que no explica su reparto cuando hay varias líneas. Es una regresión introducida en `babe3dc`: los controles deben desaparecer, la cantidad debe seguir visible.

**Reproducción en producción:** abrir Swarovski Z8i 2-16x50 P → añadir dos veces → abrir Cesta → observar el «2» entre los controles → «Preparar el resumen». El «2» por línea desaparece; quedan $12.008.000 c/u y $24.016.000 de subtotal. El foco sí pasa correctamente a «Volver a editar». Captura: [resumen sin cantidad](docs/ux-evidence/2026-10-08-resumen-sin-cantidad.png).

**Fix:** conservar una cantidad estática en la vista de resumen, fuera de la condición que oculta los mandos.

```tsx
// CartPanel.tsx:135 — añadir antes de los controles existentes
{hecho && (
  <p className="linea__spec">
    {l.n} {l.n === 1 ? 'unidad' : 'unidades'}
  </p>
)}
{!hecho && <div className="linea__mandos">{/* controles existentes */}</div>}
```

**Cierre esperado:** preparar una cesta de dos referencias con cantidades distintas y comprobar que cada cantidad sigue visible y accesible, sin botones de edición en el resumen.

### C2 · Zeigarnik Effect — Score: 1/2 — otra consulta destruye el borrador anterior

**Problem:** `app/components/ConsultaPanel.tsx:125` usa `key={datos?.mensaje ?? ''}` para remontar el textarea y `:129` lo rellena con el mensaje inicial. `ConsultaContext.tsx:33` conserva solamente la última consulta. Cerrar/reabrir inmediatamente la misma referencia funciona, pero abrir otra sustituye el mensaje editado y volver a la anterior ya no recupera nada. Es una corrección incompleta de `9356ca8`, no una regresión respecto del formulario anterior: la segunda pasada atribuye cumplimiento completo a una conservación que solo cubre la última referencia.

**Reproducción en producción, sin recargar:** Bergara B-14 Ridge → «Consultar» → escribir `BORRADOR DE PRUEBA: consultar medidas del producto A.` → cerrar/reabrir (se conserva) → cerrar → volver al catálogo → Bergara B-14 HMR → «Consultar» → cerrar → volver atrás hasta Ridge → «Consultar». El texto vuelve a `Quisiera más información sobre Bergara B-14 Ridge.` y el borrador se pierde sin aviso. No se pulsó «Preparar la consulta» ni se envió nada. Captura final: [borrador reemplazado](docs/ux-evidence/2026-10-08-consulta-borrador-reemplazado.png).

**Fix:** identificar la consulta por producto y conservar un borrador controlado por esa clave en el Provider, que sobrevive a la navegación de cliente. Actualizarlo al escribir; usar el mensaje inicial solo cuando aún no hay borrador. No hace falta guardar datos personales en almacenamiento persistente para corregir este caso.

```tsx
// ConsultaDatos, en ConsultaContext.tsx:15
type ConsultaDatos = {
  clave: string; titulo: string; rotulo: string; mensaje: string
}
// ProductoCTA.tsx:53 — dentro del objeto pasado a abrir()
clave: `producto:${producto.id}`,
// Provider: guardar el mensaje por clave; setter inmutable
setBorradores(prev => ({ ...prev, [clave]: nuevoTexto }))
// ConsultaPanel.tsx:123 — reemplazar key/defaultValue por estado controlado
<textarea
  ref={mensaje}
  name="mensaje"
  rows={4}
  maxLength={600}
  value={borradores[datos.clave] ?? datos.mensaje}
  onChange={e => guardarBorrador(datos.clave, e.currentTarget.value)}
/>
```

El fragmento muestra las piezas del arreglo; requiere exponer `borradores`/`guardarBorrador` desde el contexto y resolver `datos === null` antes de leer su clave. No es un parche aplicado.

**Cierre esperado:** A → B → A conserva el texto editado de A; B conserva su propio mensaje; preparar/volver a editar no destruye ninguno. Nombre y correo siguen tomando los valores de la cuenta al iniciar una consulta.

## Suggestions (2)

Se conservan S1 (salida de cesta vacía y detalle de resúmenes) y S2 (apertura accidental del menú). S2 sigue siendo una decisión de producto, no un error confirmado de Claude.

## Compliant (19)

Se mantienen las 19 leyes con 2/2 de la matriz siguiente. Working Memory y Zeigarnik pasan al grupo de advertencias; el arreglo de filtros ocultos sigue funcionando.

| Ley | Score | Evidencia / hallazgo |
|-----|:-----:|---------------------|
| Aesthetic-Usability Effect | 2 | Sin cambios respecto de la segunda pasada |
| Law of Prägnanz | 2 | Sin cambios respecto de la segunda pasada |
| Von Restorff Effect | 2 | Aviso de simulación visible en ambos paneles probados |
| Law of Similarity | 2 | Moneda en pesos consistente en el resumen nuevo |
| Law of Proximity | 2 | Campos y controles agrupados |
| Law of Common Region | 2 | Diálogos delimitan la tarea |
| Law of Uniform Connectedness | — | Sin recorrido que necesite conectores |
| Cognitive Load | 2 | Explicación breve de la simulación |
| Hick's Law | 2 | Sin cambios respecto de la segunda pasada |
| Miller's Law | 2 | Sin cambios respecto de la segunda pasada |
| Chunking | 2 | Sin cambios respecto de la segunda pasada |
| Choice Overload | 2 | Facetas agrupadas en desplegables |
| Cognitive Bias | 1 | W5, promesas de la portada |
| Fitts's Law | 1 | W2, objetivos de filtros |
| Doherty Threshold | 1 | W1, navegación de filtros sin señal |
| Flow | 1 | S2, apertura del menú por hover |
| Goal-Gradient Effect | — | Sin progreso real de varios pasos |
| Serial Position Effect | 2 | Sin cambios respecto de la segunda pasada |
| Peak-End Rule | 1 | S1, finales sin siguiente acción/detalle |
| Zeigarnik Effect | 1 | C2, borrador perdido en A → B → A |
| Working Memory | 1 | C1, cantidad omitida en el resumen |
| Jakob's Law | 1 | W3, convenciones de búsqueda/accesibilidad |
| Postel's Law | 2 | Filtro huérfano conservado por `desplegables()` |
| Tesler's Law | 2 | Consulta reutiliza el perfil |
| Occam's Razor | 2 | Acción principal por vista |
| Pareto Principle | 2 | Sin cambios respecto de la segunda pasada |
| Selective Attention | 2 | Diálogo modal aísla la tarea |
| Mental Model | 1 | W4, etiqueta de tarjeta que no añade |
| Paradox of the Active User | 2 | Sin cambios respecto de la segunda pasada |
| Parkinson's Law | 2 | Campos acotados |

## N/A (2)

Law of Uniform Connectedness y Goal-Gradient Effect: mismas razones de la segunda pasada, sin forzar su aplicación.

## Action Plan (do in this order)

1. ✅ **Conservar borradores por referencia (C2)** → `ConsultaContext.tsx:15`, `ConsultaPanel.tsx:125`, `ProductoCTA.tsx:53`; verificar A → B → A. *Hecho por Claude (`26731a9`):* un borrador por consulta en el estado de `ConsultaPanel` (vive en el layout y sobrevive a la navegación), con el título como clave; no hizo falta tocar el contexto ni la ficha. Verificado en `next dev`: A → B → A → B con enlaces y atrás/adelante, los dos borradores intactos.
2. ✅ **Mantener unidades visibles en el resumen (C1)** → `CartPanel.tsx:136`; verificar varias líneas con cantidades diferentes. *Hecho por Claude (`26731a9`):* «N unidades» fuera de los mandos. Verificado con dos líneas, 2 y 1 unidades.
3. ✅ **Continuar W1–W5 y S1** con el plan de la segunda pasada; no marcar ningún pendiente resuelto sin probarlo. S2 requiere una decisión de producto. *Hecho:* los 7 pasos de ese plan, uno por commit, cada uno probado (ver allí). S2 lo decidió el dueño: aplicar el paso 7.

### Validación y seguimiento

- `npx next build`: correcto. Suite completa: **34/34**, incluidas las lecturas de slug contra Supabase. `node db/supabase/revisa.js`: correcto (13 ficheros, 24 tablas, 28 políticas); es revisión estática del SQL, no ejecución de una venta.
- Auth de Supabase responde 200, Google sigue desactivado y `disable_signup` sigue en `false`: B1 continúa abierto. No se creó ninguna cuenta ni pedido real ni se modificó configuración.
- `/catalogo` responde 200 con las tres cabeceras del arreglo B3: `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`.
- La combinación Óptica + Swarovski + 2-16x mantiene visibles Marca y Aumentos, con «Limpiar». Cesta simulada: no se vacía al preparar, no finge una reserva y el foco pasa a «Volver a editar».
- Evidencia de UI en una pestaña de pruebas: un resumen local `AZHX11M` y texto sintético. No se realizó una transacción de productos regulados.
- No probado en esta tanda: OAuth completo, lector de pantalla, caída inducida del backend y detalle de logs de Vercel. No se atribuyen nuevos fallos a esos escenarios.
- Revisión periódica activa en este chat cada **10 minutos**, automatización `revisar-cambios-de-claude-en-gunshop`. Revisar nuevos commits y cambios locales, mantener identificadores C1/C2 y futuros C3…, y actualizar el estado solo con evidencia. El checkpoint no incluye los commits de documentación de este seguimiento; si solo cambian informe/PLAN/capturas, no repetir la auditoría de la implementación.

---

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

1. ✅ **Señal mientras navega un filtro** — `useLinkStatus` en chips, opciones y «Limpiar» → `app/catalogo/page.tsx:127`, `Desplegable.tsx:37`, `app/components/Pendiente.tsx` (nuevo). *Hecho (`3a94bd1`):* `pending` dura toda la navegación; el punto aparece a los 100 ms (comprobado moviendo el reloj de la animación).
2. ✅ **Rótulo de la tarjeta que dice lo que hace** — «Ver y añadir» / «Ver y consultar» → `app/catalogo/page.tsx:215`. *Hecho (`e7d2171`).*
3. ✅ **Convenciones** — sugerencia que abre la ficha, contador de la cesta anunciado, `role="group"` en los filtros, pausa con un solo estado → `SearchPanel.tsx:116`, `HeaderActions.tsx:55`, `app/catalogo/page.tsx:99`, `Marquee.tsx:31`. *Hecho (`89f5767`).* La pausa conserva el rótulo cambiante y suelta `aria-pressed` (al revés que el fragmento de W3): el rótulo es lo que ve quien no usa lector de pantalla.
4. ✅ **Filtros a 44 px** → `css/catalog.css:120`, `:152`, `:241`; `css/base.css:911`. *Hecho (`80631b4`):* zona de toque de 45 px con un `::before`, sin mover el subrayado (medido con `elementFromPoint`); las opciones crecen a 44.
5. ✅ **Promesas de la portada** → `app/page.tsx:129`, `:160`, `:187`. *Hecho (`658450f`).*
6. ✅ **Cesta vacía con salida y resúmenes que se abren** → `CartPanel.tsx:111`, `AccountPanel.tsx:76`. *Hecho (`efb0998`):* el resumen guarda el nombre de cada línea al armarse (`test/cesta.test.ts`, 2 pruebas nuevas).
7. ✅ **Retraso del menú al pasar el ratón** — solo si el dueño lo decide → `NavMenu.tsx:222`. *Hecho (`8339679`), por decisión del dueño:* 300 ms; con el puntero del navegador, cerrado a los 257 ms y abierto a los 359.

Plan aplicado el 2026-10-08, junto con C1 y C2 del seguimiento de Codex (arriba). Sin nueva puntuación: falta una tercera pasada para medirlo.

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
