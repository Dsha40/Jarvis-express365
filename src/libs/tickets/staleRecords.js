/*  LAS ROTACIONES DE UN DÍA OPERATIVO ANTERIOR (pedido del usuario, propuesta «B · Pendientes aparte»)
 *
 *  Una rotación de Mesas que se quedó sin guardar y cuyo día operativo ya pasó (la jornada va de 08:00 a 07:00 del
 *  reloj de Windows, localOperationalDay en operationalDay.js) es una rotación ABANDONADA: no se puede modificar, solo guardar o eliminar. Mesas las sube a
 *  un bloque aparte (RegisterStaleBlock) y la IA ya no les mete pedidos (applyTabletOrders, en tableRecords.js).
 *  Al guardarla, la API la marca con 'abandoned' (de qué día era, cuándo y quién la guardó; rotation.lib.js).
 *
 *  Antes, al recargar, una rotación de más de 16 horas desaparecía sin guardarse; ahora se queda hasta que alguien
 *  decida qué hacer con ella.
 */

import { operationalDay, isDayKey } from '../date_time/operationalDay.js';


// recordDay = «el día operativo de una rotación», 'AAAA-MM-DD', o null si está libre (sin fecha)
// Es el día con que NACIÓ, con la hora de Windows (record.day, que pone tableRecords.js al nacer): se queda fijo, y
// así ningún reloj ni ninguna zona horaria la cambia de día después. Las que nacieron antes de existir el campo
// conservan el día que tenían, el de Caracas (operationalDay): ninguna se mueve de sitio al actualizar.
export const recordDay = (record) => {
    if (isDayKey(record?.day)) return record.day;
    if (!record?.date) return null;
    const date = new Date(record.date);
    return Number.isFinite(date.getTime()) ? operationalDay(date) : null;
};

// isStaleRecord = «la rotación es de un día operativo ANTERIOR a 'today'» ('AAAA-MM-DD', el de Windows:
// localOperationalDay). Los días en ese formato se ordenan como texto.
export const isStaleRecord = (record, today) => {
    const day = recordDay(record);
    return day !== null && day < today;
};

// staleSaveProblem = «por qué no se puede guardar», o '' si se puede: lo mismo que pide el disquete de una fila
// normal (RegisterRecordRow, saveOne). Como la rotación está bloqueada, lo que falte no se puede escribir en ella:
// se trae a hoy para completarla (useStaleRotations, bringOne), o se elimina.
export const staleSaveProblem = (record) => {
    const missing = [
        String(record.tableNumber ?? '').trim() === '' && 'el número de mesa',
        record.takeOut !== true && String(record.hourOccupies ?? '').trim() === '' && 'la hora de Ocupa',
    ].filter(Boolean);

    return missing.length > 0 ? `Le falta ${missing.join(' y ')}: no se puede guardar en su día` : '';
};


// DAY_FORMAT = «cómo se dice un día»: 'jueves 16 de octubre'
const DAY_FORMAT = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// SHORT_DAY_FORMAT = «el día corto», para la píldora de cada fila: '16 oct'
const SHORT_DAY_FORMAT = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// dayText = «un día operativo dicho para leer»: '2026-10-16' → 'viernes 16 de octubre' (sin la coma de Intl)
export const dayText = (day) => DAY_FORMAT.format(new Date(`${day}T00:00:00.000Z`)).replace(',', '');

// shortDayText = «un día operativo corto»: '2026-10-16' → '16 oct'
export const shortDayText = (day) => SHORT_DAY_FORMAT.format(new Date(`${day}T00:00:00.000Z`)).replace('.', '');

// daysBetween = «cuántos días operativos van de 'from' a 'to'» (los dos 'AAAA-MM-DD')
export const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00.000Z`) - new Date(`${from}T00:00:00.000Z`)) / (24 * 3600 * 1000));
