/* El perfil del cliente tal como lo guarda AccountContext en
 * localStorage['gunshop:cuenta']. Vive en lib/ (no en app/components/) para
 * que lib/cesta.ts -- que necesita el perfil para calcular que falta antes de
 * reservar -- no dependa de un componente de React. */

export type Perfil = { nombre: string; email: string; clu: string; vence: string; tccm: boolean }
