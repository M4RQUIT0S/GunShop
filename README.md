# Armería Alcántara

Armería argentina para tiro deportivo y caza. Catálogo servido desde Supabase,
con el régimen ANMaC de cada producto y el precio en pesos al cambio del día.

En migración a e-commerce; el estado y lo que falta están en `PLAN.md`.

## Arrancar en local

```
npm install
cp .env.example .env.local     # y rellenar las dos NEXT_PUBLIC_
npm run dev
```

## Desplegar en Vercel

Las variables **no viajan en el repositorio**: `.env.local` está en
`.gitignore` a propósito. Hay que darlas de alta en el proyecto de Vercel,
en *Settings → Environment Variables*, para **Production, Preview y
Development**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<proyecto>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |

O por línea de órdenes, desde el directorio del proyecto:

```
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Dos cosas que no son evidentes:

- **Sin ellas el build falla, no el arranque.** Las `NEXT_PUBLIC_` se
  incrustan al compilar, así que si faltan no hay manera de arreglarlo
  después sin volver a construir. `lib/supabase.ts` corta ahí a propósito:
  vale más un despliegue en rojo que uno verde sirviendo una tienda vacía.
- **La clave publicable va al navegador y está bien que vaya.** Lo que
  protege los datos es la RLS de `0006_rls.sql`, que revoca todo y luego
  concede `select` sólo sobre el catálogo. La `service_role` es otra cosa:
  se salta la RLS entera y nunca lleva prefijo `NEXT_PUBLIC_`.

## Comprobaciones

```
npx next build                                                           # compila y comprueba tipos
node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts" # 13 pruebas
node db/supabase/revisa.js                                               # lee las migraciones sin necesitar base
```

`db/supabase/prueba.sql` prueba una venta entera contra una base ya aplicada
y sembrada, y hace `rollback`: no deja ni una fila.

## Dónde está cada cosa

- `app/` · páginas (App Router). `tokens.css` es la paleta y la escala.
- `lib/regimen.ts` · régimen ANMaC y modo de venta. Sin importaciones: es lo
  que decide si un arma puede pagarse sin que nadie mire una credencial.
- `lib/catalogo.ts` · consultas al catálogo.
- `db/supabase/` · las nueve migraciones y su comprobador.
- `public/img/product/` · una foto por producto. **Ninguna aclarada para
  redistribuir**; la procedencia está en su `CREDITS.md`.
- `css/` · el diseño "Alcántara" (lienzo negro, medido de rolls-roycemotorcars.com).
  Importado como CSS global clásico desde `app/layout.tsx`, no es resto del
  sitio estático — es la hoja de estilos en producción.
