'use strict';

// Pantalla inicial: presets curados, acceso al generador e historial de intentos.
(function (g) {
  var QZ = g.QZ;
  var ui = QZ.ui, t = QZ.t, esc = QZ.ui.esc;

  function tarjetaPreset(preset, api, idx) {
    var disponibles = QZ.banco.filtrar(preset.filtros).length;
    var n = Math.min(preset.n || disponibles, disponibles);
    var minimo = Math.ceil(n * api.aprobado());

    var opciones = api.duraciones().map(function (d) {
      var sel = d.valor === (preset.duracion || 'sin') ? ' selected' : '';
      return '<option value="' + esc(d.valor) + '"' + sel + '>' + esc(d.etiqueta) + '</option>';
    }).join('');

    var historial = QZ.almacen.historial().filter(function (h) {
      return h.presetId === preset.id;
    });
    var ultimo = historial[0];

    return '<article class="tarjeta">' +
      '<h3>' + esc(preset.titulo) + '</h3>' +
      (preset.descripcion ? '<p class="tarjeta-desc">' + esc(preset.descripcion) + '</p>' : '') +
      '<div class="meta">' +
        '<span>' + n + ' ' + esc(t('preguntas')) + '</span>' +
        '<span>' + esc(t('aprobadoCon')) + ': ' + minimo + '/' + n + '</span>' +
        (ultimo
          ? '<span class="marca-completado">' + esc(t('ultimoIntento')) + ': ' +
            ultimo.aciertos + '/' + ultimo.total + '</span>'
          : '') +
      '</div>' +
      '<div class="meta meta-filtros">' + esc(ui.resumenFiltros(preset.filtros)) + '</div>' +
      (disponibles === 0
        ? '<p class="aviso-inline">' + esc(t('sinResultados')) + '</p>'
        : '<div class="fila-control">' +
            '<label>' + esc(t('temporizador')) +
              ' <select data-dur="' + idx + '">' + opciones + '</select></label>' +
          '</div>' +
          '<div class="acciones">' +
            '<button class="btn btn-primario" data-empezar="' + idx + '">' + esc(t('comenzar')) + '</button>' +
          '</div>') +
      '</article>';
  }

  function historialHTML() {
    var h = QZ.almacen.historial();
    if (!h.length) {
      return '<h2 class="titulo-seccion">' + esc(t('historialTitulo')) + '</h2>' +
        '<p class="aviso">' + esc(t('historialVacio')) + '</p>';
    }
    var filas = h.slice(0, 10).map(function (x) {
      var pct = Math.round((x.aciertos / x.total) * 100);
      return '<tr><td>' + esc(ui.fecha(x.fecha)) + '</td>' +
        '<td>' + esc(x.titulo || ui.resumenFiltros(x.filtros)) + '</td>' +
        '<td>' + x.aciertos + '/' + x.total + '</td>' +
        '<td>' + pct + '%</td></tr>';
    }).join('');

    return '<h2 class="titulo-seccion">' + esc(t('historialTitulo')) + '</h2>' +
      '<div class="tabla-envoltorio"><table><thead><tr><th>Fecha</th><th>Examen</th>' +
      '<th>Aciertos</th><th>%</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<div class="acciones"><button class="btn" id="btn-borrar-historial">' +
      esc(t('historialBorrar')) + '</button></div>';
  }

  QZ.vistaListado = {
    render: function (api) {
      var cont = ui.$('#lista-examenes');
      var presets = (api.tema.presets || []);
      var total = QZ.banco.todas().length;

      var html = '<div class="barra-generador">' +
        '<button class="btn btn-primario btn-ancho" id="btn-generador">' +
          esc(t('generadorAbrir')) + '</button>' +
        '<span class="contador-banco">' + total + ' ' + esc(t('preguntasDisponibles')) + '</span>' +
        '</div>';

      if (presets.length) {
        html += '<h2 class="titulo-seccion">' + esc(t('listadoTitulo')) + '</h2>' +
          '<div class="rejilla-tarjetas">' +
          presets.map(function (p, i) { return tarjetaPreset(p, api, i); }).join('') +
          '</div>';
      }

      html += historialHTML();
      cont.innerHTML = html;

      ui.$('#btn-generador').addEventListener('click', function () { api.abrirGenerador(); });

      var borrar = ui.$('#btn-borrar-historial');
      if (borrar) {
        borrar.addEventListener('click', function () {
          QZ.almacen.borrarHistorial();
          QZ.vistaListado.render(api);
        });
      }

      cont.querySelectorAll('[data-empezar]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = parseInt(btn.dataset.empezar, 10);
          var preset = presets[i];
          var sel = cont.querySelector('[data-dur="' + i + '"]');
          var modo = sel ? sel.value : 'sin';
          api.lanzar({
            titulo: preset.titulo,
            filtros: preset.filtros,
            n: preset.n,
            presetId: preset.id,
            barajarOpciones: preset.barajarOpciones !== false
          }, modo);
        });
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
