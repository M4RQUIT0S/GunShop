-- 0012_tildes.sql - las tildes que faltaban en lo que se lee en pantalla.
--
-- `family.name` es el rotulo de las baldosas, los chips y «14 referencias en
-- Optica»; la semilla (seed.sql) las metio sin tilde y asi salian en todo el
-- sitio (UX-AUDIT.md, P9). El slug no se toca: `optica` y `municion` son URL y
-- claves del codigo (`familia === 'optica'` en lib/facetas.ts).
--
-- La ficha de la prensa RCBS traia «Fundicion de hierro» desde 0011, que ya
-- esta aplicada: se corrige aqui en vez de reescribir aquella.
--
-- Idempotente: aplicada dos veces no cambia nada la segunda.

update public.family set name = 'Óptica'
 where slug = 'optica' and name = 'Optica';

update public.family set name = 'Munición'
 where slug = 'municion' and name = 'Municion';

update public.product
   set spec = array_replace(spec, 'Fundicion de hierro', 'Fundición de hierro'),
       updated_at = now()
 where 'Fundicion de hierro' = any(spec);
