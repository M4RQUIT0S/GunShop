import { cambioDelDia } from '@/lib/catalogo'

/* Puerto casi literal de index.html lineas 504-565. Correo, telefono y redes
 * eran `.example` y numeros a cero: ya no son enlaces, porque ofrecerlos como
 * canal era prometer que alguien contesta (UX-AUDIT.md, Von Restorff). Cuando
 * existan los reales, vuelven a ser <a> -- y no antes. */

const cambioFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function fecha(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export default async function Footer() {
  const { arsPorUsd, dia } = await cambioDelDia()

  return (
    <footer className="foot" id="foot">
      <div className="foot__inner">

        <div className="foot__marca">
          <span className="brand__name">Alcántara</span>
          <span className="brand__meta">Armería · Buenos Aires</span>
        </div>

        <div className="foot__top">
          <a href="/catalogo">Catálogo</a>
          <a href="/#familias">Familias</a>
          <a href="/#marcas">Marcas</a>
          <a href="/privacidad">Privacidad</a>

          <span>Av. Rivadavia 0000</span>
          <span>Balvanera · CABA</span>
          <span>Martes a sábado</span>
          <span>9:30 – 13:30</span>
          <span>16:00 – 20:00</span>
          <span>(011) 0000-0000</span>

          <span>Tenencia Express</span>
          <span>Res. 45/2025</span>
          <span>Consumo TCCM</span>
          <span>Res. 14/2025</span>
          <span>Semiautomáticas</span>
          <span>Res. 37/2025</span>
        </div>

        <div className="foot__bar">
          <span>Armería Alcántara · CABA · Legítimo Usuario Colectivo Comercial ANMaC nº 000000</span>
          <span>
            Precios de referencia del mercado argentino, no vinculantes. Cambio aplicado: 1 US$ = ${' '}
            {arsPorUsd > 0 ? cambioFmt.format(arsPorUsd) : '—'}{dia && ` (del ${fecha(dia)})`}.
            Página de demostración: no se vende, reserva ni envía nada.
          </span>
        </div>

      </div>
    </footer>
  )
}
