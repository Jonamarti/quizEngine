'use strict';

// El constructor también es un CLI: se prueba lanzándolo y mirando lo que deja
// en disco. Lo que no puede fallar nunca es la inyección de los <script> del
// tema, porque un fallo ahí produce un sitio que carga pero sale vacío.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const CONSTRUIR = path.join(RAIZ, 'scripts', 'construir.js');
const EJEMPLO = path.join(RAIZ, 'pruebas', 'tema-ejemplo');

function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qz-build-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function construir(tema, salida) {
  const r = spawnSync(process.execPath, [CONSTRUIR, '--tema', tema, '--salida', salida],
    { encoding: 'utf8' });
  return { codigo: r.status, salida: (r.stdout || '') + (r.stderr || '') };
}

test('construye un sitio completo a partir del tema de ejemplo', (t) => {
  const dir = tmp(t);
  const destino = path.join(dir, 'sitio');
  const r = construir(EJEMPLO, destino);

  assert.equal(r.codigo, 0, r.salida);
  for (const f of ['index.html', 'css/estilos.css', 'js/app.js', 'js/banco.js', 'js/examen.js']) {
    assert.ok(fs.existsSync(path.join(destino, f)), 'falta ' + f);
  }
  assert.ok(fs.existsSync(path.join(destino, 'tema', 'config.js')));
  assert.ok(fs.existsSync(path.join(destino, 'tema', 'banco', 'geografia.js')));
  assert.ok(fs.existsSync(path.join(destino, 'tema', 'banco', 'astronomia.js')));
});

test('el marcador se sustituye por un script por fichero, en orden alfabético', (t) => {
  const dir = tmp(t);
  const destino = path.join(dir, 'sitio');
  construir(EJEMPLO, destino);

  const html = fs.readFileSync(path.join(destino, 'index.html'), 'utf8');
  assert.ok(!html.includes('DATOS_DEL_TEMA'), 'el marcador tiene que desaparecer');

  const srcs = [...html.matchAll(/<script src="(tema\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(srcs, [
    'tema/config.js',
    'tema/banco/astronomia.js',
    'tema/banco/geografia.js'
  ]);

  // config.js va primero porque el banco y las vistas leen TEMA al cargarse.
  assert.ok(html.indexOf('tema/config.js') < html.indexOf('tema/banco/'));
  // Y todo el tema, antes que los módulos del motor.
  assert.ok(html.indexOf('tema/banco/geografia.js') < html.indexOf('js/app.js'));
});

test('los script inyectados salen con la misma sangría', (t) => {
  const dir = tmp(t);
  const destino = path.join(dir, 'sitio');
  construir(EJEMPLO, destino);

  const html = fs.readFileSync(path.join(destino, 'index.html'), 'utf8');
  const sangrias = html.split('\n')
    .filter((l) => l.includes('<script src="tema/'))
    .map((l) => l.match(/^ */)[0].length);
  assert.equal(sangrias.length, 3);
  assert.equal(new Set(sangrias).size, 1, 'sangrías dispares: ' + sangrias.join(','));
});

test('el sitio construido carga el tema entero', (t) => {
  const dir = tmp(t);
  const destino = path.join(dir, 'sitio');
  construir(EJEMPLO, destino);

  // Se cargan los ficheros copiados, no los originales: así se comprueba que la
  // copia llegó completa y no truncada.
  const ctx = {};
  ctx.window = ctx;
  ctx.PREGUNTAS = [];
  const cargar = (f) => new Function('window', 'globalThis',
    fs.readFileSync(path.join(destino, f), 'utf8'))(ctx, ctx);

  cargar('tema/config.js');
  cargar('tema/banco/astronomia.js');
  cargar('tema/banco/geografia.js');

  assert.equal(ctx.TEMA.id, 'ejemplo');
  assert.equal(ctx.PREGUNTAS.length, 14);
});

test('reconstruir sobre el mismo destino no deja restos de la vez anterior', (t) => {
  const dir = tmp(t);
  const destino = path.join(dir, 'sitio');
  construir(EJEMPLO, destino);

  const sobra = path.join(destino, 'tema', 'banco', 'zzz-viejo.js');
  fs.writeFileSync(sobra, '// banco retirado del tema');
  construir(EJEMPLO, destino);

  assert.ok(!fs.existsSync(sobra), 'el destino debe limpiarse antes de copiar');
  const html = fs.readFileSync(path.join(destino, 'index.html'), 'utf8');
  assert.ok(!html.includes('zzz-viejo'));
  // Y el marcador no puede aplicarse dos veces sobre un index ya construido.
  assert.equal([...html.matchAll(/tema\/config\.js/g)].length, 1);
});

test('falla si el tema no tiene config.js', (t) => {
  const dir = tmp(t);
  fs.mkdirSync(path.join(dir, 'tema-vacio', 'banco'), { recursive: true });
  const r = construir(path.join(dir, 'tema-vacio'), path.join(dir, 'sitio'));
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /config\.js/);
});

test('falla si el banco está vacío', (t) => {
  const dir = tmp(t);
  const tema = path.join(dir, 'tema-sin-banco');
  fs.mkdirSync(path.join(tema, 'banco'), { recursive: true });
  fs.writeFileSync(path.join(tema, 'config.js'), '(function (g) { g.TEMA = {}; })(globalThis);');
  const r = construir(tema, path.join(dir, 'sitio'));
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /ningún fichero en banco/);
});

test('falla si la plantilla del motor ha perdido el marcador', (t) => {
  const dir = tmp(t);
  const destino = path.join(dir, 'sitio');

  // Se construye una vez y se vuelve a construir usando la salida como motor:
  // su index.html ya no tiene el marcador.
  construir(EJEMPLO, destino);
  const motorFalso = path.join(dir, 'motor-falso');
  fs.mkdirSync(path.join(motorFalso, 'scripts'), { recursive: true });
  fs.cpSync(destino, path.join(motorFalso, 'web'), { recursive: true });
  fs.copyFileSync(CONSTRUIR, path.join(motorFalso, 'scripts', 'construir.js'));

  const r = spawnSync(process.execPath,
    [path.join(motorFalso, 'scripts', 'construir.js'),
      '--tema', EJEMPLO, '--salida', path.join(dir, 'otro')], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /marcador/);
});
