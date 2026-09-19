'use strict';

// Generador de exámenes a medida: filtros por faceta con recuento en vivo.
(function (g) {
  var QZ = g.QZ;
  var ui = QZ.ui, t = QZ.t, esc = QZ.ui.esc;

  var criterios = {};
  var modoRepaso = '';   // '' | 'falladas' | 'sinver'

  function idsPermitidos() {
    if (modoRepaso === 'falladas') return QZ.almacen.idsFalladas();
    if (modoRepaso === 'sinver') {
      var vistas = QZ.almacen.idsVistas();
      return QZ.banco.todas()
        .map(function (p) { return p.id; })
        .filter(function (id) { return vistas.indexOf(id) === -1; });
    }
    return null;
  }

  function coincidentes() {
    return QZ.banco.filtrar(criterios, idsPermitidos());
  }

  function bloqueFaceta(def) {
    var cuenta = QZ.banco.disponibles(def.id, criterios, idsPermitidos());
    var seleccion = criterios[def.id] || [];

    // Si la faceta no declara valores, se deducen de lo que hay en el banco.
    var valores = def.valores || Object.keys(cuenta).sort().map(function (v) {
      return { id: v, etiqueta: v };
    });

    var botones = valores.map(function (v) {
      var n = cuenta[v.id] || 0;
      var activo = seleccion.indexOf(v.id) !== -1;
      var clases = 'pastilla' + (activo ? ' activa' : '') + (n === 0 ? ' vacia' : '');
      var estilo = v.color && activo
        ? ' style="background:color-mix(in srgb, ' + esc(v.color) + ' 20%, transparent);border-color:' + esc(v.color) + '"'
        : '';
      return '<button type="button" class="' + clases + '"' + estilo +
        ' data-faceta="' + esc(def.id) + '" data-valor="' + esc(v.id) + '"' +
        (n === 0 && !activo ? ' disabled' : '') + '>' +
        esc(v.etiqueta || v.id) + ' <span class="pastilla-n">' + n + '</span></button>';
    }).join('');

    return '<div class="grupo-filtro">' +
      '<div class="grupo-titulo">' + esc(def.etiqueta || def.id) +
        (def.acumulativa ? ' <span class="pista">(' + esc(t('acumulativo')) + ')</span>' : '') + '</div>' +
      '<div class="pastillas">' + botones + '</div>' +
      '</div>';
  }

  function render(api) {
    var cont = ui.$('#panel-generador');
    var disponibles = coincidentes().length;

    var tamanos = (api.tema.tamanos || [10, 20, 40]).filter(function (n) {
      return n <= disponibles;
    });
    if (!tamanos.length && disponibles > 0) tamanos = [disponibles];
    if (disponibles > 0 && tamanos.indexOf(disponibles) === -1) tamanos.push(disponibles);

    var facetas = QZ.banco.aplicables(criterios).map(bloqueFaceta).join('');

    var optTam = tamanos.map(function (n) {
      return '<option value="' + n + '">' + n + '</option>';
    }).join('');

    var optDur = api.duraciones().map(function (d) {
      return '<option value="' + esc(d.valor) + '">' + esc(d.etiqueta) + '</option>';
    }).join('');

    cont.innerHTML =
      '<div class="cabecera-generador">' +
        '<h2 class="titulo-seccion">' + esc(t('generadorTitulo')) + '</h2>' +
        '<button class="btn" id="btn-volver-listado">' + esc(t('generadorVolver')) + '</button>' +
      '</div>' +
      facetas +
      '<div class="grupo-filtro">' +
        '<div class="grupo-titulo">' + esc(t('repaso')) + '</div>' +
        '<div class="pastillas">' +
          '<button type="button" class="pastilla' + (modoRepaso === 'falladas' ? ' activa' : '') +
            '" data-repaso="falladas">' + esc(t('soloFalladas')) + '</button>' +
          '<button type="button" class="pastilla' + (modoRepaso === 'sinver' ? ' activa' : '') +
            '" data-repaso="sinver">' + esc(t('soloSinVer')) + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="resumen-generador">' +
        '<b id="contador-vivo">' + disponibles + '</b> ' + esc(t('preguntasDisponibles')) +
      '</div>' +
      (disponibles === 0
        ? '<p class="aviso">' + esc(t('sinResultados')) + '</p>' +
          '<div class="acciones"><button class="btn" id="btn-limpiar">' +
          esc(t('limpiarFiltros')) + '</button></div>'
        : '<div class="fila-control">' +
            '<label>' + esc(t('numeroPreguntas')) + ' <select id="sel-n">' + optTam + '</select></label>' +
            '<label>' + esc(t('temporizador')) + ' <select id="sel-dur">' + optDur + '</select></label>' +
            '<label class="check"><input type="checkbox" id="chk-barajar" checked> ' +
              esc(t('barajarOpciones')) + '</label>' +
          '</div>' +
          '<div class="acciones">' +
            '<button class="btn btn-primario" id="btn-generar">' + esc(t('generar')) + '</button>' +
            '<button class="btn" id="btn-limpiar">' + esc(t('limpiarFiltros')) + '</button>' +
          '</div>');

    cont.querySelectorAll('[data-faceta]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.dataset.faceta, v = btn.dataset.valor;
        var def = QZ.banco.defFaceta(f);
        var sel = criterios[f] || [];

        // En una faceta acumulativa solo tiene sentido un valor: el tope.
        if (def && def.acumulativa) {
          criterios[f] = sel.indexOf(v) !== -1 ? [] : [v];
        } else {
          criterios[f] = sel.indexOf(v) !== -1
            ? sel.filter(function (x) { return x !== v; })
            : sel.concat(v);
        }
        if (!criterios[f].length) delete criterios[f];
        podarDependientes();
        render(api);
      });
    });

    cont.querySelectorAll('[data-repaso]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        modoRepaso = modoRepaso === btn.dataset.repaso ? '' : btn.dataset.repaso;
        render(api);
      });
    });

    var limpiar = ui.$('#btn-limpiar');
    if (limpiar) {
      limpiar.addEventListener('click', function () {
        criterios = {};
        modoRepaso = '';
        render(api);
      });
    }

    ui.$('#btn-volver-listado').addEventListener('click', function () {
      api.volverAlListado();
    });

    var generar = ui.$('#btn-generar');
    if (generar) {
      generar.addEventListener('click', function () {
        var n = parseInt(ui.$('#sel-n').value, 10);
        var modo = ui.$('#sel-dur').value;
        api.lanzar({
          titulo: ui.resumenFiltros(criterios),
          filtros: JSON.parse(JSON.stringify(criterios)),
          idsPermitidos: idsPermitidos(),
          n: n,
          barajarOpciones: ui.$('#chk-barajar').checked
        }, modo);
      });
    }
  }

  // Al deseleccionar una faceta de la que dependen otras, sus filtros quedarían
  // colgados y seguirían recortando el banco desde una pantalla que ya no se ve.
  function podarDependientes() {
    var cambio = true;
    while (cambio) {
      cambio = false;
      var visibles = QZ.banco.aplicables(criterios).map(function (f) { return f.id; });
      Object.keys(criterios).forEach(function (k) {
        if (visibles.indexOf(k) === -1) { delete criterios[k]; cambio = true; }
      });
    }
  }

  QZ.vistaGenerador = {
    render: render,
    reiniciar: function () { criterios = {}; modoRepaso = ''; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
