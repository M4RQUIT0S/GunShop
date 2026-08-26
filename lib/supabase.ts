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
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copia .env.example a .env.local.'
  )
}

export const supabase = createClient(url, clave, {
  auth: { persistSession: false },
})
