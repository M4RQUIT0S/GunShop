import { familias, listaProductos } from '@/lib/catalogo'
import RielLaminas from './components/RielLaminas'
import Scrollicono from './components/Scrollicono'
import Reveal from './components/Reveal'
import Marquee from './components/Marquee'

// Igual que /catalogo: la portada cambia poco y se regenera cada diez
// minutos en vez de consultar Supabase en cada visita.
export const revalidate = 600

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

const FLECHA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h13M12 5l7 7-7 7" />
  </svg>
)

function d(n: number): React.CSSProperties {
  return { '--d': n } as React.CSSProperties
}

export default async function Home() {
  const [fams, productos] = await Promise.all([familias(), listaProductos()])

  // El titular cuenta lo mismo que enseñaría la rejilla, no un número escrito
  // a mano; y las baldosas de familia igual, contadas por `familia` (slug).
  const total = productos.length
  const porFamilia = productos.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.familia]: (acc[p.familia] ?? 0) + 1 }),
    {},
  )
  // Únicas por marca (marcaSlug), no por nombre: dos marcas no comparten
  // slug aunque compartiesen nombre de vitrina.
  const marcas = [...new Map(productos.map((p) => [p.marcaSlug, p.marca])).values()]

  return (
    <>
      <RielLaminas />
      <Scrollicono />
      <Reveal />

      <main id="contenido">

        {/* portada: tres pantallas apiladas */}
        <section className="laminas" id="laminas" aria-label="Portada">

          <section className="lamina" aria-labelledby="lam1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="lamina__bg"
              src="/img/hero.webp"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              width={2400}
              height={1350}
            />
            <div className="lamina__copy">
              <p className="eyebrow">Una casa de armas desde 1927</p>
              <h1 className="h-display h-display--ancho" id="lam1">Alcántara</h1>
              <p className="lede">Tiro deportivo y caza. Armería habilitada ANMaC con taller
                propio en Buenos Aires.</p>
              <a className="btn" href="/catalogo">Ver el catálogo</a>
            </div>
          </section>

          <section className="lamina" aria-labelledby="lam2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="lamina__bg"
              src="/img/model/rifle.webp"
              alt=""
              aria-hidden="true"
              width={1200}
              height={750}
              loading="lazy"
            />
            <div className="lamina__copy">
              <p className="eyebrow">Cada pieza con su CUIM</p>
              <h2 className="h-display" id="lam2">Nada sale sin papeles</h2>
              <p className="lede">Ninguna venta se cierra sin Credencial de Legítimo Usuario
                vigente. La munición exige además Tarjeta de Consumo ligada a un arma
                registrada a su nombre.</p>
              <a className="btn btn--ghost" href="/#preguntas">Qué hay que tener en regla</a>
            </div>
          </section>

          <section className="lamina" aria-labelledby="lam3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="lamina__bg"
              src="/img/model/shotgun.webp"
              alt=""
              aria-hidden="true"
              width={1200}
              height={750}
              loading="lazy"
            />
            <div className="lamina__copy">
              <p className="eyebrow">Taller propio en la misma planta</p>
              <h2 className="h-display" id="lam3">Ajustada a su mano</h2>
              <p className="lede">Disparador, monturas, puesta a cero y culata a medida. El
                arma no sale del local para ajustarse.</p>
              <a className="btn btn--ghost" href="/#taller">Pedir cita en el taller</a>
            </div>
          </section>

        </section>

        {/* cifras */}
        <section className="section section--tight" aria-label="La armería en cifras">
          <div className="wrap">
            <dl className="stats">
              <div><dt>Referencias en stock</dt><dd>{numero.format(total)}</dd></div>
              <div><dt>Entrega en armería</dt><dd>48 <span>h</span></dd></div>
              <div><dt>Taller propio desde</dt><dd>1927</dd></div>
              <div><dt>Marcas representadas</dt><dd>{numero.format(marcas.length)}</dd></div>
            </dl>
          </div>
        </section>

        {/* familias */}
        <section className="section" id="familias" aria-labelledby="familias-h">
          <div className="wrap">
            <div className="section__head">
              <p className="eyebrow" data-reveal>Qué vendemos</p>
              <h2 className="h-section" id="familias-h" data-reveal style={d(1)}>Seis familias</h2>
              <p className="lede" data-reveal style={d(2)}>
                Del rifle de cerrojo al cartucho suelto. Lo que no está en vitrina se
                encarga y llega con la documentación hecha.
              </p>
            </div>
            <div className="tiles" id="tiles">
              {fams.map((f, i) => (
                <a
                  key={f.slug}
                  className="tile"
                  href={`/catalogo?familia=${f.slug}`}
                  data-reveal
                  style={d(i % 3)}
                >
                  <span className="tile__n">{porFamilia[f.slug] ?? 0} referencias</span>
                  <h3 className="tile__name">{f.name}</h3>
                  <p className="tile__spec">{f.licencia}</p>
                  <span className="tile__go">{FLECHA}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* marcas */}
        <section className="section section--tight" id="marcas" aria-labelledby="marcas-h">
          <div className="wrap">
            <div className="section__head">
              <p className="eyebrow" data-reveal>Representación</p>
              <h2 className="h-section" id="marcas-h" data-reveal style={d(1)}>Las casas que trabajamos</h2>
            </div>
          </div>
          <Marquee marcas={marcas} />
        </section>

      </main>
    </>
  )
}
