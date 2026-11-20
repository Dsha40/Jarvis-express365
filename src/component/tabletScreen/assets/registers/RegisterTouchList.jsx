import RegisterTouchManual from './RegisterTouchManual.jsx';
import RegisterTouchTable from './RegisterTouchTable.jsx';
import LockIcon from './LockIcon.jsx';


/*  LOS TOQUES DE GERENTE DE UNA ROTACIÓN, FLOTANDO DEBAJO DE SU FILA
 *
 *  La propuesta «B · Por gerente, con subtotales», elegida por el usuario: arriba la mesa y cuántos toques
 *  lleva, con su botón de cerrar; debajo la tabla de los toques, con Inicio, Fin y lo que duró cada uno,
 *  agrupados por gerente y con el total de la mesa al pie. La tabla es RegisterTouchTable: la misma que en la
 *  pestaña Registros.
 *
 *  Va 'absolute', pegado a la derecha y justo debajo de la fila: flota encima de las de abajo sin
 *  empujarlas. 'z-[5]' lo pone encima de ellas pero debajo de la cabecera fija (z-10). Su aspecto va en las
 *  clases 'register-touch-…' de registers.css; 'register-process-card' es la que lo libra de las reglas de
 *  las celdas de la fila, de la que es hijo.
 *
 *  LA PRIMERA FILA ES EL MODO MANUAL (pedido del usuario, RegisterTouchManual): una fila en blanco para
 *  apuntar un toque escribiendo sus horas, con el botón «Crear». Solo sale si se puede apuntar ('onCreate'):
 *  un pedido para llevar no lleva toques.
 *
 *  DE SOLO LECTURA ('readOnly'): la de una rotación de un día anterior (RegisterStaleRow), que se mira pero no se
 *  toca (pedido del usuario). La cabecera lo dice con el candado, y no se corrige, ni se borra, ni se apunta nada,
 *  aunque lleguen las funciones.
 */


/*  @param {string}   tableNumber  la mesa de la rotación
 *  @param {Array}    touches      sus toques: [{ id, ref, name, hourTouch, hourTouchFinish }]
 *  @param {Array}    managers     los botones de los gerentes (managers.js): de ellos salen el orden, la placa y el nombre
 *  @param {function} onWrite      corrige una hora de un toque (id del toque, 'hourTouch' o 'hourTouchFinish', hora)
 *  @param {function} onDelete     borra un toque (id del toque)
 *  @param {function} onClose      cierra la lista
 *  @param {function} onCreate     opcional. Apunta un toque escrito a mano: (gerente, { hourTouch, hourTouchFinish }).
 *                                 Sin él no sale la fila manual.
 *  @param {string}   establishmentId  el _id del local: de quién es el gerente por defecto de la fila manual
 *  @param {boolean}  readOnly     opcional. Solo para mirar: sin corregir, borrar ni apuntar
 */
export default function RegisterTouchList({ tableNumber, touches, managers, onWrite, onDelete, onClose, onCreate, establishmentId, readOnly = false }) {
    return (
        <div className='register-process-card register-touch-card absolute right-0 top-full z-[5]' role='dialog' aria-label={`Toques de gerente de la mesa ${tableNumber}${readOnly ? ', solo lectura' : ''}`}>

            <div className='register-touch-card__head'>
                <span className='register-touch-card__title'>Mesa {tableNumber}</span>
                <span className='register-touch-card__count'>{touches.length} {touches.length === 1 ? 'toque' : 'toques'}</span>
                {readOnly && (
                    <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-jx-aviso-texto'>
                        <LockIcon size={11} />
                        Solo lectura
                    </span>
                )}
                <button type='button' className='register-touch-delete register-touch-close' onClick={onClose} aria-label='Cerrar la lista de toques' title='Cerrar'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' aria-hidden='true'>
                        <path d='M6 6l12 12' />
                        <path d='M18 6 6 18' />
                    </svg>
                </button>
            </div>

            <RegisterTouchTable
                touches={touches}
                managers={managers}
                onWrite={readOnly ? undefined : onWrite}
                onDelete={readOnly ? undefined : onDelete}
                emptyText={readOnly ? 'Esta rotación no tiene toques de gerente' : undefined}
            >
                {/*  La primera fila: apuntar un toque a mano  */}
                {!readOnly && onCreate && managers.length > 0 && <RegisterTouchManual managers={managers} onCreate={onCreate} establishmentId={establishmentId} />}
            </RegisterTouchTable>

        </div>
    );
}
