/*  ══════════════════════════════════════════════════════════════════════════════════════
 *  MESAS EN VIVO: LO QUE SE SUBE A LA API MIENTRAS SE TRABAJA
 *
 *  Cada rotación de Mesas se sube a la API ABIERTA (status 'open') en cuanto tiene mesa, y otra vez con cada
 *  cambio: PUT /rotation/client=<su id>. El disquete la CIERRA ('closed'): desde ahí es de Registros. Los demás
 *  equipos del local —otra Mesas, las verificaciones de Client365— la ven por el socket, con quién la creó y quién
 *  hizo el último cambio.
 *
 *  ES OPTIMISTA. Lo que se escribe se ve y se guarda en el equipo al momento (tableRecords.js), y la subida va
 *  detrás, por una COLA que también se guarda en el equipo (la «outbox»): sin internet se sigue trabajando igual,
 *  la cola crece, y al volver la conexión se vacía sola. Por cada rotación la cola guarda solo lo ÚLTIMO que hay
 *  que hacer con ella —subirla así, cerrarla así, o quitarla—: lo de en medio ya no importa.
 *
 *      outbox = { [id de la rotación]: { kind: 'upsert', body, at } | { kind: 'remove', at } }
 *               at = cuándo entró, en milisegundos: con él se sabe si lo que se acaba de subir sigue siendo lo último
 *
 *  LA MÁS NUEVA GANA, PERO SE JUNTA. Cada subida lleva cuándo cambió en el equipo (clientUpdatedAt) y la API se queda
 *  con la más nueva: una subida atrasada no pisa una posterior. Cada subida va después de la última versión que se
 *  sabe de esa rotación (stampAfter), aunque el reloj de este equipo vaya detrás del de otro. Lo que llega de otro
 *  equipo se JUNTA campo a campo con lo de aquí (mergeRemote): lo que aquí se cambió y no se ha subido se queda, y lo
 *  que cambió allí entra. Un eco más viejo que lo que ya se sabe no se mira.
 *
 *  Para no subir dos veces lo mismo, se recuerda la FIRMA de lo último que se subió o llegó de cada rotación
 *  (syncSignature): solo se sube la que cambió de verdad, no la que solo se desplegó.
 *
 *  Todo es puro salvo readOutbox y writeOutbox, que usan el almacenamiento del navegador. La vuelta con la API y el
 *  socket la hace hook/useRotationSync.jsx.
 *  ══════════════════════════════════════════════════════════════════════════════════════ */

import { createRecord, createProcess, isBlankRecord, isBlankProcess, OPEN_LISTS, RECORD_TIMES, PROCESS_FIELDS, TABLET_FIELDS, SHIFTS } from './tableRecords.js';
import { DELAY_FIELDS, WARNING_FIELDS, PROCESS_DELAY_FIELDS, isObjectId } from './reportedDelay.js';
import { recordDay } from './staleRecords.js';
import { localClock, localOperationalDay, isDayKey } from '../date_time/operationalDay.js';


// LOCAL_ONLY = «lo de una rotación que no viaja»: las listas desplegadas, que son de quien mira, y su fila en la tabla
const LOCAL_ONLY = [...OPEN_LISTS, 'row'];

// UNSIGNED = «lo que viaja pero no es un cambio»: el día de la rotación. Se pone al nacer y no cambia (tableRecords.js),
// así que no hace falta subirlo por sí solo. Y una API todavía sin desplegar devuelve el día calculado con la hora de
// Caracas: si contara en la firma, cada eco suyo parecería un cambio y la rotación subiría y bajaría sin parar.
const UNSIGNED = ['day'];

// NOVELTY_FIELDS = «los campos de la rotación que apuntan a una novedad»: sus demoras y sus avisos
const NOVELTY_FIELDS = [...Object.values(DELAY_FIELDS), ...Object.values(WARNING_FIELDS)];

// OUTBOX_PREFIX = «la llave de la cola en el equipo»: una por local, como las mesas ('mesas:<_id>')
const OUTBOX_PREFIX = 'mesas-sync';

// isTicketTable = «la mesa es un '#ticket'»: un pedido para llevar (la regla de tableRecords.js y de la API)
const isTicketTable = (tableNumber) => String(tableNumber ?? '').trim().startsWith('#');


