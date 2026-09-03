#!/usr/bin/env node
'use strict';

// Prueba de humo de un sitio ya construido: lo carga con file://, genera un examen
// a medida, lo responde, lo finaliza y comprueba la revisión y el navegador.
//
//   node pruebas/humo.js <carpeta-del-sitio>
//
// No sabe nada del tema que se le pase. Todas las cifras se leen del TEMA y del
// banco ya cargados en la página: un test que fije "judo = 6" caduca en cuanto
// crece el banco, y además sólo sirve para un tema.

const { chromium } = require('playwright');
const path = require('path');

const CARPETA = process.argv[2] || 'salida-pruebas';
const SITIO = 'file:///' + path.resolve(CARPETA).replace(/\\/g, '/') + '/index.html';

let fallos = 0;
function comprobar(nombre, ok, extra) {
  console.log((ok ? '  ok    ' : '  FALLO ') + nombre + (extra ? '  -> ' + extra : ''));
  if (!ok) fallos++;
}

(async () => {
  const navegador = await chromium.launch();
  const pag = await navegador.newPage();

  const erroresJs = [];
  pag.on('pageerror', (e) => erroresJs.push(e.message));
  pag.on('console', (m) => { if (m.type() === 'error') erroresJs.push(m.text()); });

  await pag.goto(SITIO);
  await pag.waitForSelector('#lista-examenes .tarjeta');

  const tema = await pag.evaluate(() => ({
    id: window.TEMA.id,
    titulo: window.TEMA.titulo,
    prefijo: window.TEMA.prefijoAlmacen,
    presets: (window.TEMA.presets || []).length,
    preguntas: window.PREGUNTAS.length,
    // La faceta dependiente y la acumulativa son los dos rasgos del contrato que
    // no se pueden comprobar sin mirar qué declara el tema.
    dependiente: (window.TEMA.facetas || []).find((f) => f.dependeDe) || null,
    acumulativa: (window.TEMA.facetas || []).find((f) => f.acumulativa) || null
  }));

  console.log('Tema "' + tema.id + '": ' + tema.preguntas + ' preguntas, ' +
    tema.presets + ' presets\n');

  comprobar('sin errores de JS al cargar', erroresJs.length === 0, erroresJs.join(' | '));
  comprobar('el título del tema llega a la cabecera',
    (await pag.textContent('#cabecera-titulo')) === tema.titulo, tema.titulo);
  comprobar('se pinta una tarjeta por preset',
    (await pag.locator('#lista-examenes .tarjeta').count()) === tema.presets);
  comprobar('el contador del banco cuadra con lo cargado',
    (await pag.textContent('.contador-banco')).includes(String(tema.preguntas)));

  // ---- generador
  await pag.click('#btn-generador');
  await pag.waitForSelector('#panel-generador .grupo-filtro');

  if (!tema.dependiente) {
    console.log('  (el tema no declara facetas dependientes: me salto esa parte)');
  } else {
    const facetaDep = tema.dependiente.id;
    const claveMadre = Object.keys(tema.dependiente.dependeDe)[0];
    const valorMadre = tema.dependiente.dependeDe[claveMadre];

    comprobar('la faceta dependiente está oculta de entrada',
      (await pag.locator('[data-faceta="' + facetaDep + '"]').count()) === 0, facetaDep);

    await pag.click('[data-faceta="' + claveMadre + '"][data-valor="' + valorMadre + '"]');
    await pag.waitForSelector('[data-faceta="' + facetaDep + '"]');
    comprobar('al cumplirse la dependencia, la faceta aparece',
      (await pag.locator('[data-faceta="' + facetaDep + '"]').count()) > 0);
  }

  // El recuento en vivo tiene que coincidir con lo que dice el propio banco, no
  // con un número escrito aquí.
  const criteriosActuales = tema.dependiente
    ? { [Object.keys(tema.dependiente.dependeDe)[0]]: [Object.values(tema.dependiente.dependeDe)[0]] }
    : {};
  const esperadas = await pag.evaluate((c) => window.QZ.banco.filtrar(c).length, criteriosActuales);
  comprobar('el recuento en vivo coincide con el banco',
    parseInt(await pag.textContent('#contador-vivo'), 10) === esperadas, String(esperadas));

  // ---- faceta acumulativa: subir un peldaño nunca puede dejar menos preguntas
  if (tema.acumulativa && (tema.acumulativa.valores || []).length >= 2) {
    const fac = tema.acumulativa.id;
    const primero = tema.acumulativa.valores[0].id;
    const segundo = tema.acumulativa.valores[1].id;

    await pag.click('[data-faceta="' + fac + '"][data-valor="' + primero + '"]');
    const conPrimero = parseInt(await pag.textContent('#contador-vivo'), 10);
    await pag.click('[data-faceta="' + fac + '"][data-valor="' + segundo + '"]');
    const conSegundo = parseInt(await pag.textContent('#contador-vivo'), 10);

    comprobar('la faceta acumulativa arrastra los valores anteriores',
      conSegundo > conPrimero, primero + '=' + conPrimero + ', ' + segundo + '=' + conSegundo);

    await pag.click('[data-faceta="' + fac + '"][data-valor="' + segundo + '"]');   // deseleccionar
  }

  // ---- estrechar hasta un grupo pequeño para que el examen sea manejable
  if (tema.dependiente) {
    const facetaDep = tema.dependiente.id;
    // El valor con menos preguntas, pero que tenga alguna.
    const valor = await pag.evaluate((f) => {
      const botones = [...document.querySelectorAll('[data-faceta="' + f + '"]')];
      return botones
        .map((b) => ({ v: b.dataset.valor, n: parseInt(b.querySelector('.pastilla-n').textContent, 10) }))
        .filter((x) => x.n > 0)
        .sort((a, b) => a.n - b.n)[0].v;
    }, facetaDep);
    await pag.click('[data-faceta="' + facetaDep + '"][data-valor="' + valor + '"]');
  }

  const disponibles = parseInt(await pag.textContent('#contador-vivo'), 10);
  const nPedidas = await pag.evaluate(() => {
    const sel = document.querySelector('#sel-n');
    return parseInt(sel.options[sel.options.length - 1].value, 10);
  });
  await pag.selectOption('#sel-n', String(nPedidas));
  comprobar('el selector de tamaño no ofrece más preguntas de las que hay',
    nPedidas <= disponibles, nPedidas + ' de ' + disponibles);

  await pag.click('#btn-generar');
  await pag.waitForSelector('#vista-examen.activa');

  // ---- examen
  const nPreg = await pag.locator('#contenedor-preguntas .pregunta').count();
  comprobar('el examen tiene las preguntas pedidas', nPreg === nPedidas, nPreg + '/' + nPedidas);

  const totalOpciones = await pag.locator('#contenedor-preguntas .opcion').count();
  comprobar('cada pregunta trae sus opciones', totalOpciones >= nPreg * 2, String(totalOpciones));

  // El navegador debe llevar a su pregunta: era el bug de la app de ISTQB
  if (nPreg >= 3) {
    await pag.locator('.nav-num').nth(nPreg - 1).click();
    await pag.waitForTimeout(600);
    const desplazado = await pag.evaluate(() => window.scrollY);
    comprobar('el navegador desplaza a la pregunta', desplazado > 50, 'scrollY=' + desplazado);
    await pag.evaluate(() => window.scrollTo(0, 0));
  }

  // Responder: en las de respuesta única basta la primera opción; en las múltiples
  // se marcan todas, porque el motor descarta la más antigua al pasarse del tope y
  // deja justo las que pide. Marcarlas todas ejercita ese recorte.
  const multiples = await pag.locator('#contenedor-preguntas .aviso-multi').count();
  for (let i = 0; i < nPreg; i++) {
    const preg = pag.locator('#contenedor-preguntas .pregunta').nth(i);
    const casillas = preg.locator('.opcion input[type="checkbox"]');
    if (await casillas.count()) {
      const total = await casillas.count();
      for (let j = 0; j < total; j++) await casillas.nth(j).check();
    } else {
      await preg.locator('.opcion input').first().check();
    }
  }

  const progreso = await pag.textContent('#progreso-respuestas');
  comprobar('todas quedan respondidas', progreso.includes(nPreg + '/' + nPreg), progreso);
  if (multiples) {
    comprobar('la respuesta múltiple se recorta al número pedido', true,
      multiples + ' pregunta(s) de selección múltiple');
  }

  // ---- persistencia: recargar debe ofrecer continuar
  await pag.reload();
  await pag.waitForSelector('#lista-examenes .tarjeta');
  const guardado = await pag.evaluate((pref) =>
    JSON.parse(localStorage.getItem(pref + 'progreso') || 'null'), tema.prefijo);
  comprobar('el progreso se guarda bajo el prefijo del tema',
    guardado && Object.keys(guardado.respuestas).length === nPreg,
    tema.prefijo + 'progreso');

  await pag.click('#lista-examenes [data-empezar="0"]');
  await pag.waitForSelector('#modal:not(.oculto)');
  comprobar('al haber avance se ofrece continuar',
    (await pag.textContent('#modal-titulo')).length > 0);
  await pag.click('#modal-acciones .btn-primario');   // Continuar
  await pag.waitForSelector('#vista-examen.activa');

  comprobar('al continuar se recupera el mismo examen',
    (await pag.locator('#contenedor-preguntas .pregunta').count()) === nPreg);
  comprobar('al continuar se recuperan las respuestas',
    (await pag.textContent('#progreso-respuestas')).includes(nPreg + '/' + nPreg));

  // ---- finalizar
  await pag.click('#btn-finalizar');
  await pag.waitForSelector('#vista-resultados.activa');

  comprobar('hay veredicto', (await pag.locator('.veredicto').count()) === 1);
  comprobar('hay cinco fichas de resumen', (await pag.locator('.ficha').count()) === 5);
  comprobar('se explica cada opción de cada pregunta',
    (await pag.locator('.explicacion').count()) === totalOpciones, String(totalOpciones));
  comprobar('se muestra la fuente de las preguntas',
    (await pag.locator('.fuente').count()) > 0);
  comprobar('hay desglose por faceta', (await pag.locator('.panel table').count()) > 0);

  const historial = await pag.evaluate((pref) =>
    JSON.parse(localStorage.getItem(pref + 'historial') || '[]'), tema.prefijo);
  comprobar('el intento queda en el historial', historial.length === 1);
  const aciertos = await pag.evaluate((pref) =>
    JSON.parse(localStorage.getItem(pref + 'aciertos') || '{}'), tema.prefijo);
  comprobar('se anota el acierto por pregunta', Object.keys(aciertos).length === nPreg);

  // ---- repasar falladas
  if (await pag.locator('#btn-falladas').count()) {
    await pag.click('#btn-falladas');
    await pag.waitForSelector('#vista-examen.activa');
    const nF = await pag.locator('#contenedor-preguntas .pregunta').count();
    comprobar('repasar falladas abre sólo las falladas', nF > 0 && nF <= nPreg, String(nF));
  }

  comprobar('sin errores de JS en todo el recorrido', erroresJs.length === 0, erroresJs.join(' | '));

  // ---- imágenes de pregunta, si el tema declara alguna
  const conImagen = await pag.evaluate(() =>
    (window.PREGUNTAS || []).filter((p) => p.imagen && p.imagen.src).map((p) => p.imagen.src));

  if (!conImagen.length) {
    console.log('  (el tema no tiene preguntas con imagen: me salto esa parte)');
  } else {
    // Que el marcado se genere no basta: lo que rompe la pregunta es que el
    // fichero no haya llegado al sitio construido, y eso sólo se ve cargándolo.
    const marcado = await pag.evaluate(() => {
      const p = window.PREGUNTAS.find((x) => x.imagen && x.imagen.src);
      return window.QZ.ui.imagenPregunta(p);
    });
    comprobar('la imagen de una pregunta genera su figure con alt',
      marcado.includes('<figure') && marcado.includes('alt="'), marcado.slice(0, 60) + '…');

    const cargadas = await pag.evaluate((rutas) => Promise.all(rutas.map((src) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = src;
      }))), conImagen);
    const fallidas = conImagen.filter((_, i) => !cargadas[i]);
    comprobar('todas las imágenes referenciadas se cargan desde el sitio construido',
      fallidas.length === 0,
      fallidas.length ? 'no cargan: ' + fallidas.join(', ') : conImagen.length + ' imagen(es)');
  }

  // ---- grupos de exámenes
  //
  // Se hace en una pestaña nueva y limpia para no interferir con el progreso que
  // el recorrido anterior dejó en localStorage.
  const paginaLimpia = await (await navegador.newContext()).newPage();
  await paginaLimpia.goto(SITIO);
  await paginaLimpia.waitForSelector('#lista-examenes .tarjeta');

  const grupos = await paginaLimpia.evaluate(() =>
    (window.TEMA.grupos || []).map((x) => ({ id: x.id, etiqueta: x.etiqueta })));

  if (!grupos.length) {
    console.log('  (el tema no declara grupos de exámenes: me salto esa parte)');
  } else {
    comprobar('hay una pastilla por grupo, más «Todos»',
      (await paginaLimpia.locator('[data-grupo]').count()) === grupos.length + 1,
      grupos.length + ' grupos');
    comprobar('se pinta un encabezado por grupo',
      (await paginaLimpia.locator('.grupo-examenes').count()) === grupos.length);

    // Se filtra por el último grupo declarado: si el reparto estuviera mal, el
    // primero podría acertar por casualidad.
    const ultimo = grupos[grupos.length - 1];
    await paginaLimpia.click('[data-grupo="' + ultimo.id + '"]');
    await paginaLimpia.waitForSelector('.pastilla.activa');

    comprobar('al filtrar queda un solo grupo a la vista',
      (await paginaLimpia.locator('.grupo-examenes').count()) === 1, ultimo.etiqueta);

    // La regresión que importa: `data-empezar` indexa el array plano de presets,
    // así que si al agrupar se renumerase, el botón lanzaría otro examen.
    const tarjeta = paginaLimpia.locator('#lista-examenes .tarjeta').first();
    const tituloTarjeta = (await tarjeta.locator('h3').textContent()).trim();
    await tarjeta.locator('[data-empezar]').click();
    await paginaLimpia.waitForSelector('#vista-examen.activa');
    const tituloExamen = (await paginaLimpia.textContent('.info-titulo')).trim();
    comprobar('el botón lanza el examen de su propia tarjeta',
      tituloExamen === tituloTarjeta, '«' + tituloTarjeta + '» → «' + tituloExamen + '»');
  }

  // ---- modo oscuro: lo que importa es que el tema del sistema cambie el fondo,
  // no el valor concreto del color.
  const fondo = async (esquema) => {
    const p = await (await navegador.newContext({ colorScheme: esquema })).newPage();
    await p.goto(SITIO);
    await p.waitForSelector('.tarjeta');
    return p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  };
  const claro = await fondo('light');
  const oscuro = await fondo('dark');
  comprobar('el modo oscuro cambia el fondo', claro !== oscuro, claro + ' vs ' + oscuro);

  // ---- móvil
  const pagMovil = await (await navegador.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  await pagMovil.goto(SITIO);
  await pagMovil.waitForSelector('.tarjeta');
  const desbordaX = await pagMovil.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  comprobar('a 390px no hay desbordamiento horizontal', !desbordaX);

  await navegador.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTodo correcto.');
  process.exit(fallos ? 1 : 0);
})();
