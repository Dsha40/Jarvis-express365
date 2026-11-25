import Fuse from 'fuse.js';
import { PLATOS as PLATOS_FRANCISCA, LOCALES as LOCALES_FRANCISCA } from './catalogos/francisca.js';


/*  ══════════════════════════════════════════════════════════════════════════════════════
 *  DE LOS PLATOS DEL TICKET, LA CATEGORÍA QUE MANDA
 *
 *  El servidor de IA devuelve, por ticket, los platos que ve escritos ('platos'). Aquí:
 *
 *    1. Cada plato leído se busca en el CATÁLOGO del local por parecido (llegan con
 *       erratas). El catálogo dice su categoría: 'entrada', 'plato fuerte', 'postre'
 *       o 'drinks', que son nombres de la carta del local en Client365.
 *    2. Contornos: si el ticket trae algún pollo, pasan a plato fuerte.
 *    3. Manda la categoría con MÁS TIEMPO en la carta: es la que más tarda en salir.
 *       Empate (postre y drinks, los dos 5 min): la del primer plato de la lista, que
 *       es el primero que se confirmó; así la columna no salta entre lecturas.
 *
 *  Se busca contra los PLATOS, nunca contra los nombres de las categorías: «Entraña»
 *  (plato fuerte) se parece demasiado a «entrada».
 *
 *  PURO: no lee nada de fuera. El catálogo hoy está en catalogos/; cuando viva en la API
 *  (docs/tipo-de-plato-servidor.md) solo cambia catalogoDelLocal.
 *  ══════════════════════════════════════════════════════════════════════════════════════ */


// CATALOGOS = «qué catálogo usa cada local», por su _id
const CATALOGOS = new Map(LOCALES_FRANCISCA.map(id => [id, PLATOS_FRANCISCA]));

// SIN_CATALOGO = «el local no tiene catálogo». Siempre la misma lista: una nueva en cada pintado rehace el índice.
const SIN_CATALOGO = [];

// CATEGORIA_CON_POLLO = «la categoría de un contorno que sale con pollo»
const CATEGORIA_CON_POLLO = 'plato fuerte';

// OPCIONES_BUSQUEDA = «cuánto se parece lo leído a un plato». 0.35 aguanta un par de letras cambiadas;
// más alto empareja nombres cortos («Rum», «Gin») con cualquier cosa.
const OPCIONES_BUSQUEDA = { keys: ['clave', 'claveAlias'], threshold: 0.35, ignoreLocation: true };


// normalizar = «el texto listo para comparar»: sin acentos, sin espacios de más, en minúsculas
export const normalizar = (valor) => String(valor ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();


// dicePollo = «el texto leído trae la palabra chicken o pollo» (suelta: no vale dentro de otra palabra)
const dicePollo = (leido) => /\b(chicken|pollo)\b/.test(normalizar(leido));


// catalogoDelLocal =«el catálogo de platos de un local», o [] si no tiene
export const catalogoDelLocal = (localId) => CATALOGOS.get(String(localId ?? '')) ?? SIN_CATALOGO;


/*  crearBuscadorDePlatos = «buscar un plato leído en el catálogo»
 *
 *  Recibe: platos, el catálogo ({ nombre, categoria, alias?, pollo?, contorno? }).
 *  Devuelve: (leido) => el plato del catálogo, o null si no se parece a ninguno.
 *  Se crea una vez por catálogo: montar el índice cuesta. Recuerda lo ya buscado, porque
 *  la IA manda los mismos platos en cada lectura.
 */
export function crearBuscadorDePlatos(platos) {

    const lista = Array.isArray(platos) ? platos.filter(plato => plato?.nombre && plato?.categoria) : [];
    if (lista.length === 0) return () => null;

    // exactos = «cada nombre y alias, normalizado → su plato»: lo escrito igual no pasa por el parecido
    const exactos = new Map();
    for (const plato of lista) {
        for (const nombre of [plato.nombre, ...(plato.alias ?? [])]) {
            const clave = normalizar(nombre);
            if (clave && !exactos.has(clave)) exactos.set(clave, plato);
        }
    }

    const indice = new Fuse(
        lista.map(plato => ({ plato, clave: normalizar(plato.nombre), claveAlias: (plato.alias ?? []).map(normalizar) })),
        OPCIONES_BUSQUEDA
    );

    const vistos = new Map();

    return (leido) => {
        const clave = normalizar(leido);
        if (!clave) return null;
        if (!vistos.has(clave)) vistos.set(clave, exactos.get(clave) ?? indice.search(clave)[0]?.item.plato ?? null);
        return vistos.get(clave);
    };
}


/*  categoriaDelPedido = «la categoría que manda en un ticket»
 *
 *  Recibe: platosLeidos  los nombres que leyó la IA, en el orden en que se confirmaron
 *          buscar        de crearBuscadorDePlatos
 *          segundosDe    (categoria) => cuántos segundos le da la carta, o 0 si no la tiene
 *  Devuelve: { categoria, reconocidos: [{ leido, nombre, categoria }], desconocidos: [leido] }
 *            categoria = '' si no se reconoció ninguno.
 */
export function categoriaDelPedido(platosLeidos, buscar, segundosDe) {

    const reconocidos = [];
    const desconocidos = [];

    for (const leido of Array.isArray(platosLeidos) ? platosLeidos : []) {
        const plato = buscar(leido);

        // Lo que dice «chicken» o «pollo» es un pollo —plato fuerte— aunque no esté en el catálogo o se
        // parezca a otro plato. Salvo que sea un contorno del catálogo (Chicken Tenders).
        if (dicePollo(leido) && plato?.contorno !== true) {
            reconocidos.push({ leido, plato: plato?.pollo ? plato : { nombre: leido, categoria: CATEGORIA_CON_POLLO, pollo: true } });
        } else if (plato) reconocidos.push({ leido, plato });
        else desconocidos.push(leido);
    }

    // conPollo = «el ticket trae algún pollo»: los contornos dejan de ser entrada
    const conPollo = reconocidos.some(({ plato }) => plato.pollo === true);

    const conCategoria = reconocidos.map(({ leido, plato }) => ({
        leido,
        nombre: plato.nombre,
        categoria: plato.contorno === true && conPollo ? CATEGORIA_CON_POLLO : plato.categoria,
    }));

    // La de más tiempo. Con '>' estricto, en un empate se queda la primera de la lista.
    let categoria = '';
    let segundos = -1;
    for (const item of conCategoria) {
        const suyos = segundosDe(item.categoria);
        if (suyos > segundos) { categoria = item.categoria; segundos = suyos; }
    }

    return { categoria, reconocidos: conCategoria, desconocidos };
}
