import { cambio } from '@/lib/catalogo'

/* Puerto casi literal de index.html lineas 504-565. Los destinos de redes,
 * el correo y el telefono siguen siendo `.example` a proposito, igual que en
 * el sitio estatico: un dominio reservado que no resuelve, para que nadie
 * termine en la cuenta de un tercero. */

const cambioFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export default async function Footer() {
  const arsPorUsd = await cambio()

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
          <a href="mailto:taller@alcantara.example">Escribir</a>
          <a href="/privacidad">Privacidad</a>

          <span>Av. Rivadavia 0000</span>
          <span>Balvanera · CABA</span>
          <span>Martes a sábado</span>
          <span>9:30 – 13:30</span>
          <span>16:00 – 20:00</span>
          <a href="tel:+541100000000">(011) 0000-0000</a>

          <span>Tenencia Express</span>
          <span>Res. 45/2025</span>
          <span>Consumo TCCM</span>
          <span>Res. 14/2025</span>
          <span>Semiautomáticas</span>
          <span>Res. 37/2025</span>
        </div>

        <div className="foot__social">
          <a href="https://instagram.example/armeria.alcantara" aria-label="Alcántara en Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a href="https://facebook.example/armeria.alcantara" aria-label="Alcántara en Facebook">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M14.8 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H18V3.6A21 21 0 0 0 15.6 3.5c-2.4 0-4 1.45-4 4.12V9.9H9V13h2.6v8Z" />
            </svg>
          </a>
          <a href="https://youtube.example/@armeria.alcantara" aria-label="Alcántara en YouTube">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
              <path d="M10.4 9.4v5.2l4.4-2.6Z" />
            </svg>
          </a>
        </div>

        <div className="foot__bar">
          <span>Armería Alcántara · CABA · Legítimo Usuario Colectivo Comercial ANMaC nº 000000</span>
          <span>
            Precios de referencia del mercado argentino, no vinculantes. Cambio aplicado: 1 US$ = ${' '}
            {arsPorUsd > 0 ? cambioFmt.format(arsPorUsd) : '—'}. Página de demostración.
          </span>
        </div>

      </div>
    </footer>
  )
}
