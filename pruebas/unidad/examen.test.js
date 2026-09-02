'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { entorno } = require('../cargar.js');

function nuevo() {
  const ctx = entorno(['banco', 'examen']);
  return { examen: ctx.QZ.examen, banco: ctx.QZ.banco };
}

const MULTI = 'ej-geo-009';   // la única pregunta con seleccionar: 2

test('construir respeta el filtro y el tamaño pedido', () => {
  const { examen } = nuevo();
  const e = examen.construir({ filtros: { materia: ['geografia'] }, n: 4, semilla: 7 });
  assert.equal(e.items.length, 4);
  assert.ok(e.items.every((i) => i.pregunta.facetas.materia === 'geografia'));
});

test('si se piden más preguntas de las que hay, se devuelven las que hay', () => {
  const { examen } = nuevo();
  const e = examen.construir({ filtros: { materia: ['astronomia'] }, n: 99, semilla: 7 });
  assert.equal(e.items.length, 5);
});

test('la misma semilla da el mismo examen y el mismo orden de opciones', () => {
  const { examen } = nuevo();
  const a = examen.construir({ filtros: {}, n: 8, semilla: 12345 });
  const b = examen.construir({ filtros: {}, n: 8, semilla: 12345 });

  assert.deepEqual(a.items.map((i) => i.pregunta.id), b.items.map((i) => i.pregunta.id));
  assert.deepEqual(a.items.map((i) => i.orden), b.items.map((i) => i.orden));
});

test('semillas distintas dan exámenes distintos', () => {
  const { examen } = nuevo();
  const secuencias = [1, 2, 3, 4, 5].map((s) =>
    examen.construir({ filtros: {}, n: 8, semilla: s }).items.map((i) => i.pregunta.id).join(','));
  assert.ok(new Set(secuencias).size > 1, 'cinco semillas no pueden dar todas el mismo orden');
});

test('rehidratar reconstruye el examen exacto, opciones incluidas', () => {
  const { examen } = nuevo();
  const original = examen.construir({ filtros: {}, n: 6, semilla: 999 });

  // Esto es lo que app.js guarda en localStorage: ids y semilla, no el examen entero.
  const guardado = {
    ids: original.items.map((i) => i.pregunta.id),
    semilla: original.semilla,
    barajarOpciones: original.barajarOpciones,
    titulo: original.titulo,
    duracion: original.duracion
  };
  const vuelto = examen.rehidratar(guardado);

  assert.deepEqual(vuelto.items.map((i) => i.pregunta.id), guardado.ids);
  // El orden de opciones es lo que importa: si cambiase, las respuestas guardadas
  // por posición apuntarían a otra opción al recargar.
  assert.deepEqual(vuelto.items.map((i) => i.orden), original.items.map((i) => i.orden));
});

test('rehidratar descarta en silencio una pregunta que ya no existe', () => {
  const { examen } = nuevo();
  const vuelto = examen.rehidratar({
    ids: ['ej-geo-001', 'borrada-hace-tiempo', 'ej-geo-002'],
    semilla: 4, barajarOpciones: true
  });
  assert.deepEqual(vuelto.items.map((i) => i.pregunta.id), ['ej-geo-001', 'ej-geo-002']);
});

test('con barajarOpciones false el orden es el de origen', () => {
  const { examen } = nuevo();
  const e = examen.construir({ filtros: {}, n: 5, semilla: 3, barajarOpciones: false });
  e.items.forEach((i) => {
    assert.deepEqual(i.orden, i.pregunta.opciones.map((_, k) => k));
  });
});

test('el orden de opciones es una permutación completa, sin perder ni repetir', () => {
  const { examen } = nuevo();
  const e = examen.construir({ filtros: {}, n: 15, semilla: 55 });
  e.items.forEach((i) => {
    const esperado = i.pregunta.opciones.map((_, k) => k);
    assert.deepEqual(i.orden.slice().sort((x, y) => x - y), esperado, i.pregunta.id);
  });
});

test('necesarias devuelve 1 salvo que la pregunta pida más', () => {
  const { examen, banco } = nuevo();
  assert.equal(examen.necesarias(banco.porId('ej-geo-001')), 1);
  assert.equal(examen.necesarias(banco.porId(MULTI)), 2);
});

