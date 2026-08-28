---
description: Dónde está la tienda ahora mismo — git, despliegue, base y acceso con Google
---

Averigua el estado real de Armería Alcántara y resúmelo en una tabla corta.
Son cuatro comprobaciones independientes: **lánzalas en un solo mensaje**, no
una por turno.

1. **Repositorio.** `git status --short` y `git log --oneline origin/main..HEAD`.
   Interesa si hay algo sin commitear y si hay commits sin empujar.

2. **Despliegue.** El último de producción en Vercel: estado,
   `githubCommitSha` y si coincide con `HEAD`. Un deploy verde de un commit
   viejo es lo que más se confunde con «ya está desplegado». El `projectId` y
   el `orgId` salen de `.vercel/project.json`, que está en `.gitignore` — no
   los escribas aquí, que este fichero sí viaja al repositorio y es público.

3. **Base.** `mcp__supabase__list_migrations` contra
   `ls db/supabase/migrations/`. Lo que importa es lo que está **en disco y no
   aplicado**: la app se despliega en veinte segundos y la migración no va con
   ella.

4. **Acceso con Google.** Sigue sin habilitar mientras esto responda
   `400 provider is not enabled`:

   ```
   curl -s "$(grep -m1 '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '\r')/auth/v1/authorize?provider=google"
   ```

   Un 302 a `accounts.google.com` significa que ya está.

No arregles nada: esto sólo informa. Si algo está desalineado, dilo en una
línea y pregunta antes de tocar.
