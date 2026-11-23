import { useState } from 'react';
import { WrapperCell, WrapperText } from '../../../cells/GridCells.jsx';
import { getTimeReport } from '../../../../libs/date_time/calculate_time.js';
import { recordDay, dayText, shortDayText, staleSaveProblem } from '../../../../libs/tickets/staleRecords.js';
import LockIcon from './LockIcon.jsx';
import TouchToggle from './TouchToggle.jsx';
import RegisterTouchList from './RegisterTouchList.jsx';


/*  UNA ROTACIÓN DE OTRO DÍA, EN EL BLOQUE DE PENDIENTES (RegisterStaleBlock)
 *
 *  Las mismas columnas que una fila de Mesas, pero de solo lectura: las horas sin reloj ni ✕ y sin doble clic
 *  (WrapperText sin 'updateValue'), la mesa sin campo, sin gerentes ni procesos que tocar. En amarillo pálido, como
 *  el bloque. Solo dos teclas, en los sitios de siempre: la papelera en el del «+» y el disquete, amarillo, en el
 *  suyo. En la celda de los gerentes, el candado de «Solo lectura».
 *
 *  SUS TOQUES SE PUEDEN VER (pedido del usuario): a la derecha de esa celda, la misma tecla de la mano que en Mesas
 *  (TouchToggle) abre la misma lista flotante (RegisterTouchList), pero sin poder corregir, borrar ni apuntar nada.
 *  Si está abierta o no es cosa de quien mira: se queda en la fila y no toca la rotación, que sigue bloqueada.
 *
 *  Su aspecto va en las clases 'register-stale-…' de registers.css.
 */


// duration = «una duración de la rotación», o '—' si le falta una de sus dos horas
const duration = (start, end) => (start && end ? getTimeReport(start, end).timeTotal : '—');


/*  @param {object}   record        la rotación
 *  @param {object}   grid          la rejilla de la tabla (tableGrid), para que cuadre con sus columnas
 *  @param {Array}    managers      los botones de los gerentes del local (managers.js): sin ninguno no hay columna
 *                                  de gerentes; con ellos, la lista de toques los ordena y les pone su placa
 *  @param {boolean}  showDay       el bloque tiene rotaciones de varios días: cada una dice el suyo
 *  @param {boolean}  busy          se está guardando: las teclas se quedan quietas
 *  @param {function} onSave        guardarla
 *  @param {function} onBringToToday  traerla a hoy, para completarla: solo la que no se puede guardar (le falta la
 *                                  mesa o la hora de Ocupa). Va en el sitio del disquete, que en ella no sirve
 *  @param {function} onDelete      eliminarla
 */
