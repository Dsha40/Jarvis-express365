import { useEffect, useState } from 'react';
import { operationalDay } from '../../../libs/date_time/operationalDay.js';
import { onClockOffset } from '../../../libs/date_time/serverClock.js';


/*  EL DÍA OPERATIVO QUE CORRE
 *
 *  'AAAA-MM-DD', y cambia solo a las 08:00 (operationalDay.js): lo que era de hoy pasa a ser de ayer sin recargar
 *  nada. Se mira cada minuto, como la lista de Registros (useSavedRotations): así también se pone al día un equipo
 *  que se despierta de la suspensión. Solo repinta cuando el día cambia de verdad.
 *
 *  Cada uno elige con qué reloj (dayOf):
 *      localOperationalDay   Mesas: la hora de Windows, tal cual (pedido del usuario, 2026-11-14)
 *      operationalDay        las tarjetas de bonos (la de por defecto): Caracas con la hora del servidor, como la API
 *                            cuenta las novedades. Se vuelve a mirar en cuanto el servidor da la hora (onClockOffset).
 *
 *  @param {function} dayOf  (Date) → 'AAAA-MM-DD'. Una función fija (de módulo), no una que se cree en cada pintado.
 */


// CHECK_MS = «cada cuánto se mira si el día cambió»
const CHECK_MS = 60 * 1000;


export default function useOperationalDay(dayOf = operationalDay) {
    const [today, setToday] = useState(() => dayOf());

    useEffect(() => {
        const check = () => setToday(dayOf());
        const timer = setInterval(check, CHECK_MS);
        const stopListening = onClockOffset(check);
        check();
        return () => {
            clearInterval(timer);
            stopListening();
        };
    }, [dayOf]);

    return today;
}
