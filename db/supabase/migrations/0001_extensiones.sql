-- 0001_extensiones.sql - lo que hay que instalar antes que nada.
--
-- Se instala UNA. La lista de las que NO se instalan esta abajo y vale lo
-- mismo: cada extension es superficie que mantener, que el linter mira y que
-- puede fallar en un proyecto donde no este permitida. Ninguna de las otras
-- tiene hoy quien la use.
--
-- Nada de esto necesita superusuario ni toca el esquema `auth`.

create schema if not exists extensions;

-- gen_random_bytes, que es de donde sale el codigo del pedido. random() no
-- sirve para eso: el codigo es lo que el cliente ensena en el mostrador para
-- llevarse un arma reservada, y una cadena adivinable es una forma de que le
-- entreguen la reserva de otro. En un proyecto de Supabase recien creado
-- pgcrypto ya viene instalada en `extensions`, y el `if not exists` lo
-- respeta sin moverla de sitio.
create extension if not exists pgcrypto with schema extensions;


-- No instaladas, a proposito, y cuando tocaria:
--
--   unaccent, pg_trgm   La busqueda vive en el navegador (js/search.js) sobre
--                       102 referencias y casa por subcadena: «ber» encuentra
--                       Bergara y Beretta. Un tsvector no haria eso, asi que
--                       si algun dia se muda al servidor va con trigramas y
--                       con unaccent -- el catalogo tiene Anschutz, Beltran y
--                       Optica -- , no con to_tsvector.
--
--   pg_cron             Vence las reservas de 72 h. La funcion ya esta escrita
--                       (public.vencer_reservas, en 0008); lo que falta es
--                       programarla, y eso se hace desde el panel para no
--                       atar esta migracion a que la extension este permitida
--                       en el proyecto. Ver el README.
--
--   uuid-ossp           Obsoleta: gen_random_uuid() es del nucleo desde la 13
--                       y aqui, ademas, todas las claves son `identity`.
--
--   btree_gist          Haria falta el dia que haya agenda de taller, para que
--                       dos citas no se solapen de verdad. Hoy no hay agenda.
--
--   pgjwt, pgsodium     En retirada en Supabase; los secretos van a Vault.
