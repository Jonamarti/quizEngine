/* Bloque de geografía del tema de ejemplo.

   El corte por continente da tres preguntas de América, y una de ellas es de
   respuesta múltiple: la prueba de humo filtra justo por ahí para que el examen
   generado contenga siempre el caso de seleccionar > 1 sin depender del azar. */
(function (g) {
  'use strict';
  g.PREGUNTAS = g.PREGUNTAS || [];

  g.PREGUNTAS.push(
    {
      id: 'ej-geo-001',
      enunciado: '¿Cuál es la capital de Francia?',
      facetas: { materia: 'geografia', continente: 'europa', nivel: 'inicial' },
      fuente: 'Instituto Geográfico Nacional',
      origen: 'autorada',
      opciones: [
        { texto: 'París', correcta: true, explicacion: 'Es la capital y la ciudad más poblada del país.' },
        { texto: 'Lyon', correcta: false, explicacion: 'Es la tercera ciudad del país, pero no su capital.' },
        { texto: 'Marsella', correcta: false, explicacion: 'Es el principal puerto francés del Mediterráneo.' },
        { texto: 'Burdeos', correcta: false, explicacion: 'Es capital de la región de Nueva Aquitania, no del Estado.' }
      ]
    },
    {
      id: 'ej-geo-002',
      enunciado: '¿Qué río atraviesa la ciudad de Londres?',
      facetas: { materia: 'geografia', continente: 'europa', nivel: 'inicial' },
      fuente: 'Ordnance Survey',
      origen: 'autorada',
      opciones: [
        { texto: 'El Támesis', correcta: true, explicacion: 'Cruza la ciudad de oeste a este hasta desembocar en el mar del Norte.' },
        { texto: 'El Sena', correcta: false, explicacion: 'El Sena atraviesa París, no Londres.' },
        { texto: 'El Danubio', correcta: false, explicacion: 'El Danubio recorre Europa central y oriental, sin pasar por las islas británicas.' },
        { texto: 'El Rin', correcta: false, explicacion: 'El Rin desemboca en los Países Bajos tras cruzar Alemania.' }
      ]
    },
    {
      id: 'ej-geo-003',
      enunciado: '¿En qué península se encuentran España y Portugal?',
      facetas: { materia: 'geografia', continente: 'europa', nivel: 'inicial' },
      fuente: 'Instituto Geográfico Nacional',
      origen: 'autorada',
      opciones: [
        { texto: 'La península ibérica', correcta: true, explicacion: 'Comprende España, Portugal, Andorra, Gibraltar y una parte del sur de Francia.' },
        { texto: 'La península itálica', correcta: false, explicacion: 'La península itálica corresponde a Italia, San Marino y el Vaticano.' },
        { texto: 'La península balcánica', correcta: false, explicacion: 'Los Balcanes están en el sureste europeo, al otro extremo del continente.' },
        { texto: 'La península escandinava', correcta: false, explicacion: 'Escandinavia agrupa a Noruega, Suecia y parte de Finlandia.' }
      ]
    },
    {
      id: 'ej-geo-004',
      enunciado: '¿Cuál es el pico más alto de los Alpes?',
      facetas: { materia: 'geografia', continente: 'europa', nivel: 'medio' },
      fuente: 'Institut Geographique National',
      origen: 'autorada',
      opciones: [
        { texto: 'El Mont Blanc', correcta: true, explicacion: 'Con 4.808 metros, es la mayor altura de los Alpes y de Europa occidental.' },
        { texto: 'El Cervino', correcta: false, explicacion: 'Es más famoso por su silueta, pero se queda en 4.478 metros.' },
        { texto: 'El Elbrús', correcta: false, explicacion: 'El Elbrús es más alto, pero pertenece al Cáucaso, no a los Alpes.' },
        { texto: 'El Mulhacén', correcta: false, explicacion: 'Es el techo peninsular español, en Sierra Nevada.' }
      ]
    },
    {
      id: 'ej-geo-005',
      enunciado: '¿Qué país de la Unión Europea tiene más habitantes?',
      facetas: { materia: 'geografia', continente: 'europa', nivel: 'medio' },
      fuente: 'Eurostat',
      origen: 'autorada',
      opciones: [
        { texto: 'Alemania', correcta: true, explicacion: 'Ronda los 84 millones, la cifra más alta de la Unión Europea.' },
        { texto: 'Francia', correcta: false, explicacion: 'Es el segundo, algo por encima de los 68 millones.' },
        { texto: 'Italia', correcta: false, explicacion: 'Ronda los 59 millones y con tendencia a la baja.' },
        { texto: 'España', correcta: false, explicacion: 'Ronda los 48 millones, cuarto puesto de la Unión.' }
      ]
    },
    {
      id: 'ej-geo-006',
      enunciado: '¿Qué estrecho separa Europa de África por el extremo occidental del Mediterráneo?',
      facetas: { materia: 'geografia', continente: 'europa', nivel: 'avanzado' },
      fuente: 'Organización Hidrográfica Internacional',
      origen: 'autorada',
      opciones: [
        { texto: 'El estrecho de Gibraltar', correcta: true, explicacion: 'Con unos 14 kilómetros en su punto más angosto, comunica el Atlántico con el Mediterráneo.' },
        { texto: 'El estrecho del Bósforo', correcta: false, explicacion: 'El Bósforo separa Europa de Asia y está en el otro extremo del Mediterráneo.' },
        { texto: 'El canal de Sicilia', correcta: false, explicacion: 'Separa Sicilia de Túnez, pero queda dentro del propio Mediterráneo.' },
        { texto: 'El canal de la Mancha', correcta: false, explicacion: 'Separa Francia de Gran Bretaña, y no toca África.' }
      ]
    },
    {
      id: 'ej-geo-007',
      enunciado: '¿Cuál es el río más caudaloso del mundo?',
      facetas: { materia: 'geografia', continente: 'america', nivel: 'inicial' },
      fuente: 'Instituto Nacional de Pesquisas da Amazonia',
      origen: 'autorada',
      opciones: [
        { texto: 'El Amazonas', correcta: true, explicacion: 'Vierte al Atlántico unos 209.000 metros cúbicos por segundo, más que los siguientes siete juntos.' },
        { texto: 'El Nilo', correcta: false, explicacion: 'Compite por la longitud, no por el caudal: el suyo es muy inferior.' },
        { texto: 'El Misisipi', correcta: false, explicacion: 'Es el gran río de Norteamérica, pero su caudal no llega a la décima parte.' },
        { texto: 'El Yangtsé', correcta: false, explicacion: 'Es el mayor de Asia y aun así queda muy por debajo del Amazonas.' }
      ]
    },
    {
      id: 'ej-geo-008',
      enunciado: '¿Qué cordillera recorre el oeste de Sudamérica?',
      facetas: { materia: 'geografia', continente: 'america', nivel: 'inicial' },
      fuente: 'Instituto Geográfico Militar de Chile',
      origen: 'autorada',
      opciones: [
        { texto: 'Los Andes', correcta: true, explicacion: 'Con unos 7.000 kilómetros, es la cordillera continental más larga del planeta.' },
        { texto: 'Las Rocosas', correcta: false, explicacion: 'Las Rocosas recorren Norteamérica, de Canadá a Nuevo México.' },
        { texto: 'La Sierra Madre', correcta: false, explicacion: 'Las Sierras Madre son sistemas mexicanos, en Norteamérica.' },
        { texto: 'Los Apalaches', correcta: false, explicacion: 'Están en el este de Norteamérica y son mucho más antiguos y bajos.' }
      ]
    },
    {
      id: 'ej-geo-009',
      enunciado: '¿Cuáles de estos países tienen costa en el océano Pacífico?',
      facetas: { materia: 'geografia', continente: 'america', nivel: 'medio' },
      seleccionar: 2,
      fuente: 'Organización Hidrográfica Internacional',
      nota: 'Chile y Perú son ribereños del Pacífico; Argentina y Uruguay dan al Atlántico',
      origen: 'autorada',
      opciones: [
        { texto: 'Chile', correcta: true, explicacion: 'Toda su franja costera, de norte a sur, da al Pacífico.' },
        { texto: 'Perú', correcta: true, explicacion: 'Su litoral es íntegramente pacífico, al oeste de los Andes.' },
        { texto: 'Argentina', correcta: false, explicacion: 'Su costa es atlántica: los Andes le cierran el paso al Pacífico.' },
        { texto: 'Uruguay', correcta: false, explicacion: 'Da al Atlántico y al Río de la Plata, sin salida al Pacífico.' }
      ]
    }
  );
})(typeof window !== 'undefined' ? window : globalThis);
