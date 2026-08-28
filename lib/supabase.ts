import { createClient } from '@supabase/supabase-js'

/* Cliente publico. La clave publicable viaja al navegador a proposito: lo que
   decide que se puede leer es la RLS de `0006_rls.sql`, que revoca todo y
   despues concede `select` solo sobre el catalogo. Ocho tablas -- existencias,
   unidades con numero de serie, asientos, pagos y tramites -- no las nombra
   ninguna politica, asi que con esta clave no existen.

   La `service_role` NO se toca aqui. Se salta la RLS entera y solo puede vivir
   en codigo de servidor. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !clave) {
  // Fallar aqui y no en la primera consulta: un cliente a medio configurar
  // devuelve un catalogo vacio, que parece una tienda sin stock.
  //
  // Esto revienta el BUILD, no el arranque, y es a proposito: las variables
  // NEXT_PUBLIC_ se incrustan al compilar, asi que si faltan no hay forma de
  // arreglarlo despues sin volver a construir. Mas vale un despliegue que
  // falla que uno que sale verde y sirve una tienda vacia.
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n' +
      '  · En local: copia .env.example a .env.local.\n' +
      '  · En Vercel: Project → Settings → Environment Variables, en los tres\n' +
      '    entornos, y vuelve a desplegar. No basta con tenerlas en .env.local:\n' +
      '    ese fichero esta en .gitignore y no viaja al repositorio.'
  )
}

/* La sesion se persiste (el defecto de supabase-js): es lo que hace falta para
   el acceso con Google de AccountContext -- guarda el verificador PKCE antes
   de saltar a Google y canjea el `?code=` al volver. En Node no hay
   localStorage y auth-js cae a memoria, asi que el render de servidor sigue
   sin sesion, que es lo que buscaba el `persistSession: false` de antes. */
export const supabase = createClient(url, clave)