// isSyncable = «la rotación ya se sube»: nació (tiene fecha), tiene algo y tiene mesa, que la API exige.
// Una fila en la que se escribió una hora antes que la mesa se queda en el equipo hasta tener mesa.
export const isSyncable = (record) => Boolean(record?.date) && !isBlankRecord(record) && String(record.tableNumber ?? '').trim() !== '';


// shareable = «la rotación sin lo que no viaja»: sin las listas desplegadas, sin su fila y sin procesos en blanco. Sin
// su día tampoco (UNSIGNED): toSyncBody lo añade aparte.
function shareable(record) {
    const copy = { ...record, process: record.process.filter(process => !isBlankProcess(process)) };
    for (const field of [...LOCAL_ONLY, ...UNSIGNED]) delete copy[field];
    return copy;
}

// dayOfServer = «el día de una rotación que llega de la API», 'AAAA-MM-DD': el `day` de un cuerpo de la cola, o el
// operationalDate que guardó la API (la medianoche UTC de ese día). null si no trae ninguno.
const dayOfServer = (rotation) => {
    if (isDayKey(rotation?.day)) return rotation.day;
    const day = String(rotation?.operationalDate ?? '').slice(0, 10);
    return isDayKey(day) ? day : null;
};


// syncSignature = «la firma de una rotación»: la misma si no cambió nada que se suba. Desplegar o plegar una lista
// no la cambia.
export const syncSignature = (record) => JSON.stringify(shareable(record));


// toSyncBody = «el cuerpo de PUT /rotation/client=<id>»: la rotación entera, con su local, su estado ('open' o
// 'closed') y cuándo cambió en el equipo (changedAt, en milisegundos). Procesos y toques llevan su id como
// `clientId`, para que vuelvan tal cual al cargarlos desde la API. Lo que la API no tiene en su esquema lo descarta.
// Lleva también los dos días con la hora de Windows: el de la rotación (`day`, el de su nacimiento) y el de cuando
// cambió (`today`). La API la guarda en ESE día, sin recalcularlo con la hora de Caracas, y la marca de abandonada
// sale de comparar los dos (una cerrada después de su día).
export function toSyncBody(record, establishmentId, status, changedAt) {
    const data = shareable(record);
    return {
        ...data,
        date: new Date(record.date).toISOString(),
        day: recordDay(record),
        today: localOperationalDay(new Date(changedAt)),
        establishment: establishmentId,
        clientId: record.id,
        status,
        clientUpdatedAt: new Date(changedAt).toISOString(),
        process: data.process.map(process => ({ ...process, clientId: process.id })),
        touch: record.touch.map(touch => ({ ...touch, clientId: touch.id })),
    };
}


// fromServerRotation = «una rotación de la API (o un cuerpo de la cola), otra vez como rotación de Mesas»
// Su id es su clientId, y el de sus procesos y toques, el suyo (uno nuevo si no lo trae: las de antes de existir).
// No se fía de lo que llega: cada campo se rellena aunque falte, como al leerlas del equipo (reviveRecord).
export function fromServerRotation(rotation) {
    const record = createRecord({
        id: String(rotation.clientId),
        date: new Date(rotation.date),
        day: dayOfServer(rotation),
        tableNumber: String(rotation.tableNumber ?? ''),
        shift: SHIFTS.includes(rotation.shift) ? rotation.shift : null,
    });

    record.takeOut = isTicketTable(record.tableNumber);
    for (const field of RECORD_TIMES) record[field] = String(rotation[field] ?? '');
    for (const field of NOVELTY_FIELDS) record[field] = isObjectId(rotation[field]) ? String(rotation[field]) : null;

    record.process = (Array.isArray(rotation.process) ? rotation.process : []).map(process => {
        const fields = Object.fromEntries(PROCESS_FIELDS.map(field => [field, String(process?.[field] ?? '')]));
        const delays = Object.fromEntries(Object.values(PROCESS_DELAY_FIELDS).map(field => [field, isObjectId(process?.[field]) ? String(process[field]) : null]));
        return createProcess({
            ...fields,
            ...delays,
            ...(process?.clientId ? { id: String(process.clientId) } : {}),
            key: String(process?.key ?? ''),
            edited: Array.isArray(process?.edited) ? process.edited.filter(field => TABLET_FIELDS.includes(field)) : [],
        });
    });

    record.touch = (Array.isArray(rotation.touch) ? rotation.touch : []).map(touch => ({
        id: touch?.clientId ? String(touch.clientId) : crypto.randomUUID(),
        ref: touch?.ref ? String(touch.ref) : null,
        name: String(touch?.name ?? ''),
        hourTouch: String(touch?.hourTouch ?? ''),
        hourTouchFinish: String(touch?.hourTouchFinish ?? ''),
        createdAt: touch?.createdAt ? new Date(touch.createdAt).toISOString() : null,
    }));

    return record;
}


