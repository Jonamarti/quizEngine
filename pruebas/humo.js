// Prueba de humo del sitio construido: carga con file://, genera un examen,
// responde, finaliza y comprueba la revisión y el navegador de preguntas.
const { chromium } = require('playwright-core');
const path = require('path');

const SITIO = 'file:///' + path.resolve(process.argv[2]).replace(/\\/g, '/') + '/index.html';

let fallos = 0;
function comprobar(nombre, ok, extra) {
  console.log((ok ? '  ok   ' : '  FALLO ') + nombre + (extra ? '  → ' + extra : ''));
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

  // Las cifras se leen del tema ya cargado en vez de fijarse aquí: si no, el test
  // caduca en cuanto crece el banco o se añade un preset.
  const esperado = await pag.evaluate(() => ({
    titulo: window.TEMA.titulo,
    presets: (window.TEMA.presets || []).length,
    preguntas: window.PREGUNTAS.length
  }));

  comprobar('sin errores de JS al cargar', erroresJs.length === 0, erroresJs.join(' | '));
  comprobar('el título del tema llega a la cabecera',
    (await pag.textContent('#cabecera-titulo')) === esperado.titulo, esperado.titulo);
  comprobar('se pinta una tarjeta por preset',
    (await pag.locator('#lista-examenes .tarjeta').count()) === esperado.presets,
    esperado.presets + ' presets');
  comprobar('el contador del banco cuadra con lo cargado',
    (await pag.textContent('.contador-banco')).includes(String(esperado.preguntas)),
    esperado.preguntas + ' preguntas');

  // ---- generador
  await pag.click('#btn-generador');
  await pag.waitForSelector('#panel-generador .grupo-filtro');

  const facetasIniciales = await pag.locator('#panel-generador .grupo-filtro').count();
  comprobar('disciplina oculta hasta elegir tema (dependeDe)',
    (await pag.locator('[data-faceta="disciplina"]').count()) === 0,
    facetasIniciales + ' grupos visibles');

  await pag.click('[data-faceta="tema"][data-valor="artes-marciales"]');
  await pag.waitForSelector('[data-faceta="disciplina"]');
  comprobar('al elegir tema aparece disciplina',
    (await pag.locator('[data-faceta="disciplina"]').count()) > 0);

  await pag.click('[data-faceta="disciplina"][data-valor="judo"]');
  const contador = await pag.textContent('#contador-vivo');
  comprobar('recuento en vivo para judo = 6', contador.trim() === '6', contador);

  // grado es acumulativo: hasta naranja debe incluir amarillo
  await pag.click('[data-faceta="grado"][data-valor="naranja"]');
  const conNaranja = parseInt(await pag.textContent('#contador-vivo'), 10);
  comprobar('grado acumulativo suma amarillo + naranja', conNaranja === 4, String(conNaranja));

  await pag.click('[data-faceta="grado"][data-valor="naranja"]');  // deseleccionar
  await pag.selectOption('#sel-n', '6');
  await pag.click('#btn-generar');
  await pag.waitForSelector('#vista-examen.activa');

  // ---- examen
  const nPreg = await pag.locator('#contenedor-preguntas .pregunta').count();
  comprobar('el examen tiene 6 preguntas', nPreg === 6, String(nPreg));

  const opcionesPrimera = await pag.locator('#contenedor-preguntas .pregunta').first()
    .locator('.opcion').count();
  comprobar('la primera pregunta tiene 4 opciones', opcionesPrimera === 4);

  // El navegador debe llevar a su pregunta: era el bug de la app de ISTQB
  await pag.locator('.nav-num').nth(3).click();
  await pag.waitForTimeout(600);
  const desplazado = await pag.evaluate(() => window.scrollY);
  comprobar('el navegador desplaza a la pregunta', desplazado > 50, 'scrollY=' + desplazado);

  // Responder todas eligiendo la primera opción de cada una
  for (let i = 0; i < nPreg; i++) {
    await pag.locator('#contenedor-preguntas .pregunta').nth(i)
      .locator('.opcion input').first().check();
  }
  const progreso = await pag.textContent('#progreso-respuestas');
  comprobar('contador de respondidas', progreso.includes('6/6'), progreso);

  // Persistencia: recargar debe ofrecer continuar
  await pag.reload();
  await pag.waitForSelector('#lista-examenes .tarjeta');
  const guardado = await pag.evaluate(() =>
    JSON.parse(localStorage.getItem('combatquiz_v1_progreso') || 'null'));
  comprobar('el progreso se guarda en localStorage con su prefijo',
    guardado && Object.keys(guardado.respuestas).length === 6,
    guardado ? Object.keys(guardado.respuestas).length + ' respuestas' : 'nada');

  await pag.click('#lista-examenes [data-empezar="0"]');
  await pag.waitForSelector('#modal:not(.oculto)');
  comprobar('al haber avance se ofrece continuar',
    (await pag.textContent('#modal-titulo')).length > 0);
  await pag.click('#modal-acciones .btn-primario');   // Continuar
  await pag.waitForSelector('#vista-examen.activa');

  const tras = await pag.locator('#contenedor-preguntas .pregunta').count();
  comprobar('al continuar se recupera el mismo examen', tras === 6, String(tras));
  const progreso2 = await pag.textContent('#progreso-respuestas');
  comprobar('al continuar se recuperan las respuestas', progreso2.includes('6/6'), progreso2);

  // ---- finalizar
  await pag.click('#btn-finalizar');
  await pag.waitForSelector('#vista-resultados.activa');

  comprobar('hay veredicto', (await pag.locator('.veredicto').count()) === 1);
  comprobar('hay fichas de resumen', (await pag.locator('.ficha').count()) === 5);
  const explicaciones = await pag.locator('.explicacion').count();
  comprobar('se explica cada opción de cada pregunta (24)', explicaciones === 24, String(explicaciones));
  comprobar('se muestra la fuente de las preguntas',
    (await pag.locator('.fuente').count()) > 0);
  comprobar('hay desglose por faceta', (await pag.locator('.panel table').count()) > 0);

  const historial = await pag.evaluate(() =>
    JSON.parse(localStorage.getItem('combatquiz_v1_historial') || '[]'));
  comprobar('el intento queda en el historial', historial.length === 1);
  const aciertos = await pag.evaluate(() =>
    JSON.parse(localStorage.getItem('combatquiz_v1_aciertos') || '{}'));
  comprobar('se anota el acierto por pregunta', Object.keys(aciertos).length === 6);

  // ---- repasar falladas
  const hayFalladas = await pag.locator('#btn-falladas').count();
  if (hayFalladas) {
    await pag.click('#btn-falladas');
    await pag.waitForSelector('#vista-examen.activa');
    const nF = await pag.locator('#contenedor-preguntas .pregunta').count();
    comprobar('repasar falladas abre solo las falladas', nF > 0 && nF <= 6, String(nF));
  }

  comprobar('sin errores de JS en todo el recorrido', erroresJs.length === 0, erroresJs.join(' | '));

  // ---- modo oscuro
  const pag2 = await (await navegador.newContext({ colorScheme: 'dark' })).newPage();
  await pag2.goto(SITIO);
  await pag2.waitForSelector('.tarjeta');
  const fondo = await pag2.evaluate(() => getComputedStyle(document.body).backgroundColor);
  comprobar('el modo oscuro cambia el fondo', fondo === 'rgb(16, 21, 29)', fondo);

  // ---- móvil
  const pag3 = await (await navegador.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  await pag3.goto(SITIO);
  await pag3.waitForSelector('.tarjeta');
  const desbordaX = await pag3.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  comprobar('a 390px no hay desbordamiento horizontal', !desbordaX);

  await navegador.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTodo correcto.');
  process.exit(fallos ? 1 : 0);
})();
