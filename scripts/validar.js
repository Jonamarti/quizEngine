#!/usr/bin/env node
'use strict';

// Valida un tema contra el contrato de ESQUEMA.md y saca un informe de cobertura.
//
//   node scripts/validar.js --tema <ruta> [--cobertura <faceta>,<faceta>]
//
// Sale con código 1 si hay errores, para poder encadenarlo en CI.

const fs = require('fs');
const path = require('path');

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || !argv[i + 1]) {
      throw new Error('Uso: quiz-validar --tema <ruta> [--cobertura <faceta>,<faceta>]');
    }
    const k = argv[i].slice(2);
    if (k !== 'tema' && k !== 'cobertura') throw new Error(`Argumento desconocido: --${k}`);
    out[k] = argv[i + 1];
  }
  return out;
}

let RAIZ_TEMA = null;   // carpeta del tema, para resolver las rutas de medios/

const errores = [];
const avisos = [];
const err = (m) => errores.push(m);
const avi = (m) => avisos.push(m);
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const esObjeto = (x) => x && typeof x === 'object' && !Array.isArray(x);

function validarId(id, donde) {
  if (typeof id !== 'string' || !ID_RE.test(id) || ['__proto__', 'prototype', 'constructor'].includes(id)) {
    err(`${donde} debe usar sólo letras ASCII, números, "_" o "-", y empezar por letra o número`);
    return false;
  }
  return true;
}

// Los ficheros del tema son los mismos que carga el navegador: se registran solos
// en globalThis. Al requerirlos uno a uno sabemos de qué fichero sale cada
// pregunta, que es lo que hace legibles los mensajes de error.
function cargar(tema) {
  const g = globalThis;
  g.PREGUNTAS = [];
  delete g.TEMA;

  const config = path.join(tema, 'config.js');
  if (!fs.existsSync(config) || !fs.statSync(config).isFile()) {
    throw new Error(`No encuentro ${config}`);
  }
  require(config);

  if (!Array.isArray(g.PREGUNTAS)) {
    throw new Error('window.PREGUNTAS debe ser un array');
  }

  const dirBanco = path.join(tema, 'banco');
  const ficheros = fs.existsSync(dirBanco)
    ? fs.readdirSync(dirBanco).filter((f) => f.endsWith('.js')).sort()
    : [];

  const procedencia = {};
  for (const f of ficheros) {
    const antes = g.PREGUNTAS.length;
    require(path.join(dirBanco, f));
    if (!Array.isArray(g.PREGUNTAS)) throw new Error(`${f} ha reemplazado PREGUNTAS por un valor que no es un array`);
    for (let i = antes; i < g.PREGUNTAS.length; i++) {
      const p = g.PREGUNTAS[i];
      if (p && p.id) procedencia[p.id] = f;
    }
  }
  return { TEMA: g.TEMA, preguntas: g.PREGUNTAS, ficheros, procedencia };
}