// placeRemote = «poner en Mesas una rotación que llega de la API»: en su sitio si ya está (con las listas como las
// tenía quien mira, y con el día con que nació aquí: ese no lo cambia nadie), o en la primera fila en blanco después
// de las que se usan, o al final.
export function placeRemote(records, incoming) {
    const index = records.findIndex(record => record.id === incoming.id);
    if (index !== -1) {
        const current = records[index];
        const merged = { ...incoming, day: current.day ?? incoming.day, processesOpen: current.processesOpen === true, touchesOpen: current.touchesOpen === true };
        return records.map((record, position) => (position === index ? merged : record));
    }

    const lastUsed = records.findLastIndex(record => !isBlankRecord(record));
    const slot = records.findIndex((record, position) => position > lastUsed && isBlankRecord(record));
    if (slot === -1) return [...records, incoming];
    return records.map((record, position) => (position === slot ? incoming : record));
}


// clearRemote = «quitar de Mesas una rotación»: queda en blanco en su sitio, como al guardarla. La MISMA lista si no está.
export function clearRemote(records, recordId) {
    if (!records.some(record => record.id === recordId)) return records;
    return records.map(record => (record.id === recordId ? createRecord() : record));
}



//  ── LA COLA ───────────────────────────────────────────────────────────────────────────

// isClosing = «la entrada de la cola cierra la rotación» (el disquete)
export const isClosing = (entry) => entry?.kind === 'upsert' && entry.body?.status === 'closed';

// queueUpsert / queueRemove = «apuntar en la cola lo último que hay que hacer con una rotación»
export const queueUpsert = (outbox, body, at) => ({ ...outbox, [body.clientId]: { kind: 'upsert', body, at } });
export const queueRemove = (outbox, recordId, at) => ({ ...outbox, [recordId]: { kind: 'remove', at } });

// settle = «quitar de la cola lo que se acaba de subir», solo si sigue siendo lo último: si mientras subía entró algo
// más nuevo de esa rotación, se queda para la siguiente vuelta. La MISMA cola si no hay nada que quitar.
export function settle(outbox, recordId, at) {
    if (outbox[recordId]?.at !== at) return outbox;
    const rest = { ...outbox };
    delete rest[recordId];
    return rest;
}


//  ── LA HORA DE CADA SUBIDA ─────────────────────────────────────────────────────────────
//  La API se queda con la subida más nueva según clientUpdatedAt, que pone el reloj de CADA equipo. Si otro equipo del
//  local va adelantado, todo lo de este llegaría «atrasado» ('stale') y se perdería. Por eso cada subida lleva una hora
//  posterior a la última que se sabe de esa rotación en la API (su «suelo»), aunque el reloj de aquí vaya detrás.

// stampOf = «cuándo cambió una rotación de la API», en milisegundos (su clientUpdatedAt); -Infinity si no lo trae
export const stampOf = (rotation) => {
    const time = new Date(rotation?.clientUpdatedAt ?? NaN).getTime();
    return Number.isFinite(time) ? time : -Infinity;
};

// stampAfter = «la hora de una subida»: ahora, o justo después del suelo de esa rotación si el reloj de aquí va detrás
export const stampAfter = (now, floor) => (Number.isFinite(floor) && floor >= now ? floor + 1 : now);


//  ── JUNTAR LO QUE LLEGA CON LO DE AQUÍ ─────────────────────────────────────────────────
//  Pedido del usuario: «cuando quiero establecer el tiempo en Desocupa o Limpieza se borra a los segundos». Pasaba
//  con dos Mesas del mismo local abiertas (dos equipos, o dos ventanas): la API reemplaza la rotación ENTERA con cada
//  subida, así que la otra, que no tenía la hora recién escrita, la borraba al subir lo suyo (la tablet sube cada
//  pocos segundos), y su eco la borraba también aquí. Ahora lo que llega se junta CAMPO A CAMPO contra lo último
//  acordado con la API (la «base»): de cada campo vale el de aquí si aquí cambió desde entonces, y si no, el que llega.

