/*  ══════════════════════════════════════════════════════════════════════════════════════
 *  EL CATÁLOGO DE FRANCISCA: qué categoría de la carta es cada plato que sale en un ticket
 *
 *  Sale de las hojas «Menú de orden de Francisca» (2026-11-23). Los TIEMPOS no están aquí:
 *  mandan los de la carta del local en Client365 (entrada 6, plato fuerte 15, postre 5,
 *  drinks 5), aunque la hoja diga otro.
 *
 *  FORMATO — es el mismo que devolverá la API cuando el catálogo viva en el servidor
 *  (GET /local/:id/menu-items, ver docs/tipo-de-plato-servidor.md). Cada plato:
 *
 *      nombre     cómo se llama en la carta del restaurante
 *      categoria  el NOMBRE de un plato de la carta del local en Client365 ('dishes'):
 *                 'entrada' | 'plato fuerte' | 'postre' | 'drinks'
 *      alias      otras formas en que puede salir escrito en la tablet (opcional)
 *      pollo      es un pollo: con él, los contornos pasan a plato fuerte (opcional)
 *      contorno   es un contorno: solo es entrada, salvo que el ticket traiga pollo (opcional)
 *
 *  Para agregar un plato: una línea más en su sección. Si en la tablet sale escrito
 *  distinto, se agrega a sus 'alias'.
 *  ══════════════════════════════════════════════════════════════════════════════════════ */


// LOCALES = «los locales que usan este catálogo», por su _id en api_jarvis365
export const LOCALES = ['637a7ae31a8ed7ed7d7e71e0'];   //  Francisca Doral


const ENTRADA = 'entrada';
const FUERTE = 'plato fuerte';
const POSTRE = 'postre';
const DRINKS = 'drinks';