function validarTema(TEMA) {
  if (!esObjeto(TEMA)) return err('config.js no define window.TEMA como objeto');
  if (!TEMA.id) err('TEMA.id es obligatorio');
  else validarId(TEMA.id, 'TEMA.id');
  if (typeof TEMA.titulo !== 'string' || !TEMA.titulo.trim()) err('TEMA.titulo es obligatorio y debe ser texto');
  if (typeof TEMA.prefijoAlmacen !== 'string' || !TEMA.prefijoAlmacen) {
    err('TEMA.prefijoAlmacen es obligatorio: sin él, dos temas en el mismo origen se pisan el localStorage');
  }
  if (TEMA.aprobado != null && (typeof TEMA.aprobado !== 'number' || TEMA.aprobado <= 0 || TEMA.aprobado > 1)) {
    err('TEMA.aprobado debe ser una fracción entre 0 y 1');
  }
  if (TEMA.aviso !== undefined && (typeof TEMA.aviso !== 'string' || !TEMA.aviso.trim())) {
    err('TEMA.aviso, si se declara, debe ser texto no vacío');
  }
  if (!Array.isArray(TEMA.facetas) || !TEMA.facetas.length) {
    err('TEMA.facetas debe ser un array con al menos una faceta');
  }
  const idsFaceta = new Set();
  const facetas = Array.isArray(TEMA.facetas) ? TEMA.facetas : [];
  facetas.forEach((f, i) => {
    if (!esObjeto(f)) return err(`La faceta en posición ${i} debe ser un objeto`);
    if (!f.id) err('Hay una faceta sin id');
    else {
      validarId(f.id, `TEMA.facetas[${i}].id`);
      if (idsFaceta.has(f.id)) err(`Faceta duplicada: "${f.id}"`);
      idsFaceta.add(f.id);
    }
    if (f.valores !== undefined && !Array.isArray(f.valores)) err(`La faceta "${f.id}" tiene valores que no son un array`);
    const valores = new Set();
    (Array.isArray(f.valores) ? f.valores : []).forEach((v, j) => {
      if (!esObjeto(v) || !v.id) return err(`La faceta "${f.id}" tiene un valor sin id en posición ${j}`);
      validarId(v.id, `valor de la faceta "${f.id}"`);
      if (valores.has(v.id)) err(`Valor duplicado "${v.id}" en la faceta "${f.id}"`);
      valores.add(v.id);
    });
    if (f.acumulativa && !(f.valores && f.valores.length)) {
      err(`La faceta "${f.id}" es acumulativa pero no declara valores, y el orden sale de ahí`);
    }
  });

  facetas.forEach((f) => {
    if (!esObjeto(f) || f.dependeDe === undefined) return;
    if (!esObjeto(f.dependeDe)) return err(`dependeDe de la faceta "${f.id}" debe ser un objeto`);
    Object.keys(f.dependeDe).forEach((padre) => {
      if (!idsFaceta.has(padre)) err(`La faceta "${f.id}" depende de una faceta inexistente: "${padre}"`);
    });
  });
  detectarCiclos(facetas);

  if (TEMA.duraciones !== undefined && !Array.isArray(TEMA.duraciones)) err('TEMA.duraciones debe ser un array');
  const durIds = new Set();
  (Array.isArray(TEMA.duraciones) ? TEMA.duraciones : []).forEach((d, i) => {
    if (!esObjeto(d) || typeof d.valor !== 'string' || !d.valor || typeof d.etiqueta !== 'string' ||
        !Number.isFinite(d.minutos) || d.minutos < 0) {
      return err(`TEMA.duraciones[${i}] debe contener valor, etiqueta y minutos >= 0`);
    }
    if (durIds.has(d.valor)) err(`Duración duplicada: "${d.valor}"`);
    durIds.add(d.valor);
  });
  if (TEMA.tamanos !== undefined && (!Array.isArray(TEMA.tamanos) ||
      TEMA.tamanos.some((n) => !Number.isInteger(n) || n < 1))) {
    err('TEMA.tamanos debe ser un array de enteros positivos');
  }
  if (TEMA.presets !== undefined && !Array.isArray(TEMA.presets)) err('TEMA.presets debe ser un array');

  validarGrupos(TEMA);
}

function detectarCiclos(facetas) {
  const porId = new Map(facetas.filter(esObjeto).map((f) => [f.id, f]));
  const visitando = new Set(), vistos = new Set();
  function visitar(id) {
    if (visitando.has(id)) return true;
    if (vistos.has(id) || !porId.has(id)) return false;
    visitando.add(id);
    const d = porId.get(id).dependeDe || {};
    const ciclo = Object.keys(d).some(visitar);
    visitando.delete(id); vistos.add(id);
    return ciclo;
  }
  porId.forEach((_, id) => { if (visitar(id)) err(`Ciclo en dependencias de facetas alrededor de "${id}"`); });
}

// Los grupos ordenan el listado de exámenes. Un preset que apunte a un grupo
// inexistente no rompe la pantalla —cae en la sección «Otros»—, pero sí traiciona
// la intención de quien lo escribió, así que se avisa aquí y no en el navegador.
function validarGrupos(TEMA) {
  const grupos = TEMA.grupos;
  if (grupos !== undefined && !Array.isArray(grupos)) {
    return err('TEMA.grupos debe ser un array');
  }

  const declarados = new Set();
  (grupos || []).forEach((gr, i) => {
    if (!gr || !gr.id) return err(`El grupo en la posición ${i} no tiene id`);
    if (declarados.has(gr.id)) err(`Grupo duplicado: "${gr.id}"`);
    declarados.add(gr.id);
    if (!gr.etiqueta) avi(`El grupo "${gr.id}" no tiene etiqueta; se mostrará su id`);
  });

  const presets = Array.isArray(TEMA.presets) ? TEMA.presets : [];
  presets.forEach((p) => {
    const donde = `preset "${(p && p.id) || '?'}"`;
    if (p && p.grupo && !declarados.has(p.grupo)) {
      err(`${donde}: el grupo "${p.grupo}" no está declarado en TEMA.grupos`);
    }
  });

  if (declarados.size) {
    const sueltos = presets.filter((p) => p && !p.grupo).map((p) => p.id);
    if (sueltos.length) {
      avi(`Hay grupos declarados pero ${sueltos.length} preset(s) sin grupo, ` +
        `que saldrán en "Otros": ${sueltos.join(', ')}`);
    }
  }
}

