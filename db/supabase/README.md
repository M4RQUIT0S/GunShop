# La tienda en Supabase

Postgres gestionado, sin Docker en ningún paso. Ocho migraciones y una
semilla. `db/schema.sql` sigue en el repositorio como está: es el modelo
pensado para un Postgres cualquiera, y esto es su mudanza a Supabase, donde
hay `auth.users`, RLS obligatoria y una API que publica el esquema `public`
tal cual esté.

La página estática **no depende de esto**. Se sigue abriendo con doble clic y
sigue leyendo `js/catalog.js`. Esto es a donde se mudan el catálogo y la cesta
el día que haya servidor.

## Qué hace cada fichero

| Fichero | Qué trae |
|---|---|
| `migrations/0001_extensiones.sql` | `pgcrypto`, y la lista de las que **no** se instalan y por qué |
| `migrations/0002_catalogo.sql` | régimen, calibre, marca, familia, producto, referencia, foto, cambio |
| `migrations/0003_existencias.sql` | ubicación, unidad con nº de serie, saldo y asientos |
| `migrations/0004_clientes.sql` | cliente atado a `auth.users`, personal, domicilios, credenciales, armas |
| `migrations/0005_pedidos.sql` | cesta, pedido, línea con copia congelada, eventos, pagos, trámites |
| `migrations/0006_rls.sql` | **el fichero al que hay que volver**: quién ve qué |
| `migrations/0007_indices.sql` | un índice por consulta que existe, cada uno con la suya escrita al lado |
| `migrations/0008_funciones.sql` | lo que el navegador no puede hacer con un `insert`: reservar, cupo, entrega |
| `seed.sql` | tres productos por familia. **No** es el catálogo entero |
| `revisa.js` | lee el SQL sin base delante: nombres, RLS, `search_path`, `$$` |
| `prueba.sql` | la venta entera contra una base ya aplicada, y `rollback` |

El catálogo completo —76 productos, 102 referencias— lo sigue generando
`node tools/seed.js` desde `js/catalog.js`. Un catálogo escrito dos veces son
dos catálogos.

## Desplegarlo

Hace falta un proyecto en <https://supabase.com>. El plan gratuito llega.

### Camino corto: el editor SQL del panel

Sin instalar nada. En el panel del proyecto, **SQL Editor**, y se pegan los
ficheros **en orden**, uno por uno, ejecutando cada uno antes del siguiente:

```
0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008 → seed.sql
```

El orden no es decorativo: 0003 referencia tablas de 0002, y 0006 no puede dar
permisos sobre lo que aún no existe.

### Camino largo: la CLI

Se instala sin Docker (`npm i -g supabase`, o `scoop install supabase` en
Windows). `supabase start` **sí** necesita Docker y aquí no se usa: se trabaja
contra el proyecto de la nube.

```bash
supabase login
supabase link --project-ref <la-ref-del-proyecto>
supabase db push
```

`db push` espera las migraciones en `supabase/migrations/` con nombre
`<marca>_<nombre>.sql`, donde la marca es `AAAAMMDDHHMMSS`. Aquí van numeradas
`0001…0008` porque así se leen, que es lo que importa mientras nadie las
aplique automáticamente. Para usar `db push` hay que renombrarlas con marca de
tiempo y moverlas a `supabase/migrations/`, respetando el mismo orden.

## Después de aplicarlas

**1. Comprobar que no queda nada abierto.** El linter del panel
(*Advisors → Security*) tiene que salir limpio de `rls_disabled_in_public` y de
`security_definer_view`. El final de `0006_rls.sql` trae las cuatro consultas
que lo comprueban a mano, por si se prefiere no fiarse del linter.

Lo que **sí** sale, y es correcto que salga, son siete avisos del tipo «esta
función `security definer` es llamable por RPC». Son exactamente las cinco de
`0004` y `0008` a las que se les concedió `execute` a propósito: `disponible()`
la llama la ficha sin sesión, y las otras cuatro dependen de `auth.uid()`. El
aviso dice que la puerta está abierta, no que esté mal cerrada. En *Performance*
sale `unindexed_foreign_keys` sobre una docena de claves ajenas: `0007` indexa
por consulta que existe, no por clave ajena que existe, y en tablas de catálogo
con dos dígitos de filas un índice de más cuesta escrituras y no ahorra nada.
Se revisa el día que una de esas tablas crezca, no antes.

**2. Programar el vencimiento de las reservas.** `public.vencer_reservas()`
suelta las armas de las reservas de 72 h que nadie vino a buscar. Sin eso el
inventario miente. Se activa `pg_cron` en *Database → Extensions* y se
programa desde el editor:

```sql
select cron.schedule('vencer-reservas', '*/15 * * * *',
                     $$ select public.vencer_reservas() $$);
```

No está en la migración a propósito: atarla a que `pg_cron` esté permitido en
el proyecto haría fallar la migración entera en un proyecto donde no lo esté.

**3. Las fotos.** Hoy son ficheros del repositorio (`img/product/`,
`img/model/`) y la página los lee por ruta relativa. `product_photo.path`
guarda esa misma ruta, así que el día que se muden a Storage basta con crear un
bucket **público** —son fotos de catálogo, no documentos— y cambiar el prefijo.
Lo que **no** puede ir a un bucket público es `credential.scan_path`: ahí va el
escaneo de una CLU, con nombre y domicilio. Ese bucket es privado y se sirve
con URL firmada.

