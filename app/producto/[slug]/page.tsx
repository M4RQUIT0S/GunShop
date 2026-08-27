import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  productoPorSlug, cambio, precio, modoVenta,
} from '@/lib/catalogo'
import ProductoCTA from '@/app/components/ProductoCTA'

// Igual que /catalogo: se regenera cada diez minutos, no en cada visita.
export const revalidate = 600

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const producto = await productoPorSlug(slug)
  if (!producto) return {}

  const titulo = `${producto.marca} ${producto.ref}`
  const descripcion = `${producto.kind} · ${producto.regimenEtiqueta}.`
  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      images: producto.foto ? [{ url: producto.foto, width: 1200, height: 750 }] : undefined,
    },
  }
}

export default async function Ficha({ params }: Props) {
  const { slug } = await params
  const [producto, arsPorUsd] = await Promise.all([productoPorSlug(slug), cambio()])
  if (!producto) notFound()

  const modo = modoVenta(producto.regimen)
  const exige = modo !== 'direct_checkout'

  return (
    <main id="contenido" className="section" style={{ paddingTop: 'calc(var(--nav-h-ancha) + 1rem)' }}>
      <div className="wrap ficha__grid">
        <div>
          {producto.fotos.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <div className="card__art">
              <img
                src={producto.fotos[0]}
                alt={`${producto.marca} ${producto.ref}`}
                width={1200}
                height={750}
              />
            </div>
          ) : (
            <div className="card__art" style={{ display: 'grid', placeItems: 'center', color: 'var(--gris)' }}>
              Sin fotografía
            </div>
          )}
          {producto.fotos.length > 1 && (
            <div className="ficha__miniaturas">
              {producto.fotos.slice(1).map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f} src={f} alt="" width={200} height={125} loading="lazy" />
              ))}
            </div>
          )}
        </div>

        <div className="ficha__info">
          <Link href={`/catalogo?familia=${producto.familia}`} className="chip">
            ← {producto.familiaNombre}
          </Link>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <p className="eyebrow">{producto.kind}</p>
            <h1 className="h-section">{producto.marca} {producto.ref}</h1>
          </div>

          <span className={`tag${exige ? ' tag--licence' : ''}`}>{producto.regimenEtiqueta}</span>

          <p className="card__price ficha__precio">{precio(producto.usdCents, arsPorUsd)}</p>

          {producto.calibres.length > 0 && (
            <div className="ficha__seccion">
              <p className="ficha__rotulo">Calibre</p>
              <div className="ficha__chips">
                {producto.calibres.map((c) => (
                  <span key={c.name} className="chip">{c.name}</span>
                ))}
              </div>
            </div>
          )}

          {producto.cartridgesPerBox > 0 && (
            <p className="ficha__caja">{producto.cartridgesPerBox} cartuchos por caja</p>
          )}

          {producto.spec.length > 0 && (
            <ul className="ficha__specs">
              {producto.spec.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}

          <ProductoCTA
            producto={{ id: producto.id, marca: producto.marca, ref: producto.ref }}
            modo={modo}
          />
        </div>
      </div>
    </main>
  )
}
