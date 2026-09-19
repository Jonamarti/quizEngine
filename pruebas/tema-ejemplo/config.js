/* Tema de ejemplo del motor.

   Cumple tres funciones a la vez y por eso conviene no adelgazarlo:
   es el fixture de los tests de unidad, el sitio contra el que corre la prueba de
   humo, y la demo publicable que enseña el contrato de ESQUEMA.md funcionando.

   Ejercita a propósito todos los rasgos del contrato: una faceta acumulativa
   (nivel), una faceta dependiente (continente, sólo bajo geografía), preguntas sin
   una de las facetas (las de astronomía no tienen continente) y una pregunta de
   respuesta múltiple. */
(function (g) {
  'use strict';

  g.TEMA = {
    id: 'ejemplo',
    titulo: 'Tema de ejemplo',
    subtitulo: 'Banco mínimo para probar el contrato del motor',
    aviso: 'Contenido de demostración, no afiliado a ninguna entidad real.',
    prefijoAlmacen: 'ejemplo_v1_',
    aprobado: 0.6,

    duraciones: [
      { valor: 'sin', etiqueta: 'Sin temporizador', minutos: 0 },
      { valor: '5', etiqueta: '5 minutos', minutos: 5 },
      { valor: '10', etiqueta: '10 minutos', minutos: 10 }
    ],

    tamanos: [3, 5, 6, 10],

    // Dos grupos para que el listado ejercite el reparto en secciones y el filtro
    // por pastillas. Un tema sin  se pinta plano, y eso también se prueba.
    grupos: [
      { id: 'geografia', etiqueta: 'Geografía', descripcion: 'Relieve, ríos y fronteras' },
      { id: 'astronomia', etiqueta: 'Astronomía' }
    ],

    facetas: [
      {
        id: 'materia',
        etiqueta: 'Materia',
        valores: [
          { id: 'geografia', etiqueta: 'Geografía', color: 'hsl(150, 45%, 42%)' },
          { id: 'astronomia', etiqueta: 'Astronomía', color: 'hsl(255, 45%, 55%)' }
        ]
      },
      {
        id: 'continente',
        etiqueta: 'Continente',
        dependeDe: { materia: 'geografia' },
        valores: [
          { id: 'europa', etiqueta: 'Europa' },
          { id: 'america', etiqueta: 'América' }
        ]
      },
      {
        id: 'nivel',
        etiqueta: 'Nivel',
        acumulativa: true,
        valores: [
          { id: 'inicial', etiqueta: 'Inicial' },
          { id: 'medio', etiqueta: 'Medio' },
          { id: 'avanzado', etiqueta: 'Avanzado' }
        ]
      }
    ],

    presets: [
      {
        id: 'geo-inicial',
        grupo: 'geografia',
        titulo: 'Geografía · Inicial',
        descripcion: 'Las preguntas de geografía del primer nivel',
        filtros: { materia: ['geografia'], nivel: ['inicial'] },
        n: 5,
        duracion: '10'
      },
      {
        id: 'astronomia',
        grupo: 'astronomia',
        // Título distinto de la etiqueta del grupo a propósito: la prueba de humo
        // compara el título de la tarjeta con el del examen lanzado, y si ambos
        // coincidieran el chequeo pasaría incluso con los índices mal.
        titulo: 'Sistema solar de cabo a rabo',
        descripcion: 'Todo el bloque de astronomía, sin temporizador',
        filtros: { materia: ['astronomia'] },
        n: 5,
        duracion: 'sin'
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