function validarPreguntas(TEMA, preguntas, procedencia) {
  const declaradas = Object.create(null);
  (Array.isArray(TEMA.facetas) ? TEMA.facetas : []).filter(esObjeto).forEach((f) => {
    declaradas[f.id] = f.valores ? f.valores.map((v) => v.id) : null;   // null = abierta
  });

  const vistos = new Set();
  const enunciados = new Map();

  preguntas.forEach((p, i) => {
    if (!esObjeto(p)) return err(`Pregunta en posición ${i}: debe ser un objeto`);
    const donde = `${procedencia[p.id] || '?'} · ${p.id || '(sin id, pos ' + i + ')'}`;

    if (!p.id) return err(`${donde}: falta id`);
    validarId(p.id, `${donde}: id`);
    if (vistos.has(p.id)) err(`${donde}: id duplicado`);
    vistos.add(p.id);

    if (!p.enunciado || !String(p.enunciado).trim()) err(`${donde}: enunciado vacío`);
    else {
      const clave = String(p.enunciado).trim().toLowerCase();
      if (enunciados.has(clave)) {
        const anterior = enunciados.get(clave);
        if (!p.varianteDe || p.varianteDe !== anterior.varianteDe) {
          err(`${donde}: enunciado repetido, ya está en ${anterior.id}; declara el mismo varianteDe en ambas si son variantes deliberadas`);
        }
      } else enunciados.set(clave, { id: p.id, varianteDe: p.varianteDe });
    }

    if (!Array.isArray(p.opciones) || p.opciones.length < 2) {
      return err(`${donde}: hacen falta al menos 2 opciones`);
    }
    if (p.opciones.length > 8) err(`${donde}: ${p.opciones.length} opciones, el máximo es 8`);

    const textos = new Set();
    let correctas = 0;
    p.opciones.forEach((o, j) => {
      if (!o || !o.texto || !String(o.texto).trim()) err(`${donde}: opción ${j} sin texto`);
      else {
        const k = String(o.texto).trim().toLowerCase();
        if (textos.has(k)) err(`${donde}: texto de opción repetido ("${o.texto}")`);
        textos.add(k);
      }
      // La explicación se exige también en las incorrectas
      if (!o || !o.explicacion || !String(o.explicacion).trim()) {
        err(`${donde}: la opción ${j} no tiene explicación`);
      }
      if (o && o.correcta !== undefined && typeof o.correcta !== 'boolean') {
        err(`${donde}: opción ${j}, "correcta" debe ser booleano`);
      }
      if (o && o.correcta) correctas++;
    });

    const pedidas = p.seleccionar || 1;
    if (p.seleccionar !== undefined && (!Number.isInteger(p.seleccionar) || p.seleccionar < 1)) {
      err(`${donde}: seleccionar debe ser un entero >= 1`);
    }
    if (correctas !== pedidas) {
      err(`${donde}: ${correctas} opciones correctas pero seleccionar es ${pedidas}`);
    }

    if (!esObjeto(p.facetas) || !Object.keys(p.facetas).length) {
      err(`${donde}: sin facetas, no se podrá filtrar`);
    } else {
      Object.keys(p.facetas).forEach((k) => {
        if (!(k in declaradas)) {
          return err(`${donde}: la faceta "${k}" no está declarada en TEMA.facetas`);
        }
        const permitidos = declaradas[k];
        if (!permitidos) return;
        const vs = Array.isArray(p.facetas[k]) ? p.facetas[k] : [p.facetas[k]];
        vs.forEach((v) => {
          if (permitidos.indexOf(v) === -1) {
            err(`${donde}: valor "${v}" no declarado en la faceta "${k}"`);
          }
        });
      });
    }

    if (!p.fuente) avi(`${donde}: sin fuente, no se podrá rastrear de dónde sale`);

    if (p.imagen !== undefined) validarImagen(p, donde);
  });
}

