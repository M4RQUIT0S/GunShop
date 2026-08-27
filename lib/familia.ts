/* El arbol de familias, sin tocar la base. Vive aparte de `lib/catalogo.ts`
 * por el mismo motivo que `lib/regimen.ts`: aquel importa el cliente de
 * Supabase en cuanto se carga, asi que nada de lo que hay dentro se puede
 * probar sin `.env.local`. Esto son funciones puras sobre lo que ya vino de
 * la base, y se prueban solas (`test/arbol.test.ts`).
 *
 * `lib/catalogo.ts` lo reexporta entero: nadie tiene que saber que existe
 * este fichero para usarlo. */

export type Familia = {
  id: number
  slug: string
  name: string
  model_key: string | null
  // Etiqueta por defecto de la familia (art. 5 decreto 395/75 o "Venta
  // libre"), para la baldosa de #tiles. La ficha puede pisarla con
  // `licence:`, pero la familia siempre tiene una -- NOT NULL en el esquema.
  licencia: string
  // 0010: la familia es un arbol. `null` = raiz, que es lo que sale en las
  // baldosas de la portada y en los chips del catalogo -- las hijas solo
  // aparecen dentro del menu.
  parentId: number | null
}

export function raices(fams: Familia[]): Familia[] {
  return fams.filter((f) => f.parentId === null)
}

export function hijas(fams: Familia[], padre: Familia): Familia[] {
  return fams.filter((f) => f.parentId === padre.id)
}

/* La rama que cuelga de `slug`, el propio incluido. Es lo que convierte
 * `?familia=municion` en «Municion y todo lo que hay debajo»: desde 0010 los
 * cartuchos cuelgan de `cartuchos`, no de `municion`, y sin esto la baldosa
 * de la portada contaria cero.
 *
 * El `vistos` no es defensivo por gusto: `parent_id` apunta a la propia
 * tabla y nada en la base impide escribir un ciclo (a madre de b, b madre de
 * a). Sin el, un ciclo cuelga el render del servidor entero. */
export function rama(fams: Familia[], slug: string): string[] {
  const raiz = fams.find((f) => f.slug === slug)
  if (!raiz) return [slug]
  const vistos = new Set<number>()
  const salida: string[] = []
  const pila = [raiz]
  while (pila.length) {
    const f = pila.pop()!
    if (vistos.has(f.id)) continue
    vistos.add(f.id)
    salida.push(f.slug)
    pila.push(...hijas(fams, f))
  }
  return salida
}

export type Nodo = {
  etiqueta: string
  href: string
  // Foto de fondo del menu. Solo la llevan las familias; una subcategoria
  // (`kind`) hereda la de su familia, que es lo que ya hacia el menu de dos
  // niveles.
  foto: string | null
  hijos: Nodo[]
}

/* El arbol que pinta el menu, en una funcion pura para poder probarlo sin
 * base. Una regla, la misma en todos los niveles:
 *
 *     los hijos de una familia son sus familias hijas;
 *     si no tiene ninguna, son los `kind` de sus productos.
 *
 * De ahi salen las dos formas a la vez sin caso especial: Rifles no tiene
 * hijas, asi que se abre en sus seis `kind` como hasta ahora; Municion si,
 * asi que se abre en Balas / Cartuchos / Recarga, y Recarga en sus cinco.
 * Cartuchos, que es hoja del arbol pero tiene los 15 productos, se abre en
 * sus `kind` -- por eso la regla mira las hijas primero y los `kind` despues,
 * y no al reves.
 *
 * `vistos` por lo mismo que en rama(): un ciclo en `parent_id` colgaria el
 * render del servidor. */
export function arbolMenu(fams: Familia[], kinds: Record<string, string[]>): Nodo[] {
  function nodo(f: Familia, ancestros: ReadonlySet<number>): Nodo {
    // Una familia que ya esta en su propio camino es un ciclo: se pinta, pero
    // sin bajar mas.
    const crias = ancestros.has(f.id) ? [] : hijas(fams, f)
    const camino = new Set(ancestros).add(f.id)
    return {
      etiqueta: f.name,
      href: `/catalogo?familia=${f.slug}`,
      foto: f.model_key ? `/img/model/${f.model_key}.webp` : null,
      hijos: crias.length
        ? crias.map((h) => nodo(h, camino))
        : (kinds[f.slug] ?? []).map((kind) => ({
          etiqueta: kind,
          href: `/catalogo?familia=${f.slug}&sub=${encodeURIComponent(kind)}`,
          // Sin foto propia: la subcategoria hereda la de su familia, que es
          // lo que ya hacia el menu de dos niveles.
          foto: null,
          hijos: [],
        })),
    }
  }
  return raices(fams).map((f) => nodo(f, new Set()))
}
