/*  EL DÍA OPERATIVO
 *
 *  La jornada de monitoreo va de las 08:00 a las 07:00 del día siguiente: una mesa de las 02:00 es del turno del
 *  día ANTERIOR. Hay dos formas de saber qué día es, y cada parte de la app usa la suya:
 *
 *      localOperationalDay   LA ROTACIÓN (Mesas y Registros): la fecha y la hora de WINDOWS, en la zona horaria
 *                            del equipo y sin corregir nada (pedido del usuario, 2026-11-14: «la rotación trabaja
 *                            con la hora del computador donde corre la aplicación»). Cada rotación se queda con
 *                            el día en que nació (tableRecords.js) y se lo manda a la API, que lo guarda tal cual.
 *
 *      operationalDay        LAS NOVEDADES Y LOS BONOS: en America/Caracas y con la hora del servidor
 *                            (serverClock.js), como los cuenta api_jarvis365 (operationalDateOf, en
 *                            dvrFailure.lib.ts). Así «tus novedades de hoy» son las mismas aquí y en la API.
 */
import { serverNow } from './serverClock.js';


// TIME_ZONE = «la zona en la que la API define la jornada de las novedades»
const TIME_ZONE = 'America/Caracas';

// OPENS_AT = «la hora a la que abre la jornada»
const OPENS_AT = 8;

// twoDigits = «un número con dos cifras»: 7 → '07'
const twoDigits = (value) => String(value).padStart(2, '0');


// localOperationalDay = «el día operativo de un instante, con la hora de WINDOWS», como 'AAAA-MM-DD'
// La fecha y la hora que enseña el equipo, en su zona horaria. Antes de las 08:00 de su reloj es el día anterior.
// Recibe: now (un Date; por defecto, ahora).
export function localOperationalDay(now = new Date()) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (now.getHours() < OPENS_AT) day.setDate(day.getDate() - 1);
    return `${day.getFullYear()}-${twoDigits(day.getMonth() + 1)}-${twoDigits(day.getDate())}`;
}


// DAY_KEY = «la forma de un día»: 'AAAA-MM-DD'
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

// isDayKey = «es un día 'AAAA-MM-DD' que existe»: '2026-02-30' tiene la forma, pero no existe
export const isDayKey = (value) => {
    if (typeof value !== 'string' || !DAY_KEY.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
};


// operationalDay = «el día operativo de un instante en Caracas», como 'AAAA-MM-DD': el de las novedades y los bonos
// Recibe: now (un Date; por defecto, ahora con la hora del servidor).
export function operationalDay(now = serverNow()) {

    // parts = «año, mes, día y hora de ese instante en Caracas»
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
            .formatToParts(now)
            .map(part => [part.type, part.value])
    );

    // day = «la medianoche UTC del día civil en Caracas»; antes de las 08:00 la jornada es la de ayer
    const day = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    if (Number(parts.hour) < OPENS_AT) day.setUTCDate(day.getUTCDate() - 1);

    return day.toISOString().slice(0, 10);
}


// atOperationalTime = «el instante de una hora 'HH:MM:SS' de un día operativo», con la hora de WINDOWS
// De las 08:00 en adelante es ese día civil; antes de las 08:00, la madrugada del día siguiente: las 02:00 del
// día operativo '2026-10-16' son las 02:00 del 17. Así, localOperationalDay() del resultado es siempre 'day'.
// Recibe: day ('AAAA-MM-DD') y time ('HH:MM:SS'; sin segundos también vale).
export function atOperationalTime(day, time) {
    const [year, month, date] = String(day).split('-').map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = String(time ?? '').split(':').map(Number);

    const instant = new Date(year, month - 1, date, hours || 0, minutes || 0, seconds || 0, 0);
    if (hours < OPENS_AT) instant.setDate(instant.getDate() + 1);
    return instant;
}


// SHIFT_TIMES = «las horas de los turnos», 'HH:MM': cuándo empieza el diurno, cuándo deja de estar fijo (desde ahí se
// puede pasar al nocturno con el toggle de Mesas; pedido del usuario: desde las 17:00, antes las 17:30), cuándo
// empieza el nocturno fijo y cuándo termina. Las lee también el toggle (ShiftToggle) para explicarlo.
export const SHIFT_TIMES = { dayStarts: '08:00', dayEnds: '17:00', nightStarts: '18:30', nightEnds: '07:00' };

// secondsOfClock = «una hora 'HH:MM' en segundos desde las 00:00»
const secondsOfClock = (clock) => {
    const [hours, minutes] = clock.split(':').map(Number);
    return hours * 3600 + minutes * 60;
};


// shiftOfTime = «el turno que corresponde a una hora 'HH:MM:SS'»: 'day' de las 08:00:00 hasta antes de las 17:00:00,
// 'night' de 18:30:00 a 07:00:00 del día siguiente, y null en los dos cambios de turno —de 07:00 a 08:00 y de 17:00 a
// 18:30—, que se eligen a mano (SHIFT_TIMES). También null si no es una hora.
export function shiftOfTime(time) {
    const [hours, minutes, seconds = 0] = String(time ?? '').split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;

    const value = hours * 3600 + minutes * 60 + (seconds || 0);
    if (value >= secondsOfClock(SHIFT_TIMES.dayStarts) && value < secondsOfClock(SHIFT_TIMES.dayEnds)) return 'day';
    if (value >= secondsOfClock(SHIFT_TIMES.nightStarts) || value <= secondsOfClock(SHIFT_TIMES.nightEnds)) return 'night';
    return null;
}


// operationalDayLabel = «un día operativo dicho con palabras»: '2026-10-11' → 'sábado, 11 de octubre'
export const operationalDayLabel = (day) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });


// localClock = «la hora HH:MM de un instante, con la de WINDOWS»: '14:05', la misma que enseña el reloj del equipo.
// Con getHours y no con un Intl guardado: si alguien cambia la zona horaria con la app abierta, sigue el cambio.
// '' si no es una fecha.
export const localClock = (date) => {
    const instant = new Date(date ?? '');
    return Number.isFinite(instant.getTime()) ? `${twoDigits(instant.getHours())}:${twoDigits(instant.getMinutes())}` : '';
};
