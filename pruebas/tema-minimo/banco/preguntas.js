(function (g) {
  'use strict';
  g.PREGUNTAS = g.PREGUNTAS || [];
  g.PREGUNTAS.push({
    id: 'min-001',
    enunciado: '¿Puede funcionar un tema sin presets ni fuentes?',
    facetas: { materia: 'unica' },
    opciones: [
      { texto: 'Sí', correcta: true, explicacion: 'Ambas capacidades son opcionales.' },
      { texto: 'No', correcta: false, explicacion: 'El generador permite iniciar el examen.' }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
