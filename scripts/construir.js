#!/usr/bin/env node
'use strict';

// Une el motor con una carpeta de tema y produce un sitio estático.
//
//   node scripts/construir.js --tema <ruta> --salida <ruta>
//
// La salida se abre con doble clic, sin servidor. Por eso los datos entran como
// <script src> y no por fetch: file:// bloquea las peticiones.

const fs = require('fs');
const path = require('path');

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || !argv[i + 1]) {
      throw new Error('Uso: quiz-construir --tema <ruta> --salida <ruta>');
    }
    const k = argv[i].slice(2);
    if (k !== 'tema' && k !== 'salida') throw new Error('Argumento desconocido: --' + k);
    out[k] = argv[i + 1];
  }
  return out;
}

function copiarDir(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const entrada of fs.readdirSync(origen, { withFileTypes: true })) {
    const o = path.join(origen, entrada.name);
    const d = path.join(destino, entrada.name);
    if (entrada.isSymbolicLink()) {
      throw new Error('No se copian enlaces simbólicos: ' + o);
    }
    if (entrada.isDirectory()) copiarDir(o, d);
    else if (entrada.isFile()) fs.copyFileSync(o, d);
  }
}

function exigirFicheroRegular(fichero) {
  const st = fs.lstatSync(fichero);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error('Se esperaba un fichero regular, no un enlace: ' + fichero);
  }
}

function contiene(padre, hijo) {
  const rel = path.relative(padre, hijo);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

function comprobarRutas(raizMotor, tema, salida) {
  const motorReal = fs.realpathSync(path.join(raizMotor, 'web'));
  const temaReal = fs.realpathSync(tema);
  const salidaAbs = path.resolve(salida);

  if (fs.existsSync(salidaAbs) && fs.lstatSync(salidaAbs).isSymbolicLink()) {
    throw new Error('La salida no puede ser un enlace simbólico: ' + salidaAbs);
  }
  const salidaReal = fs.existsSync(salidaAbs) ? fs.realpathSync(salidaAbs) : salidaAbs;
  if (contiene(salidaReal, motorReal) || contiene(motorReal, salidaReal)) {
    throw new Error('La salida no puede solaparse con el motor: ' + salidaAbs);
  }
  if (contiene(salidaReal, temaReal) || contiene(temaReal, salidaReal)) {
    throw new Error('La salida no puede solaparse con el tema: ' + salidaAbs);
  }
}

function main() {
  const a = args(process.argv);
  const raizMotor = path.resolve(__dirname, '..');
  const tema = path.resolve(a.tema || 'tema');
  const salida = path.resolve(a.salida || 'web');

  if (!fs.existsSync(path.join(tema, 'config.js'))) {
    console.error('No encuentro ' + path.join(tema, 'config.js'));
    process.exit(1);
  }
  exigirFicheroRegular(path.join(tema, 'config.js'));

  const dirBanco = path.join(tema, 'banco');
  const banco = fs.existsSync(dirBanco)
    ? fs.readdirSync(dirBanco).filter((f) => f.endsWith('.js')).sort()
    : [];

  if (!banco.length) {
    console.error('El tema no tiene ningún fichero en banco/');
    process.exit(1);
  }
  banco.forEach((f) => exigirFicheroRegular(path.join(dirBanco, f)));

  comprobarRutas(raizMotor, tema, salida);

  const plantilla = path.join(raizMotor, 'web', 'index.html');
  const htmlPlantilla = fs.readFileSync(plantilla, 'utf8');
  if (!htmlPlantilla.includes('<!-- DATOS_DEL_TEMA -->')) {
    console.error('La plantilla no tiene el marcador <!-- DATOS_DEL_TEMA -->');
    process.exit(1);
  }

  // Se prepara en un hermano temporal y sólo se sustituye el destino cuando la
  // construcción ha terminado. Un error deja intacto el sitio anterior.
  const temporal = salida + '.tmp-' + process.pid + '-' + Date.now();
  fs.rmSync(temporal, { recursive: true, force: true });

  try {
    copiarDir(path.join(raizMotor, 'web'), temporal);

    fs.mkdirSync(path.join(temporal, 'tema', 'banco'), { recursive: true });
    fs.copyFileSync(path.join(tema, 'config.js'), path.join(temporal, 'tema', 'config.js'));
    for (const f of banco) {
      fs.copyFileSync(path.join(dirBanco, f), path.join(temporal, 'tema', 'banco', f));
    }

  // Las imágenes de las preguntas viajan enteras al sitio: no se pueden servir
  // desde una URL externa porque el examen debe funcionar con file:// y sin
  // conexión. Las preguntas las referencian como "medios/loquesea.svg".
    const dirMedios = path.join(tema, 'medios');
    let medios = 0;
    if (fs.existsSync(dirMedios)) {
      copiarDir(dirMedios, path.join(temporal, 'medios'));
      medios = fs.readdirSync(dirMedios).filter((f) => !f.startsWith('.')).length;
    }

  // Los <script> del tema se generan aquí. Añadir un fichero al banco no debería obligar a editar el index.html a mano
  const tags = ['<script src="tema/config.js"></script>']
    .concat(banco.map((f) => '<script src="tema/banco/' + f + '"></script>'))
    .join('\n  ');

    const indice = path.join(temporal, 'index.html');
    const html = htmlPlantilla.replace('<!-- DATOS_DEL_TEMA -->', tags);
    fs.writeFileSync(indice, html);

    const respaldo = salida + '.bak-' + process.pid + '-' + Date.now();
    const habiaSalida = fs.existsSync(salida);
    if (habiaSalida) fs.renameSync(salida, respaldo);
    try {
      fs.renameSync(temporal, salida);
      if (habiaSalida) fs.rmSync(respaldo, { recursive: true, force: true });
    } catch (e) {
      if (habiaSalida && !fs.existsSync(salida) && fs.existsSync(respaldo)) {
        fs.renameSync(respaldo, salida);
      }
      throw e;
    }

    console.log('Construido en ' + salida);
    console.log('  ' + banco.length + ' fichero(s) de banco: ' + banco.join(', '));
    if (medios) console.log('  ' + medios + ' fichero(s) en medios/');
  } catch (e) {
    fs.rmSync(temporal, { recursive: true, force: true });
    throw e;
  }
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
