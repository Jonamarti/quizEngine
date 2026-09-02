/* Bloque de astronomía del tema de ejemplo.

   Estas preguntas no declaran la faceta "continente" a propósito: el contrato
   permite que una pregunta omita facetas que no le aplican, y el filtrado tiene
   que seguir funcionando. */
(function (g) {
  'use strict';
  g.PREGUNTAS = g.PREGUNTAS || [];

  g.PREGUNTAS.push(
    {
      id: 'ej-ast-001',
      enunciado: '¿Cuál es el planeta más cercano al Sol?',
      facetas: { materia: 'astronomia', nivel: 'inicial' },
      fuente: 'NASA Solar System Exploration',
      origen: 'autorada',
      opciones: [
        { texto: 'Mercurio', correcta: true, explicacion: 'Orbita a unos 58 millones de kilómetros del Sol.' },
        { texto: 'Venus', correcta: false, explicacion: 'Es el segundo, a unos 108 millones de kilómetros.' },
        { texto: 'Marte', correcta: false, explicacion: 'Es el cuarto, ya por fuera de la órbita terrestre.' },
        { texto: 'La Tierra', correcta: false, explicacion: 'Es el tercero, a unos 150 millones de kilómetros.' }
      ]
    },
    {
      id: 'ej-ast-002',
      enunciado: '¿Qué satélite natural tiene la Tierra?',
      facetas: { materia: 'astronomia', nivel: 'inicial' },
      fuente: 'NASA Solar System Exploration',
      origen: 'autorada',
      opciones: [
        { texto: 'La Luna', correcta: true, explicacion: 'Es el único satélite natural de la Tierra.' },
        { texto: 'Fobos', correcta: false, explicacion: 'Fobos es uno de los dos satélites de Marte.' },
        { texto: 'Europa', correcta: false, explicacion: 'Europa es una de las lunas galileanas de Júpiter.' },
        { texto: 'Titán', correcta: false, explicacion: 'Titán es el mayor satélite de Saturno.' }
      ]
    },
    {
      id: 'ej-ast-003',
      enunciado: '¿Cuál es el planeta más grande del sistema solar?',
      facetas: { materia: 'astronomia', nivel: 'medio' },
      fuente: 'NASA Solar System Exploration',
      origen: 'autorada',
      opciones: [
        { texto: 'Júpiter', correcta: true, explicacion: 'Su masa supera al doble de la de todos los demás planetas juntos.' },
        { texto: 'Saturno', correcta: false, explicacion: 'Es el segundo en tamaño, y el menos denso de todos.' },
        { texto: 'Neptuno', correcta: false, explicacion: 'Es un gigante helado, bastante menor que los dos anteriores.' },
        { texto: 'El Sol', correcta: false, explicacion: 'El Sol es una estrella, no un planeta.' }
      ]
    },
    {
      id: 'ej-ast-004',
      enunciado: '¿Qué magnitud mide un año luz?',
      facetas: { materia: 'astronomia', nivel: 'medio' },
      fuente: 'Unión Astronómica Internacional',
      origen: 'autorada',
      opciones: [
        { texto: 'Distancia', correcta: true, explicacion: 'Es la distancia que recorre la luz en un año, unos 9,46 billones de kilómetros.' },
        { texto: 'Tiempo', correcta: false, explicacion: 'El nombre engaña: pese a llamarse año, la unidad es de distancia.' },
        { texto: 'Masa', correcta: false, explicacion: 'La masa estelar se expresa en masas solares, no en años luz.' },
        { texto: 'Luminosidad', correcta: false, explicacion: 'La luminosidad se mide en vatios o en luminosidades solares.' }
      ]
    },
    {
      id: 'ej-ast-005',
      enunciado: '¿Por qué vemos siempre la misma cara de la Luna?',
      facetas: { materia: 'astronomia', nivel: 'avanzado' },
      fuente: 'NASA Solar System Exploration',
      origen: 'autorada',
      opciones: [
        { texto: 'Su periodo de rotación coincide con el de traslación', correcta: true, explicacion: 'Es el acoplamiento de marea: la Luna tarda lo mismo en girar sobre sí misma que en dar una vuelta a la Tierra.' },
        { texto: 'La Luna no rota sobre sí misma', correcta: false, explicacion: 'Es el error más común: si no rotase, desde la Tierra veríamos toda su superficie a lo largo de una órbita.' },
        { texto: 'La cara oculta nunca recibe luz solar', correcta: false, explicacion: 'La cara oculta recibe tanta luz como la visible; oculta no significa oscura.' },
        { texto: 'La atmósfera terrestre desvía su imagen', correcta: false, explicacion: 'La atmósfera distorsiona el brillo y el color, pero no oculta un hemisferio entero.' }
      ]
    }
  );
})(typeof window !== 'undefined' ? window : globalThis);