test('corregir distingue acierto, fallo y sin responder', () => {
  const { examen } = nuevo();
  const e = examen.construir({
    filtros: { materia: ['geografia'], continente: ['europa'] }, n: 3, semilla: 21
  });

  const respuestas = {};
  const acertada = e.items[0].pregunta;
  const fallada = e.items[1].pregunta;
  respuestas[acertada.id] = examen.indicesCorrectos(acertada);
  respuestas[fallada.id] = [fallada.opciones.findIndex((o) => !o.correcta)];
  // La tercera se deja sin responder a propósito.

  const r = examen.corregir(e, respuestas);
  assert.equal(r[0].correcta, true);
  assert.equal(r[0].respondida, true);
  assert.equal(r[1].correcta, false);
  assert.equal(r[1].respondida, true);
  assert.equal(r[2].respondida, false);
  assert.equal(r[2].correcta, false);
  assert.deepEqual(r[2].seleccionadas, []);
});

test('una respuesta múltiple sólo acierta con las dos opciones correctas', () => {
  const { examen, banco } = nuevo();
  const p = banco.porId(MULTI);
  const e = examen.construir({
    filtros: { materia: ['geografia'], continente: ['america'] }, n: 3, semilla: 8
  });
  const correctas = examen.indicesCorrectos(p);
  assert.equal(correctas.length, 2);

  const evaluar = (sel) => {
    const resp = {};
    resp[p.id] = sel;
    return examen.corregir(e, resp).find((r) => r.pregunta.id === p.id);
  };

  assert.equal(evaluar(correctas).correcta, true);
  // Media respuesta no cuenta: ni como acierto ni como pregunta respondida.
  const media = evaluar([correctas[0]]);
  assert.equal(media.respondida, false);
  assert.equal(media.correcta, false);
  // El orden en que se marcaron no debe importar.
  assert.equal(evaluar(correctas.slice().reverse()).correcta, true);
  // Una correcta y una incorrecta es fallo.
  const incorrecta = p.opciones.findIndex((o) => !o.correcta);
  assert.equal(evaluar([correctas[0], incorrecta]).correcta, false);
});

test('respondida exige tantas marcas como pida la pregunta', () => {
  const { examen } = nuevo();
  const e = examen.construir({
    filtros: { materia: ['geografia'], continente: ['america'] }, n: 3, semilla: 8
  });
  const item = e.items.find((i) => i.pregunta.id === MULTI);
  const parcial = {};
  parcial[MULTI] = [0];
  const completa = {};
  completa[MULTI] = [0, 1];
  assert.equal(examen.respondida(item, parcial), false);
  assert.equal(examen.respondida(item, completa), true);
});

test('el desglose por faceta suma el total de preguntas de esa faceta', () => {
  const { examen } = nuevo();
  const e = examen.construir({ filtros: {}, n: 15, semilla: 2 });
  const r = examen.corregir(e, {});
  const tabla = examen.desglose(r, 'materia');

  assert.equal(tabla.geografia.total, 10);
  assert.equal(tabla.astronomia.total, 5);
  assert.equal(tabla.geografia.ok, 0);

  // continente sólo lo declaran las de geografía: las demás no deben contarse.
  const porContinente = examen.desglose(r, 'continente');
  assert.equal(porContinente.europa.total + porContinente.america.total, 10);
});

test('el desglose cuenta los aciertos', () => {
  const { examen } = nuevo();
  const e = examen.construir({ filtros: { materia: ['astronomia'] }, n: 5, semilla: 30 });
  const respuestas = {};
  e.items.forEach((i) => { respuestas[i.pregunta.id] = examen.indicesCorrectos(i.pregunta); });
  const tabla = examen.desglose(examen.corregir(e, respuestas), 'materia');
  assert.equal(tabla.astronomia.ok, 5);
  assert.equal(tabla.astronomia.total, 5);
});

test('letra numera las opciones desde la a', () => {
  const { examen } = nuevo();
  assert.equal(examen.letra(0), 'a');
  assert.equal(examen.letra(3), 'd');
});
