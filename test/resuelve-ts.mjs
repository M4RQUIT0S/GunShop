/* Hook de resolucion SOLO para correr los tests con `node --test`.
 *
 * `lib/*.ts` importa entre si sin extension (`./supabase`, `./catalogo`):
 * es lo que espera el resolver "bundler" de TypeScript/Next y asi lo exige
 * `moduleResolution: bundler` de tsconfig.json. El ESM nativo de Node, en
 * cambio, exige el especificador completo. Este hook prueba primero la
 * resolucion normal y, si falla por eso, reintenta con `.ts` puesto.
 *
 * `next build` nunca pasa por aqui -- usa su propio resolver -- asi que
 * nada de esto toca produccion.
 *
 * Uso:  node --experimental-loader ./test/resuelve-ts.mjs --test test/
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    throw err
  }
}