## Cómo se comprueba

Dos niveles, y hacen falta los dos.

**Sin base delante**, antes de aplicar nada:

```
node db/supabase/revisa.js
```

Lee los nueve ficheros y hunde el despliegue si algo no cuadra: que nada se
nombre antes de existir —el fallo número uno al partir un esquema en ficheros
numerados—, que toda tabla de `public` tenga RLS, que toda función
`security definer` fije `search_path`, que toda vista lleve `security_invoker`,
que las columnas de cada `insert` existan y cuadren con sus valores, y que los
`$$` estén pareados. No ejecuta el SQL, así que no ve nada que dependa de los
datos.

**Con la base aplicada y sembrada**, que es donde aparece lo demás:

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/supabase/prueba.sql
```

También se pega entero en el editor SQL del panel. Abre transacción, inventa un
cliente, le vende un rifle y cartuchos, y hace `rollback`: no deja ni una fila.
Comprueba dieciséis cosas, y las que importan son éstas:

- sin CLU vigente el arma no sale, y el intento fallido **no deja medio pedido**;
- la línea guarda copia congelada del sku, del nombre, del régimen y de la
  credencial que se exhibió;
- **dos cajas del mismo calibre en la misma cesta se suman** contra el cupo de
  la TCCM: cada una por separado cabría, y el pedido tiene que fallar igual;
- el cliente ve sus pedidos y ninguno más, y las tablas internas no devuelven
  cero filas, devuelven `42501`;
- al entregar, el asiento sale **sólo** para lo que se cuenta por saldo: un arma
  no tiene `stock_level` y escribirle uno reventaría la entrega entera;
- un pedido entregado no se reescribe, y una reserva pasada de las 72 h devuelve
  el arma a la vitrina.

Los dos primeros fallos reales de estas migraciones —el asiento sobre un arma
serializada y el `join` al régimen sin `coalesce`, que dejaba un pedido sin sus
líneas y sin dar error— no los vio `revisa.js` y no los podía ver. Salieron al
ejecutar. Por eso están los dos niveles.

## Lo que hay que entender antes de tocar nada

**Toda tabla de `public` queda expuesta por la API salvo que la RLS lo impida.**
Crear una tabla y olvidar la RLS no la deja «medio protegida»: la deja legible
y escribible con la clave `anon`, que va escrita en el HTML. Por eso `0006`
empieza revocando todo y luego concede lo justo.

**Tres grupos de ocho tablas**, y cabe en la cabeza a propósito:

- **Catálogo público** — `select` para todo el mundo. Es lo que la página pinta.
- **Del cliente** — cada uno lo suyo, comparado con `auth.uid()`.
- **Internas** — `location`, `staff`, `firearm_unit`, `stock_level`,
  `stock_move`, `order_event`, `payment`, `anmac_filing`. **Nadie.** Ninguna
  política las nombra. Se escriben con `service_role` o desde las funciones
  `security definer` de `0008`.

**Una función `security definer` es segura cuando su resultado depende de
`auth.uid()` y de nada más que lo ensanche.** `crear_pedido()` trabaja sobre la
cesta de quien llama y no acepta un `customer_id`. En cuanto una acepte un
identificador ajeno, deja de ser una función y pasa a ser un agujero. Todas
llevan `set search_path = ''` y los nombres cualificados: sin eso, quien llama
puede anteponer un esquema suyo con una tabla llamada `credential`.

**La ley sale de una tabla, no de cadenas sueltas.** `family.licence_regime_id`
es `NOT NULL`, y esa es la línea más importante de `0002`. En `db/schema.sql`
era nullable y el régimen nulo se pintaba como «Venta libre»: una familia mal
dada de alta se entregaba sin pedir la credencial. Ahora eso no se puede
escribir.

**El cupo de munición se comprueba de verdad.** `crear_pedido()` bloquea la
ficha del cliente antes de mirar nada, así que dos pestañas del mismo cliente
no pueden pasar el mismo cupo a la vez, y va acumulando por calibre dentro de
la propia cesta: dos cajas del mismo calibre no se cuentan por separado.

## Lo que falta

- **Facturación AFIP.** `sales_order` guarda lo que el cliente debe, sin IVA y
  sin factura electrónica: falta tipo de comprobante, punto de venta, CAE y su
  vencimiento. Es una tabla nueva, no una columna.
- **Pagos de verdad.** `payment` tiene la forma pero ninguna pasarela detrás.
- **Agenda del taller.** `db/schema.sql` trae `appointment` y `work_order`; no
  se han mudado porque nada las usa todavía. Cuando se muden harán falta
  `btree_gist` y una restricción de exclusión para que dos citas no se solapen.
- **Búsqueda en el servidor.** Hoy vive en el navegador (`js/search.js`) sobre
  102 referencias y casa por subcadena: «ber» encuentra Bergara y Beretta. Si
  se muda, va con `pg_trgm` y `unaccent` —el catálogo tiene Anschütz, Beltrán y
  Óptica—, no con `to_tsvector`.
- **Un segundo par de ojos sobre `0006`.** Está aplicado y probado, pero la
  RLS es lo único de aquí que, si se equivoca, se equivoca en silencio y hacia
  fuera. Cada política nueva se comprueba con `prueba.sql`, no leyéndola.
