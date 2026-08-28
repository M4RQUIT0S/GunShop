import type { Metadata } from 'next'
import Link from 'next/link'

/* Politica de privacidad. Es una pagina estatica de verdad -- ningun dato, ni
 * de Supabase ni del cambio del dia -- asi que se prerenderiza y no vuelve a
 * tocarse hasta el proximo despliegue.
 *
 * Lo que dice esta escrito contra el codigo, no contra una plantilla: las
 * tres llaves de localStorage son las que usan CartContext/AccountContext/
 * CartPanel, `auth.users` es donde Supabase Auth deja al que entra con
 * Google, y las regiones (us-west-2, iad1) son las reales del proyecto y del
 * despliegue. Si alguna de esas cosas cambia, esta pagina miente: se toca a
 * la vez que el codigo, no despues.
 *
 * OJO -- los datos del responsable (razon social, CUIT, domicilio, correo y
 * telefono) son los mismos marcadores `.example` que usa el resto del sitio,
 * y hay que sustituirlos por los reales antes de que esto valga como
 * documento. Lo mismo con la inscripcion del registro de la AAIP. */

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Qué datos toma Armería Alcántara, dónde viven, quién más los ve y cómo ' +
    'pedir que se borren.',
}

const ACTUALIZADA = '28 de agosto de 2026'

