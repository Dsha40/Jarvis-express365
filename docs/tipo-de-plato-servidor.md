# Tipo de plato automático: lo que necesita el servidor

**Para:** quien mantiene el servidor de lectura de tickets (IA/OCR) y `api_jarvis365`.
**De:** Jarvis-express365 (la app del operador), rama `fix/tickets`.

## Qué se quiere lograr

En Mesas, cada pedido lleva un **tipo de plato** (entrada, plato fuerte, postre, drinks), y de él sale el tiempo
máximo de preparación (en Francisca: 6, 15, 5 y 5 min). Hoy el operador lo elige a mano.

La app ya sabe calcularlo sola **si conoce los platos del ticket**: busca cada plato en un catálogo, y el pedido
toma la categoría que más tarda. Por ejemplo, Tostones + 1/2 Chicken da **plato fuerte**. Lo único que falta es que
el servidor diga qué platos hay en cada ticket.

Hay dos partes. **La 1 es la que hace falta ya**; la 2 puede esperar.

---

## Parte 1 (urgente): la lectura devuelve los platos de cada ticket

**Dónde:** la respuesta de `POST /api/v1/chat` del servidor de lectura (`https://72.68.60.141:1234/tickets/v1`).
La app manda la imagen como siempre: no cambia nada de la petición.

**Qué cambia:** cada objeto del array lleva una clave nueva, **`platos`**: un array de textos con los productos de
esa tarjeta.

Hoy:

```json
[{"ticket":"318","mesa":"27","tiempo":"4:15","tipo":"Entree","listo":false}]
```

Con el cambio:

```json
[{"ticket":"318","mesa":"27","tiempo":"4:15","tipo":"Entree","listo":false,
  "platos":["1/2 Chicken","Tostones","Mojito"]}]
```

### Reglas para `platos`

1. **Un texto por producto**, con el nombre tal como se ve en la tarjeta. No hace falta corregirlo ni traducirlo:
   la app lo busca por parecido y aguanta erratas.
2. **Sin la cantidad.** Si la tarjeta dice `2 Tequeños`, va `"Tequeños"`. (Si se cuela un `2` o `2x` delante, la
   app lo quita igual.)
3. **Sin modificadores ni notas**: las líneas indentadas o con `+`, `No …`, `Add …`, `Extra …`, `Side …`, `Well`,
   `Medium`, los asientos (`Seat 1`) y las alergias **no** son platos.
4. **Sin las palabras de la pantalla**: `GRILL`, `KITCHEN`, `FIRE`, `COCINAR`, `HOLD`, `PAID`, etc. no van.
5. **Sin repetir**: el mismo producto dos veces en la tarjeta va una sola vez.
6. **Solo los productos de esa tarjeta.** No mezclar con los de la tarjeta de al lado.
7. **Si no se lee ningún producto, `"platos": []`.** No inventar.
8. Los trozos `CONTINUED` / `CONTINUA` siguen sin contar como tarjeta propia (igual que hoy).

### Compatibilidad

- La app **ya está lista** para este campo. Si no llega, o llega vacío, todo sigue como hoy: el tipo se elige a
  mano. Se puede desplegar cuando sea, sin coordinar con nosotros.
- Las otras cinco claves (`ticket`, `mesa`, `tiempo`, `tipo`, `listo`) **no cambian**.
- `tipo` sigue haciendo falta: con él la app separa las tarjetas de un mismo ticket (una por curso).
- La app junta los platos de varias lecturas y solo cree uno cuando lo ve **dos veces o más**. Una lectura suelta
  mal leída no hace daño.

### Cómo probarlo

Con una captura de la tablet con 2–3 tarjetas, la respuesta debe traer en `platos` lo mismo que se ve escrito en
cada tarjeta, sin cantidades ni modificadores. Si nos pasan 4 o 5 respuestas reales, las pasamos por la app y
confirmamos que cada ticket sale con su tipo.

---

## Parte 2 (después): el catálogo de platos en la API

**Hoy** el catálogo (qué categoría es cada plato) está escrito en la app, en
`src/libs/tickets/catalogos/francisca.js`. Tiene 113 platos de Francisca Doral. Funciona, pero para agregar un plato
hay que tocar el código y volver a desplegar la app.

**Lo que se propone:** que viva en `api_jarvis365` y se edite desde Client365, igual que la carta.

### Modelo (propuesta)

Un plato del catálogo, por local:

| Campo | Tipo | Qué es |
|---|---|---|
| `local` | ObjectId → Local | el local |
| `nombre` | String, requerido | el nombre en la carta del restaurante (`"1/2 Chicken"`) |
| `categoria` | ObjectId → Dishes | **la categoría es un plato de la carta del local** (`dishes`): "entrada", "plato fuerte", "postre", "drinks". De ahí sale el tiempo (`timeLimit`) |
| `alias` | [String] | otras formas en que sale escrito en la tablet (`["Bloody Mary"]`) |
| `pollo` | Boolean, default false | es un pollo (ver la regla de contornos) |
| `contorno` | Boolean, default false | es un contorno: cuenta como entrada, salvo que el ticket traiga un pollo, y entonces es plato fuerte |

### Ruta

```
GET /local/:id/menu-items
```

Respuesta, **con este formato exacto**, que es el que la app ya usa con el archivo local:

```json
[
  { "nombre": "1/2 Chicken", "categoria": "plato fuerte", "alias": [], "pollo": true,  "contorno": false },
  { "nombre": "Tostones",    "categoria": "entrada",      "alias": [], "pollo": false, "contorno": true  },
  { "nombre": "Bloody Mary", "categoria": "drinks",       "alias": ["Boody Mary"], "pollo": false, "contorno": false }
]
```

- `categoria` va como el **nombre** (`nameDishe`) del plato de la carta, no como `_id`: la app lo cruza con la
  carta por nombre.
- `[]` si el local no tiene catálogo.
- Mismo esquema de auth que el resto de `/local` (cookie de sesión, cross-domain).

Además: el alta, edición y baja (POST / PUT / DELETE) para una pantalla en Client365, al lado de la carta.

Cuando la ruta esté desplegada, en la app solo cambia `catalogoDelLocal` (`src/libs/tickets/catalogoDePlatos.js`):
pide a la API y usa el archivo local solo si no contesta.

### Datos iniciales

Los 113 platos de Francisca ya están en `src/libs/tickets/catalogos/francisca.js`, con su categoría, alias y marcas
de pollo y contorno. Se pueden cargar de ahí.
