import Link from 'next/link'
import { familias } from '@/lib/catalogo'
import css from './catalogo.module.css'

export const revalidate = 600

export default async function Inicio() {
  const fams = await familias()

  return (
    <main id="contenido" className="caja">
      <header className={css.cabecera}>
        <h1 style={{ fontSize: 'var(--fs-titular)' }}>Alcántara</h1>
        <p className={css.bajada}>
          Armería habilitada ANMaC en Buenos Aires. Tiro deportivo y caza,
          con taller propio.
        </p>
        <p style={{ marginTop: 'var(--sp-3)' }}>
          <Link
            href="/catalogo"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--primario)',
              color: 'var(--fondo)',
              borderRadius: 'var(--r)',
              textDecoration: 'none',
            }}
          >
            Ver el catálogo
          </Link>
        </p>
      </header>

      <nav className={css.familias} aria-label="Familias">
        {fams.map((f) => (
          <Link key={f.slug} href={`/catalogo?familia=${f.slug}`} className={css.familia}>
            {f.name}
          </Link>
        ))}
      </nav>
    </main>
  )
}