// sameValue = «dos valores iguales, como viajan»
const sameValue = (one, other) => JSON.stringify(one ?? null) === JSON.stringify(other ?? null);

// mergeFields = «juntar dos versiones de un objeto contra su base»: de cada campo, el de aquí si cambió desde la base
const mergeFields = (base, local, incoming) => {
    const merged = { ...incoming };
    for (const key of new Set([...Object.keys(local), ...Object.keys(incoming)])) {
        if (!sameValue(local[key], base[key])) merged[key] = local[key];
    }
    return merged;
};

// mergeList = «juntar dos versiones de una lista con id (procesos, toques) contra su base», en el orden de aquí:
//      · en las dos              → campo a campo (mergeFields)
//      · añadido aquí            → se queda;            añadido allí → entra, al final
//      · quitado aquí            → fuera (aunque allí lo hayan tocado: la tablet lo resucitaría a cada lectura)
//      · quitado allí            → fuera, salvo que aquí se haya cambiado: lo corregido aquí no se pierde
export function mergeList(base = [], local = [], incoming = []) {
    const baseOf = new Map(base.map(item => [item.id, item]));
    const incomingOf = new Map(incoming.map(item => [item.id, item]));
    const localIds = new Set(local.map(item => item.id));

    const merged = [];
    for (const item of local) {
        const before = baseOf.get(item.id);
        const remote = incomingOf.get(item.id);
        if (remote) merged.push(before ? mergeFields(before, item, remote) : item);
        else if (!before || !sameValue(item, before)) merged.push(item);
    }
    for (const item of incoming) {
        if (!localIds.has(item.id) && !baseOf.has(item.id)) merged.push(item);
    }
    return merged;
}

// LIST_FIELDS = «los campos de una rotación que son listas con id»: se juntan elemento a elemento
const LIST_FIELDS = ['process', 'touch'];

// mergeRemote = «la rotación que queda al juntar lo que llega de la API con lo de aquí»
//      base      lo último acordado con la API (lo último que subió bien o que llegó), como rotación de Mesas; null si
//                no se sabe (recién abierto, con algo en la cola de antes): entonces vale lo que llega
//      local     la de Mesas, ahora (undefined si aquí no está)
//      incoming  la que llega, como rotación de Mesas (fromServerRotation)
// Lo que no viaja (las listas desplegadas, el día) lo pone placeRemote desde la de aquí.
export function mergeRemote(base, local, incoming) {
    if (!base || !local) return incoming;

    const merged = { ...incoming };
    const keys = new Set([...Object.keys(shareable(local)), ...Object.keys(shareable(incoming))]);
    for (const key of keys) {
        if (key === 'id') continue;
        if (LIST_FIELDS.includes(key)) merged[key] = mergeList(base[key], local[key], incoming[key]);
        else if (!sameValue(local[key], base[key])) merged[key] = local[key];
    }
    return merged;
}


/*  planChanges = «lo que hay que subir después de un cambio en Mesas»
 *
 *  Recibe: records (las rotaciones, como quedaron), known (Map id → firma de lo último subido o llegado),
 *  outbox (la cola), establishmentId, now (milisegundos) y floors (Map id → la hora de la última versión que se
 *  sabe de cada rotación en la API: cada subida va después, stampAfter).
 *  Devuelve: { outbox, known }, los dos nuevos; la MISMA cola si no hay nada que subir.
 *
 *      · una rotación que se sube y cambió de firma   → subirla abierta, así
 *      · una que se subía y ya no está, o quedó en blanco (se eliminó o se limpió sin guardar) → quitarla
 *      · una que se está cerrando (el disquete) no se quita: su cierre ya está en la cola
 *      · una que se quedó sin mesa un momento (se está corrigiendo) no se toca: vale la última subida
 */
