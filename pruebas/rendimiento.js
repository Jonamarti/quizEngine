#!/usr/bin/env node
'use strict';

// Referencia reproducible, no umbral de CI: detecta órdenes de magnitud antes de
// optimizar. Ejecutar con `npm run benchmark` en Node 20 o posterior.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const ctx = {};
ctx.window = ctx;
for (const nombre of ['banco', 'examen']) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'web', 'js', nombre + '.js'), 'utf8');
  new Function('window', 'globalThis', src)(ctx, ctx);
}

const N = Number(process.env.QUIZ_BENCH_N || 10000);
const preguntas = Array.from({ length: N }, (_, i) => ({
  id: 'bench-' + i,
  enunciado: 'Pregunta ' + i,
  facetas: { tema: 't' + (i % 20), nivel: ['inicial', 'medio', 'avanzado'][i % 3] },
  opciones: [
    { texto: 'Sí', correcta: true, explicacion: 'Sí.' },
    { texto: 'No', correcta: false, explicacion: 'No.' }
  ]
}));
const tema = {
  facetas: [
    { id: 'tema', valores: Array.from({ length: 20 }, (_, i) => ({ id: 't' + i })) },
    { id: 'nivel', acumulativa: true, valores: ['inicial', 'medio', 'avanzado'].map((id) => ({ id })) }
  ]
};

function medir(nombre, fn, vueltas) {
  const inicio = performance.now();
  for (let i = 0; i < vueltas; i++) fn();
  const ms = performance.now() - inicio;
  console.log(nombre.padEnd(34) + ms.toFixed(1).padStart(8) + ' ms  (' + vueltas + ' vuelta(s))');
}

ctx.QZ.banco.init(preguntas, tema);
console.log('Banco sintético: ' + N.toLocaleString('es-ES') + ' preguntas · Node ' + process.version);
medir('100 filtros sobre todo el banco', () => ctx.QZ.banco.filtrar({ tema: ['t7'], nivel: ['medio'] }), 100);
medir('20 recuentos de faceta', () => ctx.QZ.banco.disponibles('tema', { nivel: ['avanzado'] }), 20);
medir('100 exámenes de 40 preguntas', () => ctx.QZ.examen.construir({ filtros: {}, n: 40, semilla: 42 }), 100);
const memoria = process.memoryUsage();
console.log('Heap usado'.padEnd(34) + (memoria.heapUsed / 1024 / 1024).toFixed(1).padStart(8) + ' MiB');
