(function (g) {
  'use strict';
  g.TEMA = {
    id: 'minimo',
    titulo: 'Tema mínimo',
    prefijoAlmacen: 'minimo_v1_',
    facetas: [
      { id: 'materia', etiqueta: 'Materia', valores: [{ id: 'unica', etiqueta: 'Única' }] }
    ],
    duraciones: [{ valor: 'sin', etiqueta: 'Sin temporizador', minutos: 0 }],
    tamanos: [1]
  };
})(typeof window !== 'undefined' ? window : globalThis);
