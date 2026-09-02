'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { entorno } = require('../cargar.js');

function nuevo() {
  return entorno(['banco']).QZ.banco;
}

test('init indexa el banco y deja las preguntas accesibles por id', () => {
  const banco = nuevo();
  assert.equal(banco.todas().length, 15);
  assert.equal(banco.porId('ej-geo-001').facetas.continente, 'europa');
  assert.equal(banco.porId('no-existe'), undefined);
});

test('sin criterios devuelve el banco entero', () => {
  const banco = nuevo();
  assert.equal(banco.filtrar({}).length, 15);
  assert.equal(banco.filtrar().length, 15);
});

test('un array de valores vacío no filtra nada', () => {
  const banco = nuevo();
  assert.equal(banco.filtrar({ materia: [] }).length, 15);
});

test('filtra por un valor de faceta', () => {
  const banco = nuevo();
  assert.equal(banco.filtrar({ materia: ['geografia'] }).length, 10);
  assert.equal(banco.filtrar({ materia: ['astronomia'] }).length, 5);
});

test('varios valores de la misma faceta se suman', () => {
  const banco = nuevo();
  assert.equal(banco.filtrar({ materia: ['geografia', 'astronomia'] }).length, 15);
});

test('varias facetas se cruzan', () => {
  const banco = nuevo();
  assert.equal(banco.filtrar({ materia: ['geografia'], continente: ['america'] }).length, 3);
});

test('una faceta acumulativa arrastra los valores anteriores', () => {
  const banco = nuevo();
  // nivel es acumulativa: pedir "medio" tiene que incluir también "inicial".
  const inicial = banco.filtrar({ nivel: ['inicial'] }).length;
  const medio = banco.filtrar({ nivel: ['medio'] }).length;
  const avanzado = banco.filtrar({ nivel: ['avanzado'] }).length;

  assert.equal(inicial, 7);
  assert.equal(medio, 13);
  assert.equal(avanzado, 15);
  assert.ok(inicial < medio && medio < avanzado, 'cada nivel debe incluir al anterior');
});

test('en una faceta acumulativa manda el valor más alto seleccionado', () => {
  const banco = nuevo();
  assert.equal(banco.filtrar({ nivel: ['inicial', 'medio'] }).length,
    banco.filtrar({ nivel: ['medio'] }).length);
});

test('una pregunta sin la faceta pedida queda fuera', () => {
  const banco = nuevo();
  // Las de astronomía no declaran continente, así que no pueden colarse aquí.
  const r = banco.filtrar({ continente: ['europa', 'america'] });
  assert.equal(r.length, 10);
  assert.ok(r.every((p) => p.facetas.materia === 'geografia'));
});

test('idsPermitidos recorta el resultado', () => {
  const banco = nuevo();
  const r = banco.filtrar({ materia: ['geografia'] }, ['ej-geo-001', 'ej-ast-001']);
  assert.deepEqual(r.map((p) => p.id), ['ej-geo-001']);
});

test('disponibles cuenta por valor ignorando el criterio de su propio eje', () => {
  const banco = nuevo();
  const cuenta = banco.disponibles('continente', { materia: ['geografia'] });
  assert.deepEqual(cuenta, { europa: 7, america: 3 });

  // El criterio sobre la propia faceta no debe estrechar su recuento: si no, al
  // seleccionar un valor los demás se quedarían a cero y no se podrían añadir.
  const conSeleccion = banco.disponibles('continente', { materia: ['geografia'], continente: ['europa'] });
  assert.deepEqual(conSeleccion, cuenta);
});

test('aplicables oculta una faceta mientras su dependencia no se cumpla', () => {
  const banco = nuevo();
  assert.deepEqual(banco.aplicables({}).map((f) => f.id), ['materia', 'nivel']);
  assert.deepEqual(banco.aplicables({ materia: ['astronomia'] }).map((f) => f.id), ['materia', 'nivel']);
  assert.deepEqual(banco.aplicables({ materia: ['geografia'] }).map((f) => f.id),
    ['materia', 'continente', 'nivel']);
});

test('una faceta que no existe en el tema descarta todas las preguntas', () => {
  const banco = nuevo();
  assert.equal(banco.filtrar({ inventada: ['x'] }).length, 0);
});
