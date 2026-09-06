import { familias, listaProductos, raices, cuentaPorRama, recientes, slugDe } from '@/lib/catalogo'
import RielLaminas from './components/RielLaminas'
import Scrollicono from './components/Scrollicono'
import Reveal from './components/Reveal'
import Marquee from './components/Marquee'

// Igual que /catalogo: la portada cambia poco y se regenera cada diez
// minutos en vez de consultar Supabase en cada visita. Es tambien la ventana
// con la que una referencia recien cargada tarda en salir en las laminas.
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
  // Por rama, no por `p.familia`: desde 0010 Municion no tiene producto
  // propio -- los tiene su hija Cartuchos -- y contarla plana daria cero.
  const porFamilia = cuentaPorRama(productos, fams)
  // Únicas por marca (marcaSlug), no por nombre: dos marcas no comparten
  // slug aunque compartiesen nombre de vitrina.
  const marcas = [...new Map(productos.map((p) => [p.marcaSlug, p.marca])).values()]

  /* Las dos láminas de debajo de la portada ya no son fotos de archivo: salen
   * del catálogo. La primera enseña la última referencia que entró; la
   * segunda, un mosaico con las cuatro siguientes.
   *
   * Se corta DESPUÉS de filtrar, y por foto única. Dos cosas distintas:
   *
   * - Sin `foto` no entra. `aProducto()` ya cae a la genérica de la familia,
   *   así que quedarse sin ninguna significa que no hay ni eso, y una lámina
   *   de pantalla entera con el hueco vacío no es una novedad, es un fallo.
   * - Sin foto REPETIDA tampoco. Dos referencias de la misma familia sin foto
   *   propia caen en la misma genérica -- los dados y la balanza comparten
   *   `gauge.webp` -- y un mosaico con la misma imagen dos veces se lee como
   *   un fallo, no como cuatro novedades.
   *
   * Si el catálogo entero se quedara sin fotos, las láminas simplemente no se
   * pintan y la portada sigue en pie. */
  const vistas = new Set<string>()
  const [ultimo, ...mosaico] = recientes(productos)
    .filter((p) => {
      if (!p.foto || vistas.has(p.foto)) return false
      vistas.add(p.foto)
      return true
    })
    .slice(0, 5)

  return (
    <>
      <RielLaminas />
      <Scrollicono />
      <Reveal />

      <main id="contenido">

        {/* portada: la lámina de marca y, debajo, lo que acaba de entrar */}
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

          {ultimo && (
            <section className="lamina" aria-labelledby="lam2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="lamina__bg"
                src={ultimo.foto!}
                alt=""
                aria-hidden="true"
                width={1200}
                height={750}
                loading="lazy"
              />
              <div className="lamina__copy">
                <p className="eyebrow">Recién ingresado</p>
                {/* `h-section` y no `h-display`: el nombre de un producto no es
                    «Alcántara». «Federal 210M Gold Medal Match (caja de 1.000)» a
                    70 px se come la lámina entera; a 44 px sigue siendo el titular
                    de la pantalla y cabe en dos líneas. */}
                <h2 className="h-section" id="lam2">{ultimo.marca} {ultimo.ref}</h2>
                <p className="lede">{[ultimo.kind, ...ultimo.spec.slice(0, 3)].join(' · ')}</p>
                <a className="btn" href={`/producto/${slugDe(ultimo)}`}>Ver la ficha</a>
              </div>
            </section>
          )}

          {mosaico.length > 0 && (
            <section className="lamina" aria-labelledby="lam3">
              <div className="lamina__mosaico" aria-hidden="true">
                {mosaico.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.foto!} alt="" width={1200} height={750} loading="lazy" />
                ))}
              </div>
              <div className="lamina__copy">
                <p className="eyebrow">Novedades</p>
                <h2 className="h-display" id="lam3">Lo último en vitrina</h2>
                <p className="lede">Las {mosaico.length + 1} referencias que acaban de subir
                  al catálogo. Lo que no está en vitrina se encarga y llega con la
                  documentación hecha.</p>
                <a className="btn btn--ghost" href="/catalogo">Recorrer el catálogo</a>
              </div>
            </section>
          )}

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
              {raices(fams).map((f, i) => (
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
