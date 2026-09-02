'use strict';

// Carga los módulos del motor y un tema dentro de un objeto que hace de global
// falso, para poder probarlos desde Node sin navegador.
//
// Funciona porque todos los ficheros de web/js terminan en
//   })(typeof window !== 'undefined' ? window : globalThis)
// así que basta con pasarles un "window" propio. Es el mismo truco que ya usaba
// combatQuiz/scripts/detectar-triviales.js para leer un banco sin require().

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

function ejecutar(ctx, fichero) {
  const src = fs.readFileSync(fichero, 'utf8');
  new Function('window', 'globalThis', src)(ctx, ctx);
}

// modulos: nombres sin extensión dentro de web/js, en orden de carga.
function cargarMotor(modulos) {
  const ctx = {};
  ctx.window = ctx;
  for (const m of modulos) ejecutar(ctx, path.join(RAIZ, 'web', 'js', m + '.js'));
  return ctx;
}

function cargarTema(ctx, dirTema) {
  const tema = path.resolve(RAIZ, dirTema);
  ctx.PREGUNTAS = [];
  delete ctx.TEMA;

  ejecutar(ctx, path.join(tema, 'config.js'));

  const dirBanco = path.join(tema, 'banco');
  const ficheros = fs.existsSync(dirBanco)
    ? fs.readdirSync(dirBanco).filter((f) => f.endsWith('.js')).sort()
    : [];
  for (const f of ficheros) ejecutar(ctx, path.join(dirBanco, f));

  return ctx;
}

// Atajo para el caso habitual: motor + tema de ejemplo, con el banco ya indexado.
function entorno(modulos, dirTema) {
  const ctx = cargarMotor(modulos);
  cargarTema(ctx, dirTema || 'pruebas/tema-ejemplo');
  if (ctx.QZ && ctx.QZ.banco) ctx.QZ.banco.init(ctx.PREGUNTAS, ctx.TEMA);
  return ctx;
}

module.exports = { RAIZ, cargarMotor, cargarTema, entorno };
