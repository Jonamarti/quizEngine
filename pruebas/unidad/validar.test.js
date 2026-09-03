'use strict';

// El validador se prueba como lo que es: un CLI. Lo que importa de él es el código
// de salida (lo encadena el CI) y que el mensaje diga qué regla se ha roto.
//
// Los temas inválidos se escriben aquí al vuelo, partiendo de uno válido y
// rompiendo una sola cosa. Tenerlos como ficheros en el repo obligaría a mantener
// una veintena de copias casi idénticas, y no se vería de un vistazo qué cambia
// en cada una.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const VALIDAR = path.join(RAIZ, 'scripts', 'validar.js');

function temaBase() {
  return {
    id: 'prueba',
    titulo: 'Tema de prueba',
    prefijoAlmacen: 'prueba_v1_',
    aprobado: 0.7,
    facetas: [
      { id: 'materia', etiqueta: 'Materia', valores: [{ id: 'a' }, { id: 'b' }] },
      { id: 'nivel', etiqueta: 'Nivel', acumulativa: true, valores: [{ id: 'uno' }, { id: 'dos' }] }
    ],
    presets: []
  };
}

function preguntaBase(n) {
  return {
    id: 'p-' + n,
    enunciado: 'Enunciado número ' + n,
    facetas: { materia: 'a', nivel: 'uno' },
    fuente: 'fuente de prueba',
    opciones: [
      { texto: 'Correcta ' + n, correcta: true, explicacion: 'Porque sí.' },
      { texto: 'Incorrecta ' + n, correcta: false, explicacion: 'Porque no.' }
    ]
  };
}

function bancoBase() {
  return [preguntaBase(1), preguntaBase(2), preguntaBase(3)];
}

// Serializa el tema con el mismo patrón de auto-registro que usa un tema real.
function escribirTema(dir, TEMA, preguntas) {
  fs.mkdirSync(path.join(dir, 'banco'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.js'),
    '(function (g) { g.TEMA = ' + JSON.stringify(TEMA, null, 2) + '; })' +
    '(typeof window !== "undefined" ? window : globalThis);\n');
  fs.writeFileSync(path.join(dir, 'banco', 'preguntas.js'),
    '(function (g) { g.PREGUNTAS = g.PREGUNTAS || [];' +
    ' g.PREGUNTAS.push.apply(g.PREGUNTAS, ' + JSON.stringify(preguntas, null, 2) + '); })' +
    '(typeof window !== "undefined" ? window : globalThis);\n');
  return dir;
}

function validar(dirTema) {
  const r = spawnSync(process.execPath, [VALIDAR, '--tema', dirTema], { encoding: 'utf8' });
  return { codigo: r.status, salida: (r.stdout || '') + (r.stderr || '') };
}

// Rompe el tema base con `mutar` y devuelve el resultado de validarlo.
function validarRoto(t, mutar) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qz-tema-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const TEMA = temaBase();
  const preguntas = bancoBase();
  mutar(TEMA, preguntas);
  return validar(escribirTema(dir, TEMA, preguntas));
}

test('un tema correcto pasa y sale con 0', (t) => {
  const r = validarRoto(t, () => {});
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /Validación correcta/);
  assert.match(r.salida, /3 preguntas/);
});

test('el tema de ejemplo del repo sigue siendo válido', () => {
  const r = validar(path.join(RAIZ, 'pruebas', 'tema-ejemplo'));
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /15 preguntas en 2 fichero\(s\)/);
});

test('id duplicado', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[1].id = p[0].id; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /id duplicado/);
});

test('enunciado repetido, aunque cambie la caja', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[1].enunciado = p[0].enunciado.toUpperCase(); });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /enunciado repetido/);
});

test('una opción incorrecta sin explicación también falla', (t) => {
  const r = validarRoto(t, (TEMA, p) => { delete p[0].opciones[1].explicacion; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /no tiene explicación/);
});

test('el número de correctas tiene que cuadrar con seleccionar', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[0].opciones[1].correcta = true; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /2 opciones correctas pero seleccionar es 1/);
});

test('seleccionar 2 con una sola correcta falla', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[0].seleccionar = 2; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /1 opciones correctas pero seleccionar es 2/);
});

test('textos de opción repetidos dentro de una pregunta', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[0].opciones[1].texto = p[0].opciones[0].texto; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /texto de opción repetido/);
});

test('menos de dos opciones', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[0].opciones = [p[0].opciones[0]]; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /al menos 2 opciones/);
});

test('una faceta que el tema no declara', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[0].facetas.inventada = 'x'; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /no está declarada en TEMA\.facetas/);
});

test('un valor que la faceta no declara', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[0].facetas.materia = 'z'; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /valor "z" no declarado en la faceta "materia"/);
});

