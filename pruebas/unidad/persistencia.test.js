'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function nuevo(fallar) {
  const datos = new Map();
  const localStorage = {
    getItem: (k) => datos.has(k) ? datos.get(k) : null,
    setItem: (k, v) => { if (fallar) throw new Error('cuota'); datos.set(k, v); },
    removeItem: (k) => datos.delete(k)
  };
  const ctx = { TEMA: { prefijoAlmacen: 't_' } };
  ctx.window = ctx;
  const src = fs.readFileSync(path.resolve(__dirname, '..', '..', 'web', 'js', 'persistencia.js'), 'utf8');
  new Function('window', 'globalThis', 'localStorage', src)(ctx, ctx, localStorage);
  return { almacen: ctx.QZ.almacen, datos };
}

test('descarta JSON válido con forma incorrecta', () => {
  const { almacen, datos } = nuevo();
  datos.set('t_progreso', JSON.stringify({ ids: null }));
  datos.set('t_historial', 'null');
  datos.set('t_aciertos', JSON.stringify({ rota: { vistas: -2 } }));
  assert.equal(almacen.leerProgreso(), null);
  assert.deepEqual(almacen.historial(), []);
  assert.deepEqual(Object.keys(almacen.aciertos()), []);
});

test('versiona el progreso y conserva uno válido', () => {
  const { almacen, datos } = nuevo();
  assert.equal(almacen.guardarProgreso({
    ids: ['p-1'], firmas: { 'p-1': 'abc' }, respuestas: { 'p-1': [0] }, semilla: 3, modo: 'sin'
  }), true);
  assert.equal(JSON.parse(datos.get('t_progreso')).version, 2);
  assert.deepEqual(almacen.leerProgreso().respuestas['p-1'], [0]);
});

test('comunica almacenamiento bloqueado o sin cuota', () => {
  const { almacen } = nuevo(true);
  assert.equal(almacen.guardarProgreso({
    ids: ['p-1'], firmas: { 'p-1': 'abc' }, respuestas: {}, semilla: 1, modo: 'sin'
  }), false);
  assert.match(almacen.ultimoError().message, /cuota/);
});

test('sanea historial antes de añadir intentos', () => {
  const { almacen, datos } = nuevo();
  datos.set('t_historial', JSON.stringify([null, { fecha: 1, total: 2, aciertos: 9 }]));
  almacen.anotarIntento({ fecha: 2, total: 3, aciertos: 1 });
  assert.deepEqual(almacen.historial(), [{ fecha: 2, total: 3, aciertos: 1 }]);
});
