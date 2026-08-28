/* El perfil del cliente tal como lo guarda AccountContext en
 * localStorage['gunshop:cuenta']. Vive en lib/ (no en app/components/) para
 * que lib/cesta.ts -- que lo copia en la reserva -- no dependa de un
 * componente de React.
 *
 * Solo identidad de contacto: la pagina no vende nada que exija credencial
 * ANMaC, asi que no pide ni el numero de CLU ni la TCCM. Lo pone el acceso
 * con Google, o se escribe a mano en el panel. */

export type Perfil = { nombre: string; email: string }