// Una imagen rota no rompe la carga: la pregunta simplemente aparece sin ella y
// se vuelve incontestable, porque lo que hay que identificar es justo el dibujo.
// Por eso el fichero se comprueba aquí y no en el navegador.
function validarImagen(p, donde) {
  const img = p.imagen;
  if (!img || typeof img !== 'object' || Array.isArray(img)) {
    return err(`${donde}: "imagen" debe ser un objeto con al menos src y alt`);
  }
  if (!img.src || !String(img.src).trim()) {
    return err(`${donde}: la imagen no tiene src`);
  }
  if (/^([a-z]+:)?\/\//i.test(img.src)) {
    err(`${donde}: la imagen apunta a una URL externa (${img.src}); tiene que ser un fichero del tema, porque el examen se abre con file:// y sin conexión`);
  } else if (!img.src.startsWith('medios/')) {
    err(`${donde}: la ruta de la imagen debe empezar por "medios/", y es "${img.src}"`);
  } else {
    const raizMedios = path.resolve(RAIZ_TEMA, 'medios');
    const fichero = path.resolve(RAIZ_TEMA, img.src);
    const rel = path.relative(raizMedios, fichero);
    if (rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel)) {
      err(`${donde}: la imagen sale de la carpeta medios/ después de normalizar la ruta`);
    } else if (!fs.existsSync(fichero) || !fs.statSync(fichero).isFile()) {
      err(`${donde}: no existe el fichero de imagen ${img.src}`);
    }
  }
  // El texto alternativo no puede describir la respuesta: un lector de pantalla
  // leería "tai-otoshi" y resolvería la pregunta.
  if (!img.alt || !String(img.alt).trim()) {
    err(`${donde}: la imagen no tiene texto alternativo (alt)`);
  }
  if (!img.credito) {
    avi(`${donde}: la imagen no declara crédito; las licencias tipo CC BY-SA exigen atribuir`);
  }
}

function validarPresets(TEMA, preguntas) {
  const facetas = new Map((Array.isArray(TEMA.facetas) ? TEMA.facetas : [])
    .filter(esObjeto).map((f) => [f.id, f]));
  const preguntasIds = new Set(preguntas.filter(esObjeto).map((p) => p.id));
  const ids = new Set();
  (Array.isArray(TEMA.presets) ? TEMA.presets : []).forEach((p, i) => {
    const donde = `TEMA.presets[${i}]`;
    if (!esObjeto(p)) return err(`${donde} debe ser un objeto`);
    if (!p.id) err(`${donde}.id es obligatorio`);
    else {
      validarId(p.id, `${donde}.id`);
      if (ids.has(p.id)) err(`Preset duplicado: "${p.id}"`);
      ids.add(p.id);
    }
    if (typeof p.titulo !== 'string' || !p.titulo.trim()) err(`${donde}.titulo es obligatorio`);
    if (p.n !== undefined && (!Number.isInteger(p.n) || p.n < 1)) err(`${donde}.n debe ser un entero positivo`);
    if (p.barajarOpciones !== undefined && typeof p.barajarOpciones !== 'boolean') err(`${donde}.barajarOpciones debe ser booleano`);
    if (p.barajarPreguntas !== undefined && typeof p.barajarPreguntas !== 'boolean') err(`${donde}.barajarPreguntas debe ser booleano`);
    if (p.ids !== undefined) {
      if (!Array.isArray(p.ids) || !p.ids.length || p.ids.some((id) => typeof id !== 'string')) {
        err(`${donde}.ids debe ser un array no vacío de IDs`);
      } else {
        if (new Set(p.ids).size !== p.ids.length) err(`${donde}.ids contiene duplicados`);
        p.ids.forEach((id) => { if (!preguntasIds.has(id)) err(`${donde}.ids referencia una pregunta inexistente: "${id}"`); });
        if (p.n !== undefined && p.n > p.ids.length) err(`${donde}.n excede el número de IDs`);
      }
    }
    if (p.filtros !== undefined && !esObjeto(p.filtros)) err(`${donde}.filtros debe ser un objeto`);
    Object.keys(esObjeto(p.filtros) ? p.filtros : {}).forEach((k) => {
      const f = facetas.get(k), vs = p.filtros[k];
      if (!f) return err(`${donde}.filtros usa una faceta inexistente: "${k}"`);
      if (!Array.isArray(vs)) return err(`${donde}.filtros.${k} debe ser un array`);
      const permitidos = f.valores && new Set(f.valores.filter(esObjeto).map((v) => v.id));
      if (permitidos) vs.forEach((v) => { if (!permitidos.has(v)) err(`${donde}.filtros.${k} usa un valor inexistente: "${v}"`); });
    });
    if (p.duracion !== undefined) {
      const ds = Array.isArray(TEMA.duraciones) ? TEMA.duraciones : [];
      if (!ds.some((d) => d && d.valor === p.duracion)) err(`${donde}.duracion no existe en TEMA.duraciones: "${p.duracion}"`);
    }
  });
}

