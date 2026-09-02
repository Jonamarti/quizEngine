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
    const k = argv[i].replace(/^--/, '');
    out[k] = argv[i + 1];
  }
  return out;
}

function copiarDir(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const entrada of fs.readdirSync(origen, { withFileTypes: true })) {
    const o = path.join(origen, entrada.name);
    const d = path.join(destino, entrada.name);
    if (entrada.isDirectory()) copiarDir(o, d);
    else fs.copyFileSync(o, d);
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

  const dirBanco = path.join(tema, 'banco');
  const banco = fs.existsSync(dirBanco)
    ? fs.readdirSync(dirBanco).filter((f) => f.endsWith('.js')).sort()
    : [];

  if (!banco.length) {
    console.error('El tema no tiene ningún fichero en banco/');
    process.exit(1);
  }

  fs.rmSync(salida, { recursive: true, force: true });
  copiarDir(path.join(raizMotor, 'web'), salida);

  fs.mkdirSync(path.join(salida, 'tema', 'banco'), { recursive: true });
  fs.copyFileSync(path.join(tema, 'config.js'), path.join(salida, 'tema', 'config.js'));
  for (const f of banco) {
    fs.copyFileSync(path.join(dirBanco, f), path.join(salida, 'tema', 'banco', f));
  }

  // Las imágenes de las preguntas viajan enteras al sitio: no se pueden servir
  // desde una URL externa porque el examen debe funcionar con file:// y sin
  // conexión. Las preguntas las referencian como "medios/loquesea.svg".
  const dirMedios = path.join(tema, 'medios');
  let medios = 0;
  if (fs.existsSync(dirMedios)) {
    copiarDir(dirMedios, path.join(salida, 'medios'));
    medios = fs.readdirSync(dirMedios).filter((f) => !f.startsWith('.')).length;
  }

  // Los <script> del tema se generan aquí. Añadir un fichero al banco no debería obligar a editar el index.html a mano
  const tags = ['<script src="tema/config.js"></script>']
    .concat(banco.map((f) => '<script src="tema/banco/' + f + '"></script>'))
    .join('\n  ');

  const indice = path.join(salida, 'index.html');
  let html = fs.readFileSync(indice, 'utf8');
  if (!html.includes('<!-- DATOS_DEL_TEMA -->')) {
    console.error('La plantilla no tiene el marcador <!-- DATOS_DEL_TEMA -->');
    process.exit(1);
  }
  html = html.replace('<!-- DATOS_DEL_TEMA -->', tags);
  fs.writeFileSync(indice, html);

  console.log('Construido en ' + salida);
  console.log('  ' + banco.length + ' fichero(s) de banco: ' + banco.join(', '));
  if (medios) console.log('  ' + medios + ' fichero(s) en medios/');
}

main();
