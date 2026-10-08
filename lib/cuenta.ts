/* El perfil del cliente tal como lo guarda AccountContext en
 * localStorage['gunshop:cuenta']. Vive en lib/ (no en app/components/) para
 * que lib/cesta.ts -- que lo copia en la reserva -- no dependa de un
 * componente de React.
 *
 * Solo identidad de contacto: la pagina no vende nada que exija credencial
 * ANMaC, asi que no pide ni el numero de CLU ni la TCCM. Lo pone el acceso
 * con Google, o se escribe a mano en el panel. */

export type Perfil = { nombre: string; email: string }

// Las claves de localStorage con datos de la persona. Vivian copiadas en
// AccountContext, AccountPanel y CartPanel.
export const CUENTA = 'gunshop:cuenta'
export const PEDIDOS = 'gunshop:pedidos'

/* Lo que borra «Borrar mis datos»: el perfil y los resumenes de la cesta, que
 * guardan el nombre del cliente y lo que habia dentro. Antes solo se iba el
 * perfil, y /privacidad prometia que se iba todo (UX-AUDIT.md, tercera pasada,
 * W2). La cesta se queda: son ids y cantidades, y se vacia desde la cesta. */
export function borrarDatos(almacen: Pick<Storage, 'removeItem'>): void {
  almacen.removeItem(CUENTA)
  almacen.removeItem(PEDIDOS)
}
