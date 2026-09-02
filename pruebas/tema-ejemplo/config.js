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
    prefijoAlmacen: 'ejemplo_v1_',
    aprobado: 0.6,

    duraciones: [
      { valor: 'sin', etiqueta: 'Sin temporizador', minutos: 0 },
      { valor: '5', etiqueta: '5 minutos', minutos: 5 },
      { valor: '10', etiqueta: '10 minutos', minutos: 10 }
    ],

    tamanos: [3, 5, 6, 10],

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
        titulo: 'Geografía · Inicial',
        descripcion: 'Las preguntas de geografía del primer nivel',
        filtros: { materia: ['geografia'], nivel: ['inicial'] },
        n: 5,
        duracion: '10'
      },
      {
        id: 'astronomia',
        titulo: 'Astronomía',
        descripcion: 'Todo el bloque de astronomía, sin temporizador',
        filtros: { materia: ['astronomia'] },
        n: 5,
        duracion: 'sin'
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
