import type { Metadata } from 'next'
import Link from 'next/link'
import {
  listaProductos, familias, cambio, precio, slugDe, modoVenta,
} from '@/lib/catalogo'
import css from '../catalogo.module.css'

export const metadata: Metadata = {
  title: 'Catálogo',
  description:
    'Rifles, escopetas, pistolas, óptica, munición y accesorios. Precios en ' +
    'pesos al cambio del día.',
}

// El catalogo cambia poco y lo lee un servidor: se regenera cada diez minutos
// en vez de consultar Supabase en cada visita.
export const revalidate = 600

type Props = { searchParams: Promise<{ familia?: string }> }

export default async function Catalogo({ searchParams }: Props) {
  const { familia } = await searchParams
  const [productos, fams, arsPorUsd] = await Promise.all([
    listaProductos(familia),
    familias(),
    cambio(),
  ])

  return (
    <main id="contenido" className="caja">
      <header className={css.cabecera}>
        <h1 className={css.titulo}>Catálogo</h1>
        <p className={css.bajada}>
          {productos.length}{' '}
          {productos.length === 1 ? 'producto' : 'productos'}
          {familia ? ` en ${fams.find((f) => f.slug === familia)?.name ?? familia}` : ''}
          {arsPorUsd > 0 && ' · precios al cambio del día'}
        </p>
      </header>

      <nav className={css.familias} aria-label="Familias">
        <Link
          href="/catalogo"
          className={`${css.familia} ${!familia ? css.familiaActiva : ''}`}
          aria-current={!familia ? 'page' : undefined}
        >
          Todo
        </Link>
        {fams.map((f) => (
          <Link
            key={f.slug}
            href={`/catalogo?familia=${f.slug}`}
            className={`${css.familia} ${familia === f.slug ? css.familiaActiva : ''}`}
            aria-current={familia === f.slug ? 'page' : undefined}
          >
            {f.name}
          </Link>
        ))}
      </nav>

      {productos.length === 0 ? (
        <p className={css.vacio}>No hay productos en esta familia.</p>
      ) : (
        <div className={css.rejilla}>
          {productos.map((p) => {
            // Lo que hace falta para llevarselo se dice ya en el listado, no
            // al final del checkout: enterarse en el ultimo paso de que hacia
            // falta una credencial es el peor sitio para enterarse.
            const exige = modoVenta(p.regimen) !== 'direct_checkout'
            return (
              <Link key={p.id} href={`/producto/${slugDe(p)}`} className={css.ficha}>
                {p.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={css.foto}
                    src={p.foto}
                    alt={`${p.marca} ${p.ref}`}
                    width={1200}
                    height={750}
                    loading="lazy"
                  />
                ) : (
                  <div className={`${css.foto} ${css.sinFoto}`}>Sin fotografía</div>
                )}
                <div className={css.cuerpo}>
                  <span className={css.marca}>{p.marca}</span>
                  <h2 className={css.nombre}>{p.ref}</h2>
                  <span className={css.tipo}>{p.kind}</span>
                  <span
                    className={`${css.regimen} ${exige ? css.regimenExige : ''}`}
                  >
                    {p.regimenEtiqueta}
                  </span>
                  <div className={css.pie}>
                    <span className={css.precio}>{precio(p.usdCents, arsPorUsd)}</span>
                    <span className={css.tipo}>
                      {exige ? 'Consultar' : 'Compra directa'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
