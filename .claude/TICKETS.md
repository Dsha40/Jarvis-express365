# Rama `fix/tickets` — alcance restringido

Esta rama existe para arreglar **el envío y las respuestas de los tickets entre
el cliente (esta app) y el servidor (`api_jarvis365`)**. Nada más.

## Regla

**Solo se pueden modificar los archivos de la lista de abajo.** Cualquier otro
archivo del repo es de solo lectura en esta rama: se puede leer para entender,
pero no se edita, no se crea al lado ni se borra.

Si el arreglo necesita tocar un archivo que no está en la lista, **parar y
preguntar** antes de hacerlo, explicando por qué hace falta. No ampliar el
alcance por cuenta propia, aunque el cambio parezca pequeño u obvio (un
renombre, un import que sobra, un estilo, un comentario).

Tampoco se toca, salvo pedido explícito: `package.json`, `package-lock.json`,
`.env`, `vite.config.js`, `CLAUDE.md`, ni este archivo.

## Archivos permitidos

### Peticiones HTTP a la API
- `src/libs/fetch_data/rotationFetching.js` — `POST/PUT/DELETE/GET /rotation…`
- `src/libs/fetch_data/sessionAxios.js` y `src/libs/fetch_data/instanceAxios.js`
  — **solo** si el problema está en cómo se manda o se interpreta la respuesta
  de una petición de tickets/rotaciones; son compartidos por toda la app, así
  que cualquier cambio ahí se consulta antes.

### Sincronización y estado de los tickets con el servidor
- `src/libs/tickets/rotationSync.js`
- `src/libs/tickets/recoveredRotation.js`
- `src/libs/tickets/savedTickets.js`
- `src/libs/tickets/staleRecords.js`
- `src/libs/tickets/linkedNovelties.js`
- `src/libs/tickets/reportedDelay.js`
- `src/libs/tickets/claveDeTicket.js`
- `src/libs/tickets/tableRecords.js`

### Hooks de la tablet que hablan con el servidor
- `src/component/tabletScreen/hook/useRotationSync.jsx`
- `src/component/tabletScreen/hook/useSavedRotations.jsx`
- `src/component/tabletScreen/hook/useStaleRotations.jsx`
- `src/component/tabletScreen/hook/useLinkedNovelties.jsx`
- `src/component/tabletScreen/hook/useSendCapture.jsx`
- `src/component/tabletScreen/hook/useTabletSession.jsx` — solo para cablear
  lo anterior, no para cambiar el orden del resto de la sesión.

### Lo que el operador ve de la respuesta
- `src/component/tabletScreen/assets/registers/RegisterSaved*.jsx`
- `src/component/tabletScreen/assets/registers/RegisterStale*.jsx`
- `src/component/tabletScreen/assets/registers/ReportedFlag.jsx`
- `src/component/tabletScreen/assets/registers/ResendAlertButton.jsx`

## Fuera de alcance (explícitamente)

- La lectura de la pantalla con IA (`src/libs/inference/`, `useTicketReading`,
  `useAiServer`, `lecturaDeTickets.js`, `ConfigIA`).
- La grilla, la navegación y el aspecto de Mesas (`cells/`, `gridNav`,
  `tableView`, columnas, estilos).
- El simulador (`src/simulador/`).
- Formularios de novedades (`src/component/Main/`), login, sockets, Redux.
- La app de escritorio (`D:\Reportes de alertas-win32-ia32`).

## Recordatorios

- El servidor es otro repo (`api_jarvis365`) y se despliega a mano: si el
  arreglo necesita un cambio del lado de la API, decirlo, no simularlo acá.
- Código, comentarios y commits en **español**, con el estilo del resto.