test('una pregunta sin facetas no se podría filtrar', (t) => {
  const r = validarRoto(t, (TEMA, p) => { p[0].facetas = {}; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /sin facetas/);
});

test('falta prefijoAlmacen', (t) => {
  const r = validarRoto(t, (TEMA) => { delete TEMA.prefijoAlmacen; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /prefijoAlmacen es obligatorio/);
});

test('una faceta acumulativa sin valores no tiene orden', (t) => {
  const r = validarRoto(t, (TEMA) => { delete TEMA.facetas[1].valores; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /acumulativa pero no declara valores/);
});

test('aprobado fuera de la horquilla 0-1', (t) => {
  const r = validarRoto(t, (TEMA) => { TEMA.aprobado = 70; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /fracción entre 0 y 1/);
});

test('una pregunta sin fuente es aviso, no error', (t) => {
  const r = validarRoto(t, (TEMA, p) => { delete p[0].fuente; });
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /1 aviso\(s\)/);
  assert.match(r.salida, /sin fuente/);
});

test('el mensaje dice de qué fichero y de qué pregunta se trata', (t) => {
  const r = validarRoto(t, (TEMA, p) => { delete p[2].opciones[0].explicacion; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /preguntas\.js · p-3/);
});

test('la cobertura cruza dos facetas y señala los huecos', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qz-tema-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  escribirTema(dir, temaBase(), bancoBase());

  const r = spawnSync(process.execPath,
    [VALIDAR, '--tema', dir, '--cobertura', 'materia,nivel'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Cobertura materia x nivel/);
  // Todas las preguntas del banco base son a/uno: las otras tres celdas están vacías.
  assert.match(r.stdout, /3 combinación\(es\) sin preguntas/);
});

// ---- imagen de una pregunta
//
// Una imagen rota no rompe la carga de la página: la pregunta aparece sin ella y
// se vuelve incontestable, porque lo que hay que identificar es el dibujo. De ahí
// que el validador tenga que ser estricto aquí.

function conImagen(t, imagen) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qz-tema-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const preguntas = bancoBase();
  preguntas[0].imagen = imagen;
  escribirTema(dir, temaBase(), preguntas);
  fs.mkdirSync(path.join(dir, 'medios'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'medios', 'existe.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return validar(dir);
}

test('una imagen correcta pasa la validación', (t) => {
  const r = conImagen(t, { src: 'medios/existe.svg', alt: 'Un dibujo', credito: 'Autoría propia' });
  assert.equal(r.codigo, 0, r.salida);
});

test('una imagen que apunta a un fichero inexistente falla', (t) => {
  const r = conImagen(t, { src: 'medios/no-esta.svg', alt: 'Un dibujo', credito: 'x' });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /no existe el fichero de imagen/);
});

test('una imagen sin texto alternativo falla', (t) => {
  const r = conImagen(t, { src: 'medios/existe.svg', credito: 'x' });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /no tiene texto alternativo/);
});

test('una imagen alojada fuera del tema falla', (t) => {
  // El examen se abre con file:// y sin conexión: una URL externa se vería como
  // un hueco justo en la pregunta que depende de verla.
  const r = conImagen(t, { src: 'https://example.org/foto.png', alt: 'Un dibujo', credito: 'x' });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /URL externa/);
});

test('una imagen fuera de medios/ falla', (t) => {
  const r = conImagen(t, { src: 'otra-carpeta/foto.svg', alt: 'Un dibujo', credito: 'x' });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /debe empezar por "medios\/"/);
});

test('una imagen sin crédito es aviso, no error', (t) => {
  const r = conImagen(t, { src: 'medios/existe.svg', alt: 'Un dibujo' });
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /no declara crédito/);
});

test('imagen que no es un objeto falla', (t) => {
  const r = conImagen(t, 'medios/existe.svg');
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /debe ser un objeto/);
});

// ---- grupos de exámenes
//
// Los grupos ordenan el listado. Un preset que apunte a un grupo inexistente no
// rompe la pantalla —cae en «Otros»— pero traiciona lo que quiso su autor.

function conGrupos(t, mutar) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qz-tema-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const TEMA = temaBase();
  TEMA.grupos = [{ id: 'uno', etiqueta: 'Grupo uno' }, { id: 'dos', etiqueta: 'Grupo dos' }];
  TEMA.presets = [
    { id: 'p-uno', grupo: 'uno', titulo: 'A', filtros: {}, n: 2 },
    { id: 'p-dos', grupo: 'dos', titulo: 'B', filtros: {}, n: 2 }
  ];
  mutar(TEMA);
  return validar(escribirTema(dir, TEMA, bancoBase()));
}

test('un tema con grupos bien declarados pasa', (t) => {
  const r = conGrupos(t, () => {});
  assert.equal(r.codigo, 0, r.salida);
});

test('un preset con un grupo no declarado falla', (t) => {
  const r = conGrupos(t, (TEMA) => { TEMA.presets[0].grupo = 'inventado'; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /el grupo "inventado" no está declarado/);
});

test('un grupo sin id falla', (t) => {
  const r = conGrupos(t, (TEMA) => { TEMA.grupos.push({ etiqueta: 'Sin id' }); });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /no tiene id/);
});

test('dos grupos con el mismo id fallan', (t) => {
  const r = conGrupos(t, (TEMA) => { TEMA.grupos.push({ id: 'uno', etiqueta: 'Repe' }); });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /Grupo duplicado: "uno"/);
});

test('un preset sin grupo, habiendo grupos, es aviso y no error', (t) => {
  const r = conGrupos(t, (TEMA) => { delete TEMA.presets[1].grupo; });
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /sin grupo/);
});

test('un grupo sin etiqueta es aviso', (t) => {
  const r = conGrupos(t, (TEMA) => { delete TEMA.grupos[0].etiqueta; });
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /no tiene etiqueta/);
});

test('grupos que no es un array falla', (t) => {
  const r = conGrupos(t, (TEMA) => { TEMA.grupos = 'geografia'; });
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /debe ser un array/);
});

test('un tema sin grupos sigue siendo válido', (t) => {
  const r = validarRoto(t, () => {});
  assert.equal(r.codigo, 0, r.salida);
});