export const PLATOS = [

    //  ── PLATO FUERTE ─────────────────────────────────────────────────────────────────
    { nombre: 'Whole Chicken', categoria: FUERTE, pollo: true },
    { nombre: '1/2 Chicken', categoria: FUERTE, pollo: true },
    { nombre: '1/4 Chicken', categoria: FUERTE, pollo: true },
    { nombre: '1/4 Chicken Lunch', categoria: FUERTE, pollo: true },
    { nombre: 'Parrilla multicultural', categoria: FUERTE },
    { nombre: 'Tapa cuadril', categoria: FUERTE },
    { nombre: 'Entraña', categoria: FUERTE },
    { nombre: 'Pabellón', categoria: FUERTE },
    { nombre: 'Snapper Fish', categoria: FUERTE },
    { nombre: 'Charcoal branzino', categoria: FUERTE },
    { nombre: 'Bandeja paisa', categoria: FUERTE },

    //  Sopas y ensaladas: siempre plato fuerte (decisión del usuario)
    { nombre: 'Cruzado de res y ave', categoria: FUERTE, alias: ['Cruzado'] },
    { nombre: 'Ensalada cesar con berro o lechuga', categoria: FUERTE, alias: ['Ensalada cesar', 'Caesar Salad'] },
    { nombre: 'Ensalada criolla', categoria: FUERTE },

    //  ── ENTRADA ──────────────────────────────────────────────────────────────────────
    { nombre: 'Cachapa', categoria: ENTRADA },
    { nombre: 'Pan de bono', categoria: ENTRADA },
    { nombre: 'Chicharrones don guille', categoria: ENTRADA, alias: ['Chicharrones'] },
    { nombre: 'Tequeños maría', categoria: ENTRADA, alias: ['Tequeños', 'Tequeños Ma María'] },
    { nombre: 'Mandocas casa vieja', categoria: ENTRADA, alias: ['Mandocas'] },
    { nombre: 'Queso de telita al carbón', categoria: ENTRADA, alias: ['Queso de telita'] },
    { nombre: 'Maíz hecho al carbón', categoria: ENTRADA },
    { nombre: 'Arepitas tía mica', categoria: ENTRADA, alias: ['Arepitas'] },
    { nombre: 'Patacón picado', categoria: ENTRADA },
    { nombre: 'Parrillita francisca', categoria: ENTRADA, alias: ['Parrillita'] },
    { nombre: 'Empanadas tía Almida', categoria: ENTRADA, alias: ['Empanadas'] },
    { nombre: 'Francisca sampler', categoria: ENTRADA, alias: ['Sampler'] },

    //  Contornos: entrada si salen solos; con pollo, plato fuerte
    { nombre: 'Yuca frita', categoria: ENTRADA, contorno: true },
    { nombre: 'Chorizo', categoria: ENTRADA, contorno: true },
    { nombre: 'Morcilla', categoria: ENTRADA, contorno: true },
    { nombre: 'Tostones', categoria: ENTRADA, contorno: true },
    { nombre: 'Hallaquitas blancas', categoria: ENTRADA, contorno: true, alias: ['Hallaquitas'] },
    { nombre: 'White rice', categoria: ENTRADA, contorno: true },
    { nombre: 'French fries', categoria: ENTRADA, contorno: true, alias: ['Fries'] },
    { nombre: 'Coleslaw Salad', categoria: ENTRADA, contorno: true, alias: ['Coleslaw'] },
    { nombre: 'Fresh salad', categoria: ENTRADA, contorno: true },
    { nombre: 'Chicken Tenders', categoria: ENTRADA, contorno: true },
    { nombre: 'Aguacate', categoria: ENTRADA, contorno: true, alias: ['Avocado'] },
    { nombre: 'Ripe Plantains', categoria: ENTRADA, contorno: true },
    { nombre: 'Nata', categoria: ENTRADA, contorno: true },
    { nombre: 'Boiled yuca', categoria: ENTRADA, contorno: true },
    { nombre: 'Black beans', categoria: ENTRADA, contorno: true },
    { nombre: 'Red beans', categoria: ENTRADA, contorno: true },
    { nombre: 'Cheese burger', categoria: ENTRADA, contorno: true, alias: ['Cheeseburger'] },
    { nombre: 'Arroz mamposteado', categoria: ENTRADA, contorno: true },
    { nombre: 'Shredded cheese', categoria: ENTRADA, contorno: true },
    { nombre: 'Congri', categoria: ENTRADA, contorno: true },

    //  ── POSTRE ───────────────────────────────────────────────────────────────────────
    { nombre: 'Tres leches', categoria: POSTRE },
    { nombre: 'Marquesa de Nutella', categoria: POSTRE },
    { nombre: 'Hula hula churros', categoria: POSTRE, alias: ['Churros'] },
    { nombre: 'Barquillas francisca', categoria: POSTRE, alias: ['Barquillas'] },
    { nombre: 'Brownie', categoria: POSTRE },
    { nombre: 'Fior di latte gelato', categoria: POSTRE, alias: ['Gelato', 'Fior di latte barquillita'] },
    { nombre: 'Quesillo', categoria: POSTRE, alias: ['Flan'] },
    { nombre: 'Bati bati francisca', categoria: POSTRE, alias: ['Bati bati', 'Bati bati barquillita'] },

    //  ── DRINKS ───────────────────────────────────────────────────────────────────────
    //  Tragos
    { nombre: 'Whiskey', categoria: DRINKS },
    { nombre: 'Rum', categoria: DRINKS },
    { nombre: 'Vodka', categoria: DRINKS },
    { nombre: 'Gin', categoria: DRINKS },

    //  Cocktails
    { nombre: 'Daiquiri', categoria: DRINKS },
    { nombre: 'Mojito', categoria: DRINKS },
    { nombre: 'Caipiroska', categoria: DRINKS },
    { nombre: 'Moscow Mule', categoria: DRINKS },
    { nombre: 'Sex On The Beach', categoria: DRINKS },
    { nombre: 'Long Island Iced Tea', categoria: DRINKS },
    { nombre: 'Colada Santa Lucia', categoria: DRINKS },
    { nombre: "Cepillao' El Escondido", categoria: DRINKS, alias: ['Cepillao'] },
    { nombre: "Francisca's Old Fashioned", categoria: DRINKS, alias: ['Old Fashioned'] },
    { nombre: 'Margarita', categoria: DRINKS },
    { nombre: 'Pisco Sour', categoria: DRINKS },
    { nombre: 'Tequila Sunrise', categoria: DRINKS },
    { nombre: 'Cosmopolitan', categoria: DRINKS },
    { nombre: 'Dry Martini', categoria: DRINKS, alias: ['Martini'] },
    { nombre: 'Bloody Mary', categoria: DRINKS, alias: ['Boody Mary'] },
    { nombre: 'Diplomático Spritz', categoria: DRINKS, alias: ['Spritz'] },
    { nombre: 'La Paila', categoria: DRINKS },

    //  Vinos (la hoja escribe «Padena» y «Palena»: la marca es Palena)
    { nombre: 'Anno Domini Prosecco Diamante', categoria: DRINKS, alias: ['Prosecco'] },
    { nombre: 'NY Passion Fruit', categoria: DRINKS },
    { nombre: 'Anno Domini Giorgio', categoria: DRINKS },
    { nombre: 'Palena Reserva Especial Sauvignon Blanc', categoria: DRINKS, alias: ['Padena Reserva Especial Sauvignon Blanc', 'Sauvignon Blanc'] },
    { nombre: 'Rocklin Ranch California Chardonnay', categoria: DRINKS, alias: ['Chardonnay'] },
    { nombre: 'Palena Reserva Especial Cabernet Sauvignon', categoria: DRINKS, alias: ['Padena Reserva Espacial Cabernet Sauvignon'] },
    { nombre: 'Palena Reserva Especial Merlot', categoria: DRINKS, alias: ['Merlot'] },
    { nombre: 'Cruz Del Sur Reserva Malbec', categoria: DRINKS, alias: ['Malbec'] },
    { nombre: 'Rocklin Ranch California Cabernet Sauvignon', categoria: DRINKS, alias: ['Cabernet Sauvignon'] },
    { nombre: 'Pradorey Origen', categoria: DRINKS },

    //  Jugos y cafés
    { nombre: 'Lemonade', categoria: DRINKS, alias: ['Limonada'] },
    { nombre: 'Mint Lemonade', categoria: DRINKS, alias: ['Limonada de menta'] },
    { nombre: 'Coconut Lemonade', categoria: DRINKS, alias: ['Limonada de coco'] },
    { nombre: 'Fresh Fruit Juices', categoria: DRINKS, alias: ['Juice', 'Jugo'] },
    { nombre: 'Cocada', categoria: DRINKS },
    { nombre: 'Small Coffee', categoria: DRINKS, alias: ['Coffee', 'Café'] },
    { nombre: 'Large Coffee', categoria: DRINKS },

    //  Sangrías
    { nombre: 'Red Wine Sangria', categoria: DRINKS, alias: ['Sangria'] },
    { nombre: 'White Wine Sangria', categoria: DRINKS },
    { nombre: 'Sparkling Sangria', categoria: DRINKS },

    //  Digestivos
    { nombre: 'Grand marnier', categoria: DRINKS },
    { nombre: 'Tequila reposado', categoria: DRINKS, alias: ['Tequila'] },
    { nombre: 'Tequila silver', categoria: DRINKS },
    { nombre: 'Baileys', categoria: DRINKS },
    { nombre: 'Sambuca', categoria: DRINKS },
    { nombre: 'Triple sec', categoria: DRINKS },
    { nombre: 'Amaretto', categoria: DRINKS },
    { nombre: 'Frangelico', categoria: DRINKS },
    { nombre: 'Limoncello', categoria: DRINKS, alias: ['Limoncell'] },
    { nombre: 'Licor 43', categoria: DRINKS },
    { nombre: 'Carajillo', categoria: DRINKS },

    //  Bebidas
    { nombre: 'Water', categoria: DRINKS, alias: ['Agua'] },
    { nombre: 'Beer', categoria: DRINKS, alias: ['Cerveza'] },
    { nombre: 'Black Tea', categoria: DRINKS },
    { nombre: 'Chamomile Tea', categoria: DRINKS, alias: ['Chamolite Tea', 'Manzanilla'] },
    { nombre: 'Sodas', categoria: DRINKS, alias: ['Soda', 'Coke', 'Pepsi', 'Sprite'] },
    { nombre: 'Aguapanela', categoria: DRINKS, alias: ['Agua de panela'] },
    { nombre: 'Lemon Iced Tea', categoria: DRINKS, alias: ['Iced Tea'] },
];
