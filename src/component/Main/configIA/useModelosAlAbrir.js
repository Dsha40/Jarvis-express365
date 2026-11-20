import { useRef } from 'react';


/*  ══════════════════════════════════════════════════════════════════════════════════════
 *  LOS MODELOS, PREGUNTADOS AL ABRIR EL DESPLEGABLE  (pedido del usuario)
 *
 *  El desplegable «Modelo con el que leer» (ConfigIA.jsx) enseñaba la lista que se pidió al
 *  abrir el menú o con «Probar conexión». Si entre medias el servidor cargaba o soltaba un
 *  modelo, la lista seguía siendo la vieja, y sin haberla pedido nunca solo salían las
 *  opciones de siempre: «automático» y el guardado.
 *
 *  Ahora, al ir a elegir, se le pregunta al servidor qué modelos tiene EN ESE MOMENTO:
 *
 *      · CON EL RATÓN    el clic no abre la lista vieja: se pregunta, y al contestar el
 *                        servidor se abre ya con la nueva (showPicker). Si el equipo no sabe
 *                        abrirla sola, queda enfocada y basta otro clic.
 *      · CON EL TECLADO  al llegar con Tab se pregunta por detrás; las flechas eligen sobre
 *                        la lista en cuanto llega.
 *
 *  No se pregunta otra vez si la última respuesta, de ESA dirección, es de hace menos de
 *  FRESCA_MS: abrir y cerrar el desplegable varias veces seguidas no debe acribillar al
 *  servidor. Tampoco sin dirección escrita, ni con una consulta ya en vuelo: ahí el
 *  desplegable se comporta como siempre.
 *
 *  La consulta es la misma de «Probar conexión» (askServer, en silencio): solo habla si falla.
 *
 *  Recibe: { url          la dirección escrita, ya normalizada ('' = ninguna)
 *            checking     hay una consulta en vuelo
 *            askServer }  la consulta de ConfigIA: askServer({ quiet }) → promesa
 *  Devuelve: { selectRef, onMouseDown, onFocus }  para poner tal cual en el <select>
 *  ══════════════════════════════════════════════════════════════════════════════════════ */


// FRESCA_MS = «cuánto vale una lista recién pedida»: dentro de ese rato no se vuelve a preguntar
const FRESCA_MS = 5000;


// siguientePintado = «esperar a que React pinte lo que llegó»: la lista nueva, y el desplegable
// otra vez habilitado (mientras se pregunta va desactivado, y uno desactivado no se abre)
const siguientePintado = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));


function useModelosAlAbrir({ url, checking, askServer }) {

    // selectRef = «el desplegable», para abrirlo cuando llegue la lista
    const selectRef = useRef(null);

    // ultimaRef = «la última vez que se preguntó desde aquí»: { url, at }
    const ultimaRef = useRef({ url: '', at: 0 });


    // hayQuePreguntar = «la lista que hay no vale para esta dirección, o ya es vieja»
    const hayQuePreguntar = () => {
        if (url === '' || checking) return false;

        const { url: deDonde, at } = ultimaRef.current;
        return deDonde !== url || Date.now() - at > FRESCA_MS;
    };


    // preguntar = «pedir la lista al servidor», en silencio, y apuntar cuándo
    const preguntar = async () => {
        ultimaRef.current = { url, at: Date.now() };
        await askServer({ quiet: true });
    };


    // onMouseDown = «clic para abrir»: se para la lista vieja, se pregunta y se abre con la nueva
    const onMouseDown = async (event) => {
        if (!hayQuePreguntar()) return;

        event.preventDefault();
        await preguntar();
        await siguientePintado();

        const select = selectRef.current;
        if (!select || select.disabled) return;

        select.focus();
        try { select.showPicker?.(); }
        catch { /* sin permiso para abrirla sola: queda enfocada, y otro clic la abre */ }
    };


    // onFocus = «llegar con el teclado»: se pregunta por detrás, sin cerrar nada
    const onFocus = () => {
        if (hayQuePreguntar()) void preguntar();
    };


    return { selectRef, onMouseDown, onFocus };
}



export { useModelosAlAbrir };