export default function Privacidad() {
  return (
    <main id="contenido" className="section" style={{ paddingTop: 'calc(var(--nav-h-ancha) + 1rem)' }}>
      <div className="wrap">
        <div className="catalog__head">
          <div>
            <p className="eyebrow">Actualizada el {ACTUALIZADA}</p>
            <h1 className="h-section">Política de privacidad</h1>
          </div>
        </div>

        <article className="legal">
          <p className="lede">
            Esta página cuenta qué datos tuyos toma esta tienda, dónde acaban, quién
            más los ve y cómo pedir que desaparezcan. Está escrita mirando el código
            que la sirve, no copiada de una plantilla.
          </p>

          <section>
            <h2>1 · Quién responde por tus datos</h2>
            <p>
              Armería Alcántara, Av. Rivadavia 0000, Balvanera, Ciudad Autónoma de
              Buenos Aires. Para cualquier cosa de esta página escribe a{' '}
              <a href="mailto:taller@alcantara.example">taller@alcantara.example</a>.
            </p>
          </section>

          <section>
            <h2>2 · Qué tomamos, cuándo y dónde acaba</h2>
            <dl className="legal__lista">
              <dt>Nombre y correo</dt>
              <dd>
                Cuando entras con Google, o cuando los escribes a mano en «Mi cuenta».
                Se guardan en tu propio navegador; si entraste con Google, además
                quedan en nuestra base de datos junto al identificador de tu cuenta de
                Google, que es lo que nos deja reconocerte la próxima vez.
              </dd>

              <dt>Lo que pones en la cesta</dt>
              <dd>
                Sólo qué artículo y cuántas unidades, en tu navegador. No sale de ahí
                mientras no reserves.
              </dd>

              <dt>Tus reservas</dt>
              <dd>
                Las veinte últimas, en tu navegador. Al reservar no mandamos nada a
                ningún servidor: se abre tu programa de correo con el detalle ya
                escrito, y eres tú quien decide enviarlo. Si lo envías, ese correo
                llega a nuestra casilla y vive ahí como cualquier otro mensaje.
              </dd>

              <dt>Lo que escribes en una consulta</dt>
              <dd>
                Mismo camino que la reserva: abre tu correo, no se guarda en la página.
              </dd>

              <dt>Dirección IP y datos técnicos de la visita</dt>
              <dd>
                Los registra automáticamente el servidor que aloja el sitio, como
                cualquier servidor web, para que funcione y para detectar abusos.
              </dd>
            </dl>
          </section>

          <section>
            <h2>3 · Qué no te pedimos, y por qué</h2>
            <p>
              <strong>Nunca te pedimos el número de tu Credencial de Legítimo Usuario,
              tu Tarjeta de Consumo de Munición ni tu DNI</strong>, y no hay ningún
              formulario donde puedas escribirlos. La razón es simple: por la web no se
              vende nada que exija credencial ANMaC. Lo que la exige no se puede ni
              poner en la cesta —el botón de su ficha abre una consulta, no una
              compra— y se cierra en el mostrador, con los papeles originales delante.
              Si no hay nada que validar, no hay motivo para guardar el papel.
            </p>
            <p>
              Tampoco te pedimos datos de tarjeta: aquí no se paga.
            </p>
            <p>
              No hay cookies de publicidad ni de medición, ni perfilado, ni nadie
              siguiéndote entre sitios. Las tipografías se sirven desde nuestro propio
              dominio, así que abrir esta página no le manda ni una petición a Google.
            </p>
          </section>

          <section>
            <h2>4 · Para qué los usamos</h2>
            <p>
              Para reconocerte cuando vuelves, para que la reserva llegue con tu nombre
              y para contestarte. Nada más. No vendemos ni cedemos tus datos con fines
              comerciales, ni los usamos para publicidad.
            </p>
          </section>

          <section>
            <h2>5 · Quién más los ve</h2>
            <p>
              Tres proveedores, y sólo en lo que hace falta para que la tienda
              funcione:
            </p>
            <dl className="legal__lista">
              <dt>Supabase</dt>
              <dd>
                Guarda el catálogo y las cuentas, y es quien gestiona el acceso con
                Google. Sus servidores están en Estados Unidos (región de Oregón).
              </dd>
              <dt>Vercel</dt>
              <dd>
                Aloja y sirve el sitio, y guarda los registros del servidor. También en
                Estados Unidos (región de Virginia).
              </dd>
              <dt>Google</dt>
              <dd>
                Sólo si usas el acceso con Google. En ese caso Google sabe que iniciaste
                sesión aquí, y nos entrega tu nombre, tu correo y el identificador de tu
                cuenta —nada más, y nunca tu contraseña—. Lo que Google haga con eso lo
                rige{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">
                  su propia política de privacidad
                </a>. Si prefieres no pasar por ahí, escribe tu nombre y tu correo a mano:
                la tienda funciona igual.
              </dd>
            </dl>
            <p>
              Como esos servidores están fuera del país, usar la tienda implica una
              transferencia internacional de tus datos, y al usarla la estás
              consintiendo.
            </p>
          </section>

          <section>
            <h2>6 · Cuánto tiempo duran</h2>
            <p>
              Lo que vive en tu navegador dura hasta que pulses «Borrar mis datos» en
              «Mi cuenta», o hasta que limpies los datos del sitio desde el navegador.
              Es inmediato y no hace falta pedírnoslo. Cerrar la sesión de Google no
              borra esos datos: son dos cosas distintas y el panel las separa a
              propósito.
            </p>
            <p>
              Lo que vive en nuestra base —sólo si entraste con Google— dura mientras
              exista tu cuenta. Para que la borremos, escríbenos.
            </p>
          </section>

          <section>
            <h2>7 · Tus derechos</h2>
            <p>
              Puedes pedir acceso a tus datos, que los rectifiquemos, que los
              actualicemos o que los suprimamos. Se pide por correo a{' '}
              <a href="mailto:taller@alcantara.example">taller@alcantara.example</a> y
              te contestamos dentro de los plazos que fija la ley.
            </p>
            <p className="legal__ley">
              El titular de los datos personales tiene la facultad de ejercer el derecho
              de acceso a los mismos en forma gratuita a intervalos no inferiores a seis
              meses, salvo que se acredite un interés legítimo al efecto conforme lo
              establecido en el artículo 14, inciso 3 de la Ley N.º 25.326.
            </p>
            <p className="legal__ley">
              La Agencia de Acceso a la Información Pública, órgano de control de la Ley
              N.º 25.326, tiene la atribución de atender las denuncias y reclamos que se
              interpongan con relación al incumplimiento de las normas sobre protección
              de datos personales.
            </p>
          </section>

          <section>
            <h2>8 · Menores</h2>
            <p>
              Esta tienda no está dirigida a menores de 18 años y no recogemos datos de
              menores a sabiendas. Si crees que un menor nos dejó datos, escríbenos y
              los borramos.
            </p>
          </section>

          <section>
            <h2>9 · Cambios</h2>
            <p>
              Si esto cambia, cambia aquí, con la fecha de arriba actualizada. No hay
              versiones escondidas.
            </p>
          </section>

          <p className="legal__vuelta">
            <Link href="/">Volver a la portada</Link>
          </p>
        </article>
      </div>
    </main>
  )
}