export function planChanges(records, known, outbox, establishmentId, now, floors = new Map()) {
    let nextOutbox = outbox;
    const nextKnown = new Map(known);

    // present = «las que se suben ahora»
    const present = new Set();
    for (const record of records) {
        if (!isSyncable(record)) continue;
        present.add(record.id);

        const signature = syncSignature(record);
        if (nextKnown.get(record.id) === signature) continue;

        nextKnown.set(record.id, signature);
        const at = stampAfter(now, floors.get(record.id));
        nextOutbox = queueUpsert(nextOutbox, toSyncBody(record, establishmentId, 'open', at), at);
    }

    // tracked = «las que se subían»: las conocidas y las que esperan en la cola su primera subida
    const tracked = new Set([...nextKnown.keys(), ...Object.keys(nextOutbox).filter(recordId => nextOutbox[recordId].kind === 'upsert')]);
    for (const recordId of tracked) {
        if (present.has(recordId)) continue;

        const record = records.find(item => item.id === recordId);
        if (record && !isBlankRecord(record)) continue;

        nextKnown.delete(recordId);
        if (!isClosing(nextOutbox[recordId])) nextOutbox = queueRemove(nextOutbox, recordId, now);
    }

    return { outbox: nextOutbox, known: nextKnown };
}


/*  remoteAction = «qué hacer con una rotación que llega de la API» (por el socket o al cargar)
 *
 *      'drop'    se guardó (aquí o en otro equipo): sale de Mesas
 *      'ignore'  es más vieja que la última que se sabe de ella (un eco que llegó tarde), es lo mismo que ya hay, o
 *                aquí hay cambios sin subir y no se sabe contra qué juntarlos (sin base: mandan los de aquí)
 *      'adopt'   entra en Mesas, JUNTÁNDOSE con lo de aquí (mergeRemote): es nueva aquí, o cambió en otro equipo.
 *                También con cambios sin subir, si hay base: así se guarda lo de los dos.
 *
 *  floor = la hora de la última versión que se sabe de esa rotación (stampOf); hasBase = se sabe lo último acordado.
 */
export function remoteAction({ local, entry, rotation, floor = -Infinity, hasBase = false }) {
    if (rotation?.status === 'closed') return 'drop';
    if (stampOf(rotation) < floor) return 'ignore';
    if (entry && !hasBase) return 'ignore';
    if (!local) return 'adopt';
    return syncSignature(local) === syncSignature(fromServerRotation(rotation)) ? 'ignore' : 'adopt';
}



//  ── QUIÉN LA CREÓ Y QUIÉN LA CAMBIA ───────────────────────────────────────────────────

// personName = «el nombre de una persona poblada por la API» ({ name, surName }), o ''
export const personName = (person) => [person?.name, person?.surName].filter(Boolean).join(' ');

// authorshipOf = «quién creó una rotación de la API y quién hizo su último cambio, y cuándo»
export const authorshipOf = (rotation) => ({
    createdBy: personName(rotation?.createdBy),
    updatedBy: personName(rotation?.updatedBy),
    changedAt: rotation?.clientUpdatedAt ?? rotation?.updatedAt ?? null,
});

// authorshipTitle = «el title de la fila»: 'Creó Ana Pérez · último cambio de Luis Rojas a las 14:05'
// Recibe lo de authorshipOf (o null) y si la rotación espera en la cola (pending). Sin nada que decir, ''.
export function authorshipTitle(authorship, pending = false) {
    const parts = [];
    if (authorship?.createdBy) parts.push(`Creó ${authorship.createdBy}`);
    if (authorship?.updatedBy) {
        const time = authorship.changedAt ? localClock(authorship.changedAt) : '';
        parts.push(`último cambio de ${authorship.updatedBy}${time ? ` a las ${time}` : ''}`);
    }
    if (pending) parts.push(parts.length > 0 ? 'con cambios sin subir todavía' : 'Todavía sin subir al servidor');
    return parts.join(' · ');
}



//  ── LA COLA EN EL EQUIPO ──────────────────────────────────────────────────────────────

// outboxKey = «la llave de la cola de un local». Sin local no hay llave.
const outboxKey = (localId) => (localId ? `${OUTBOX_PREFIX}:${localId}` : '');

// readOutbox = «la cola guardada de un local». NUNCA lanza: sin nada, o con el almacenamiento bloqueado, una vacía.
export function readOutbox(localId) {
    const key = outboxKey(localId);
    if (!key) return {};
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    }
    catch {
        return {};
    }
}

// writeOutbox = «guardar la cola de un local». NUNCA lanza: si el almacenamiento falla, devuelve false.
export function writeOutbox(localId, outbox) {
    const key = outboxKey(localId);
    if (!key) return false;
    try {
        if (Object.keys(outbox).length === 0) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(outbox));
        return true;
    }
    catch {
        return false;
    }
}