// Cruce de facetas: es lo que dice dónde está flojo el banco.
function cobertura(TEMA, preguntas, ejes) {
  const facetas = (TEMA.facetas || []).filter((f) => ejes.indexOf(f.id) !== -1);
  if (facetas.length !== 2) return err(`--cobertura necesita dos facetas existentes; recibió: ${ejes.join(',')}`);

  const [a, b] = facetas;
  const valsA = a.valores ? a.valores.map((v) => v.id) : [...new Set(preguntas.map((p) => p.facetas[a.id]).flat())].filter(Boolean).sort();
  const valsB = b.valores ? b.valores.map((v) => v.id) : [...new Set(preguntas.map((p) => p.facetas[b.id]).flat())].filter(Boolean).sort();

  const cuenta = {};
  preguntas.forEach((p) => {
    const va = p.facetas[a.id], vb = p.facetas[b.id];
    if (va === undefined || vb === undefined) return;
    [].concat(va).forEach((x) => [].concat(vb).forEach((y) => {
      cuenta[x + ' ' + y] = (cuenta[x + ' ' + y] || 0) + 1;
    }));
  });

  const ancho = Math.max(12, ...valsA.map((v) => v.length + 1));
  console.log(`\nCobertura ${a.id} x ${b.id}`);
  console.log(''.padEnd(ancho) + valsB.map((v) => v.slice(0, 9).padStart(10)).join(''));
  const vacias = [];
  valsA.forEach((x) => {
    let fila = x.padEnd(ancho);
    valsB.forEach((y) => {
      const n = cuenta[x + ' ' + y] || 0;
      if (n === 0) vacias.push(`${x}/${y}`);
      fila += String(n === 0 ? '·' : n).padStart(10);
    });
    console.log(fila);
  });
  if (vacias.length) console.log(`\n  ${vacias.length} combinación(es) sin preguntas: ${vacias.join(', ')}`);
}

function main() {
  const a = args(process.argv);
  const tema = path.resolve(a.tema || 'tema');
  RAIZ_TEMA = tema;
  const { TEMA, preguntas, ficheros, procedencia } = cargar(tema);

  validarTema(TEMA);
  validarPreguntas(TEMA || {}, preguntas, procedencia);
  validarPresets(TEMA || {}, preguntas);
  if (!preguntas.length) err('El banco no contiene preguntas');

  console.log(`Tema: ${(TEMA && TEMA.id) || '?'}`);
  console.log(`Banco: ${preguntas.length} preguntas en ${ficheros.length} fichero(s)`);

  const porOrigen = {};
  preguntas.forEach((p) => {
    const o = p.origen || 'sin marcar';
    porOrigen[o] = (porOrigen[o] || 0) + 1;
  });
  console.log('Origen: ' + Object.keys(porOrigen).map((k) => `${k} ${porOrigen[k]}`).join(', '));

  if (a.cobertura) cobertura(TEMA, preguntas, a.cobertura.split(','));

  if (avisos.length) {
    console.log(`\n${avisos.length} aviso(s):`);
    avisos.slice(0, 15).forEach((m) => console.log('  · ' + m));
    if (avisos.length > 15) console.log(`  ... y ${avisos.length - 15} más`);
  }

  if (errores.length) {
    console.error(`\n${errores.length} ERROR(ES):`);
    errores.forEach((m) => console.error('  ✗ ' + m));
    process.exit(1);
  }
  console.log('\nValidación correcta.');
}

try {
  main();
} catch (e) {
  console.error('No se pudo validar el tema: ' + e.message);
  process.exit(1);
}
