import type { Metadata } from 'next'
import Link from 'next/link'
import {
  listaProductos, familias, cambio, precio, slugDe, modoVenta,
  raices, rama, filtrarPorFamilia, cuentaPorRama, filtrarPorSub,
} from '@/lib/catalogo'
import {
  FACETAS, opciones, aplicarFacetas, seleccion, alternar, consulta, type Estado,
} from '@/lib/facetas'
import Desplegable from '@/app/components/Desplegable'
import { buscar } from '@/lib/buscar'

export const metadata: Metadata = {
  title: 'Catálogo',
  description:
    'Rifles, escopetas, pistolas, óptica, munición y accesorios. Precios en ' +
    'pesos al cambio del día.',
}

// El catalogo cambia poco y lo lee un servidor: se regenera cada diez minutos
// en vez de consultar Supabase en cada visita.
export const revalidate = 600

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// La URL del catalogo con los filtros que lleve puestos. El estado lo serializa
// `consulta()` (lib/facetas.ts), que es de donde lo lee tambien la ficha.
function href(e: Estado): string {
  const s = consulta(e)
  return s ? `/catalogo?${s}` : '/catalogo'
}

export default async function Catalogo({ searchParams }: Props) {
  const sp = await searchParams
  const uno = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k])
  const familia = uno('familia')
  const sub = uno('sub')
  // La busqueda vive por encima de los filtros: entra en "Todo" y solo se
  // cruza con las facetas, igual que fuente()/setQuery() en js/main.js. El
  // chip .chip--busqueda (ya en css/shop.css) es como se deshace.
  const busqueda = uno('q')?.trim() || ''
  /* En «Todo» no hay desplegables: la marca serian las 40 del catalogo y el
   * calibre mezclaria el 12/70 de escopeta con el .308 de rifle, que no se
   * cruzan con nada. La seleccion tampoco se lee ahi -- si se aplicara sin
   * fila que la muestre, seria un filtro puesto que no se puede quitar. */
  const acotado = !!familia || !!busqueda
  const sel = seleccion(acotado ? sp : {})

  // Un solo viaje a Supabase: el resto de los filtros son funciones puras
  // sobre el mismo array, igual que hacia js/catalog.js con `items`. Asi los
  // chips y los desplegables pueden contar sin volver a preguntar.
  const [todos, fams, arsPorUsd] = await Promise.all([
    listaProductos(),
    familias(),
    cambio(),
  ])

  const enFamilia = busqueda
    ? buscar(todos, busqueda)
    : (familia ? filtrarPorFamilia(todos, fams, familia) : todos)

  /* La fila de subcategorias («Rifle de cerrojo», «Rifle modular»...) ya no se
   * pinta: repartia una familia en tantos chips como etiquetas sueltas
   * tuvieran sus productos, con varios a un solo producto. El parametro se
   * sigue honrando porque el tercer nivel del menu de la cabecera enlaza a
   * `?familia=X&sub=<kind>` (lib/familia.ts) -- se ve y se quita como chip. */
  const subActivo = sub && enFamilia.some((p) => p.kind === sub) ? sub : undefined
  const base = subActivo ? filtrarPorSub(enFamilia, subActivo) : enFamilia

  // Cada desplegable cuenta sobre lo que dejan las *otras* facetas, no sobre
  // el resultado final; si no, marcar un calibre pondria el resto a cero y no
  // se podria anadir un segundo.
  const desplegables = acotado
    ? FACETAS
      .map((f) => ({ f, opts: opciones(aplicarFacetas(base, sel, f.clave), f) }))
      .filter(({ opts }) => opts.length >= 2)
    : []

  const productos = aplicarFacetas(base, sel)
  /* Los filtros viajan con el enlace a la ficha para que el «volver» de alli
   * los devuelva. Sin esto, entrar a un producto y salir dejaba al cliente
   * poniendolos otra vez: el enlace de la ficha iba a `?familia=` y nada mas. */
  const estado = consulta({ familia, sub: subActivo, q: busqueda, sel })
  const countsPorFamilia = cuentaPorRama(todos, fams)
  const hayFiltro = FACETAS.some((f) => (sel[f.clave] ?? []).length > 0)

  const etiqueta = busqueda
    ? `«${busqueda}»`
    : (familia ? (fams.find((f) => f.slug === familia)?.name ?? familia) : 'todo el catálogo')

  return (
    <main id="contenido" className="section" style={{ paddingTop: 'calc(var(--nav-h-ancha) + 1rem)' }}>
      <div className="wrap">
        <div className="catalog__head">
          <div>
            <p className="eyebrow">Disponibilidad real</p>
            <h1 className="h-section">Catálogo</h1>
          </div>
        </div>

        {/* Cambiar de familia limpia las facetas: un calibre de rifle en
            Óptica no deja nada que ver. */}
        <div className="filters" aria-label="Filtrar por familia">
          {busqueda && (
            <Link
              // Sin `sel`: quitar la busqueda deja «Todo» sin familia, y en
              // «Todo» la seleccion no se lee (linea 49) -- si viajara, el
              // enlace resultante llevaria un `?calibre=` inerte colgando.
              href={href({})}
              className="chip chip--busqueda"
              aria-label={`Quitar la búsqueda ${busqueda}`}
            >
              «{busqueda}»
              <span className="chip__x" aria-hidden="true">✕</span>
            </Link>
          )}
          {subActivo && (
            <Link
              href={href({ familia, q: busqueda, sel })}
              className="chip chip--busqueda"
              aria-label={`Quitar el filtro ${subActivo}`}
            >
              {subActivo}
              <span className="chip__x" aria-hidden="true">✕</span>
            </Link>
          )}
          <Link href="/catalogo" className="chip" aria-pressed={!familia && !busqueda}>
            Todo
            <span className="chip__n">{todos.length}</span>
          </Link>
          {raices(fams).map((f) => (
            <Link
              key={f.slug}
              href={href({ familia: f.slug })}
              className="chip"
              aria-pressed={!busqueda && !!familia && rama(fams, f.slug).includes(familia)}
            >
              {f.name}
              <span className="chip__n">{countsPorFamilia[f.slug] ?? 0}</span>
            </Link>
          ))}
        </div>

        {desplegables.length > 0 && (
          <div className="filtros" aria-label="Filtrar por marca, calibre y medidas">
            {desplegables.map(({ f, opts }) => (
              <Desplegable
                key={f.clave}
                faceta={f}
                opciones={opts}
                sel={sel[f.clave] ?? []}
                href={(valor) => href({
                  familia, sub: subActivo, q: busqueda, sel: alternar(sel, f.clave, valor),
                })}
              />
            ))}
            {hayFiltro && (
              <Link
                href={href({ familia, sub: subActivo, q: busqueda })}
                className="chip chip--busqueda filtros__limpiar"
              >
                Limpiar
                <span className="chip__x" aria-hidden="true">✕</span>
              </Link>
            )}
          </div>
        )}

        <div className="grid">
          {productos.map((p, i) => {
            // Lo que hace falta para llevarselo se dice ya en el listado, no
            // al final del checkout: enterarse en el ultimo paso de que
            // hacia falta una credencial es el peor sitio para enterarse.
            const exige = modoVenta(p.regimen) !== 'direct_checkout'
            const spec = [...p.calibres.map((c) => c.name), ...p.spec].join(' · ')
            return (
              <Link
                key={p.id}
                href={`/producto/${slugDe(p)}${estado ? `?${estado}` : ''}`}
                className="card"
                style={{ '--i': Math.min(i, 7) } as React.CSSProperties}
              >
                <div className="card__art">
                  {p.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto}
                      alt={`${p.marca} ${p.ref}`}
                      width={1200}
                      height={750}
                      loading="lazy"
                    />
                  ) : (
                    <span
                      style={{
                        display: 'grid', placeItems: 'center', height: '100%', color: 'var(--gris)',
                      }}
                    >
                      Sin fotografía
                    </span>
                  )}
                  <div className="card__tags">
                    <span className={`tag${exige ? ' tag--licence' : ''}`}>{p.regimenEtiqueta}</span>
                  </div>
                </div>
                <div className="card__body">
                  <span className="card__cat">{p.kind}</span>
                  <h2 className="card__name">{p.marca} {p.ref}</h2>
                  <p className="card__spec">{spec}</p>
                  <div className="card__rule" />
                  <div className="card__foot">
                    <p className="card__price">{precio(p.usdCents, arsPorUsd)}</p>
                    <span className="card__add">{exige ? 'Consultar' : 'Compra directa'}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <p className="grid__status" role="status">
          {productos.length} {productos.length === 1 ? 'referencia' : 'referencias'} en {etiqueta}
        </p>
      </div>
    </main>
  )
}