export default function RegisterStaleRow({ record, grid, managers = [], showDay, busy, onSave, onBringToToday, onDelete }) {

    // touchesOpen = «su lista de toques está desplegada»: solo para mirarla
    const [touchesOpen, setTouchesOpen] = useState(false);

    const hasManagers = managers.length > 0;
    const takeOut = record.takeOut === true;
    const problem = staleSaveProblem(record);
    const day = recordDay(record);
    const table = record.tableNumber || 'sin número';

    // times = «las seis celdas de la mesa», en el orden de las columnas
    const times = takeOut
        ? ['—', '—', '—', '—', '—', '—']
        : [
            record.hourOccupies,
            record.hourFirstAttention,
            duration(record.hourOccupies, record.hourFirstAttention),
            record.breakUp,
            record.tableCleaning,
            duration(record.breakUp, record.tableCleaning),
        ];

    return (
        <div className='register-stale-row relative' style={grid} title={`Rotación del ${day ? dayText(day) : 'otro día'}: ${problem && onBringToToday ? 'le falta algo para guardarla; tráela a hoy para completarla, o elimínala' : 'no se puede modificar, solo guardar o eliminar'}`}>

            {/*  La papelera, en el sitio del «+»  */}
            <WrapperCell classStyles='register-stale-row__cell cursor-default'>
                <button type='button' className='register-stale-icon register-stale-icon--delete' onClick={() => onDelete(record)} disabled={busy} aria-label={`Eliminar la rotación de la mesa ${table}`} title='Eliminar esta rotación, sin guardarla'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                        <path d='M3 6h18' />
                        <path d='M8 6V4h8v2' />
                        <path d='M6 6l1 14h10l1-14' />
                    </svg>
                </button>
            </WrapperCell>

            <WrapperCell classStyles='register-stale-row__cell register-stale-row__table gap-1.5'>
                <span>{record.tableNumber || '-'}</span>
                {showDay && day && <span className='register-stale-day'>{shortDayText(day)}</span>}
            </WrapperCell>

            {
                times.map((value, index) => (
                    <WrapperCell key={index} classStyles='register-stale-row__cell'>
                        <WrapperText value={value ?? ''} />
                    </WrapperCell>
                ))
            }

            {
                hasManagers && (
                    <WrapperCell classStyles='register-stale-row__cell register-stale-row__lock cursor-default gap-1.5 pr-2' titulo={`Solo lectura · ${record.touch.length === 0 ? 'sin toques de gerente' : `${record.touch.length} ${record.touch.length === 1 ? 'toque' : 'toques'} de gerente`}`}>
                        <span className='flex-1 min-w-0 inline-flex items-center justify-center gap-1.5'>
                            <LockIcon />
                            <span>Solo lectura</span>
                        </span>

                        {/*  La tecla de la lista de toques, en el mismo sitio que en Mesas: abre la lista para verla.
                             Se abre siempre, también sin toques: así se ve que no tiene ninguno (pedido del usuario).  */}
                        <span aria-hidden='true' className='shrink-0 w-px h-[18px] mx-0.5 bg-jx-regla2' />
                        <TouchToggle count={record.touch.length} open={touchesOpen} readOnly onToggle={() => setTouchesOpen(current => !current)} />
                    </WrapperCell>
                )
            }

            {/*  El disquete, amarillo: guardarla como abandonada. La que no se puede guardar (le falta la mesa o la hora
                 de Ocupa) lleva en su sitio «Traer a hoy»: así no queda solo eliminarla y perder lo que tiene.  */}
            <WrapperCell classStyles='register-stale-row__cell cursor-default'>
                {
                    problem && onBringToToday ? (
                        <button type='button' className='register-stale-icon register-stale-icon--save' onClick={() => onBringToToday(record)} disabled={busy} aria-label={`Traer a hoy la rotación de la mesa ${table}, para completarla`} title={`${problem}. Tráela a hoy para completarla y guardarla`}>
                            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                <path d='M9 10 4 15l5 5' />
                                <path d='M20 4v7a4 4 0 0 1-4 4H4' />
                            </svg>
                        </button>
                    ) : (
                        <button type='button' className='register-stale-icon register-stale-icon--save' onClick={() => onSave(record)} disabled={busy || Boolean(problem)} aria-label={`Guardar la rotación de la mesa ${table}`} title={problem || 'Guardar en Registros de su día, marcada como abandonada'}>
                            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                <path d='M5 3h11l3 3v15H5z' />
                                <path d='M8 3v5h7V3' />
                                <path d='M8 21v-6h8v6' />
                            </svg>
                        </button>
                    )
                }
            </WrapperCell>

            {/*  Sus toques de gerente, flotando debajo de la fila como en Mesas, pero de SOLO LECTURA: sin onWrite,
                 onDelete ni onCreate no se corrige, no se borra ni se apunta nada  */}
            {
                touchesOpen && hasManagers && (
                    <RegisterTouchList
                        tableNumber={record.tableNumber}
                        touches={record.touch}
                        managers={managers}
                        readOnly
                        onClose={() => setTouchesOpen(false)}
                    />
                )
            }

        </div>
    );
}
