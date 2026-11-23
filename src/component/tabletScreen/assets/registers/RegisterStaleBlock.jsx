import RegisterStaleRow from './RegisterStaleRow.jsx';
import LockIcon from './LockIcon.jsx';
import { dayText, shortDayText, staleSaveProblem } from '../../../../libs/tickets/staleRecords.js';


/*  LAS PENDIENTES DE DÍAS ANTERIORES, APARTE (propuesta «B», elegida por el usuario)
 *
 *  Arriba de Mesas, antes de las rotaciones de hoy: un bloque en amarillo pálido con las rotaciones que se quedaron
 *  sin guardar en un día operativo que ya pasó. Su cabecera dice cuántas son, de qué día y que son de solo lectura,
 *  con «Guardar las N» y «Eliminar las N»; cada fila tiene además su papelera y su disquete (RegisterStaleRow).
 *  Debajo, la raya de «Hoy» separa las del turno. Resuelto el bloque, desaparece.
 *
 *  La lógica —cuáles son, guardar, eliminar, preguntar— es de useStaleRotations; esto solo pinta. Su aspecto va
 *  en las clases 'register-stale…' de registers.css.
 */


/*  @param {object}  stale         lo de useStaleRotations: { records, days, today, busy, notice, saveOne, saveAll,
 *                                 deleteOne, deleteAll }
 *  @param {object}  grid          la rejilla de la tabla (tableGrid)
 *  @param {Array}   managers      los botones de los gerentes del local (managers.js): para su columna y para ver la
 *                                 lista de toques de cada fila
 */
export default function RegisterStaleBlock({ stale, grid, managers = [] }) {

    const { records, days, today, busy, notice } = stale;
    const count = records.length;
    if (count === 0) return null;

    const all = count === 1 ? 'la rotación' : `las ${count}`;
    const from = days.length === 1 ? `Del ${dayText(days[0])}` : `De ${days.map(shortDayText).join(', ')}`;

    // unsavable = «cuántas no se pueden guardar en su día» (les falta la mesa o la hora de Ocupa): esas se traen a hoy
    const unsavable = stale.bringOne ? records.filter(record => staleSaveProblem(record)).length : 0;

    return (
        <section className='register-stale' aria-label='Rotaciones de días anteriores sin guardar'>

            <div className='register-stale__head'>
                <span className='register-stale__badge'><LockIcon size={15} /></span>
                <div className='register-stale__text'>
                    <span className='register-stale__title'>{count === 1 ? 'Una rotación' : `${count} rotaciones`} de {days.length === 1 ? 'un día anterior' : 'días anteriores'} sin guardar</span>
                    <span className='register-stale__sub'>
                        {from} · solo lectura: {count === 1 ? 'guárdala o elimínala' : 'guárdalas o elimínalas'}
                        {unsavable > 0 && ` · ${unsavable === 1 ? 'a la que le falta' : `a las ${unsavable} que les falta`} la hora de Ocupa, ${unsavable === 1 ? 'tráela' : 'tráelas'} a hoy (↩) para completarla${unsavable === 1 ? '' : 's'}`}
                    </span>
                    {notice && <span className='register-stale__notice' role='alert'>{notice}</span>}
                </div>
                <button type='button' className='register-stale-key register-stale-key--save' onClick={stale.saveAll} disabled={busy}>
                    {busy ? 'Guardando…' : `Guardar ${all}`}
                </button>
                <button type='button' className='register-stale-key register-stale-key--delete' onClick={stale.deleteAll} disabled={busy}>
                    Eliminar {all}
                </button>
            </div>

            {
                records.map(record => (
                    <RegisterStaleRow
                        key={record.id}
                        record={record}
                        grid={grid}
                        managers={managers}
                        showDay={days.length > 1}
                        busy={busy}
                        onSave={stale.saveOne}
                        onBringToToday={stale.bringOne}
                        onDelete={stale.deleteOne}
                    />
                ))
            }

            <div className='register-stale__today'>
                <span className='register-stale__today-dot' aria-hidden='true' />
                Hoy · {dayText(today)}
            </div>

        </section>
    );
}
