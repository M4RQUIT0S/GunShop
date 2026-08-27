import type { Metadata } from 'next'
import Link from 'next/link'
import {
  listaProductos, familias, cambio, precio, slugDe, modoVenta,
  filtrarPorSub, filtrarPorCalibre, subcategorias, calibresDe,
} from '@/lib/catalogo'

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
  searchParams: Promise<{ familia?: string; sub?: string; calibre?: string }>
}

// Arma la URL del catalogo con los tres filtros que puede llevar. `undefined`
// quita el parametro en vez de dejarlo vacio en la barra de direcciones.
function href(p: { familia?: string; sub?: string; calibre?: string }): string {
  const qs = new URLSearchParams()
  if (p.familia) qs.set('familia', p.familia)
  if (p.sub) qs.set('sub', p.sub)
  if (p.calibre) qs.set('calibre', p.calibre)
  const s = qs.toString()
  return s ? `/catalogo?${s}` : '/catalogo'
}

export default async function Catalogo({ searchParams }: Props) {
  const { familia, sub, calibre } = await searchParams

  // Un solo viaje a Supabase: el resto de los filtros son funciones puras
  // sobre el mismo array, igual que hacia js/catalog.js con `items`. Asi los
  // chips pueden contar lo que hay en cada familia sin volver a preguntar.
  const [todos, fams, arsPorUsd] = await Promise.all([
    listaProductos(),
    familias(),
    cambio(),
  ])

  const productosFamilia = familia ? todos.filter((p) => p.familia === familia) : todos

  // Segundo nivel: solo existe dentro de una familia, y solo si hay algo
  // entre lo que elegir.
  const subs = familia ? subcategorias(productosFamilia) : []
  const subActivo = sub && subs.some((s) => s.kind === sub) ? sub : undefined
  const productosSub = subActivo ? filtrarPorSub(productosFamilia, subActivo) : productosFamilia

  // El calibre corta de traves a familia y subcategoria: se calcula sobre lo
  // que quede despues de esos dos, tanto si eso es «todo» como una familia.
  const calibres = calibresDe(productosSub)
  const calibreActivo = calibre && calibres.includes(calibre) ? calibre : undefined
  const productos = calibreActivo ? filtrarPorCalibre(productosSub, calibreActivo) : productosSub

  const countsPorFamilia = todos.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.familia]: (acc[p.familia] ?? 0) + 1 }),
    {},
  )

  const etiqueta = familia
    ? (fams.find((f) => f.slug === familia)?.name ?? familia)
    : 'todo el catálogo'

  return (
    <main id="contenido" className="section" style={{ paddingTop: 'calc(var(--nav-h-ancha) + 1rem)' }}>
      <div className="wrap">
        <div className="catalog__head">
          <div>
            <p className="eyebrow">Disponibilidad real</p>
            <h1 className="h-section">Catálogo</h1>
          </div>
        </div>

        <div className="filters" aria-label="Filtrar por familia">
          <Link href="/catalogo" className="chip" aria-pressed={!familia}>
            Todo
            <span className="chip__n">{todos.length}</span>
          </Link>
          {fams.map((f) => (
            <Link
              key={f.slug}
              href={href({ familia: f.slug })}
              className="chip"
              aria-pressed={familia === f.slug}
            >
              {f.name}
              <span className="chip__n">{countsPorFamilia[f.slug] ?? 0}</span>
            </Link>
          ))}
        </div>

        {familia && subs.length >= 2 && (
          <div className="filters filters--sub" aria-label="Filtrar por subcategoría">
            <Link href={href({ familia })} className="chip" aria-pressed={!subActivo}>
              Todo
              <span className="chip__n">{productosFamilia.length}</span>
            </Link>
            {subs.map((s) => (
              <Link
                key={s.kind}
                href={href({ familia, sub: s.kind })}
                className="chip"
                aria-pressed={subActivo === s.kind}
              >
                {s.kind}
                <span className="chip__n">{s.n}</span>
              </Link>
            ))}
          </div>
        )}

        {calibres.length >= 2 && (
          <div className="calibre">
            <span className="calibre__et">Calibre</span>
            <Link
              href={href({ familia, sub: subActivo })}
              className="chip"
              aria-pressed={!calibreActivo}
            >
              Todos
            </Link>
            {calibres.map((c) => (
              <Link
                key={c}
                href={href({ familia, sub: subActivo, calibre: c })}
                className="chip"
                aria-pressed={calibreActivo === c}
              >
                {c}
              </Link>
            ))}
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
                href={`/producto/${slugDe(p)}`}
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
