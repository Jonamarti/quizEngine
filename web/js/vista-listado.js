'use strict';

// Pantalla inicial: presets curados, acceso al generador e historial de intentos.
//
// Si el tema declara `grupos`, los exámenes se reparten en secciones y se ofrece
// una pastilla por grupo para ver sólo uno. Si no los declara, se pintan planos
// como antes: un tema con cuatro exámenes no necesita navegación.
(function (g) {
  var QZ = g.QZ;
  var ui = QZ.ui, t = QZ.t, esc = QZ.ui.esc;

  // Grupo que se está mostrando; '' son todos. Vive en el módulo, igual que los
  // criterios del generador, para que se conserve al repintar —por ejemplo al
  // borrar el historial— en vez de saltar de vuelta a «Todos».
  var grupoActivo = '';

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
            '<button class="btn btn-primario" data-empezar="' + idx + '">' +
              esc(t('comenzar')) + '</button>' +
          '</div>') +
      '</article>';
  }

  // Reparte los presets en secciones, en el orden en que el tema declara los grupos.
  //
  // Cada preset conserva su ÍNDICE ORIGINAL en el array plano: `data-empezar` y
  // `data-dur` indexan ese array, y renumerar por sección haría que el botón
  // lanzara otro examen distinto del que anuncia la tarjeta.
  function secciones(api) {
    var presets = api.tema.presets || [];
    var grupos = api.tema.grupos || [];
    var conIndice = presets.map(function (p, i) { return { preset: p, idx: i }; });

    if (!grupos.length) return [{ id: '', etiqueta: '', items: conIndice }];

    var declarados = {};
    grupos.forEach(function (gr) { declarados[gr.id] = true; });

    var out = grupos.map(function (gr) {
      return {
        id: gr.id,
        etiqueta: gr.etiqueta || gr.id,
        descripcion: gr.descripcion,
        items: conIndice.filter(function (x) { return x.preset.grupo === gr.id; })
      };
    });

    // Un preset sin grupo, o con uno que el tema no declara, no se pierde: cae en
    // una sección final. Ocultarlo en silencio sería peor que enseñarlo suelto.
    var sueltos = conIndice.filter(function (x) {
      return !x.preset.grupo || !declarados[x.preset.grupo];
    });
    if (sueltos.length) out.push({ id: '_otros', etiqueta: t('grupoOtros'), items: sueltos });

    return out.filter(function (s) { return s.items.length; });
  }

  function filtroHTML(secs) {
    // Con una sola sección el filtro no filtraría nada.
    if (secs.length < 2) return '';

    var total = secs.reduce(function (n, s) { return n + s.items.length; }, 0);
    var pastilla = function (id, etiqueta, cuenta) {
      return '<button type="button" class="pastilla' +
        (grupoActivo === id ? ' activa' : '') + '" data-grupo="' + esc(id) + '">' +
        esc(etiqueta) + ' <span class="pastilla-n">' + cuenta + '</span></button>';
    };

    return '<div class="grupo-filtro">' +
      '<div class="grupo-titulo">' + esc(t('grupoTitulo')) + '</div>' +
      '<div class="pastillas">' +
        pastilla('', t('grupoTodos'), total) +
        secs.map(function (s) { return pastilla(s.id, s.etiqueta, s.items.length); }).join('') +
      '</div></div>';
  }

  function seccionHTML(sec, api, conEncabezado) {
    return (conEncabezado && sec.etiqueta
      ? '<h3 class="grupo-examenes">' + esc(sec.etiqueta) + '</h3>' +
        (sec.descripcion ? '<p class="grupo-desc">' + esc(sec.descripcion) + '</p>' : '')
      : '') +
      '<div class="rejilla-tarjetas">' +
      sec.items.map(function (x) { return tarjetaPreset(x.preset, api, x.idx); }).join('') +
      '</div>';
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
      var secs = secciones(api);

      // Si el grupo activo ya no existe, se vuelve a «Todos» en vez de dejar la
      // pantalla en blanco.
      if (grupoActivo && !secs.some(function (s) { return s.id === grupoActivo; })) {
        grupoActivo = '';
      }

      var visibles = grupoActivo
        ? secs.filter(function (s) { return s.id === grupoActivo; })
        : secs;
      var conEncabezado = secs.length > 1;

      var html = '<div class="barra-generador">' +
        '<button class="btn btn-primario btn-ancho" id="btn-generador">' +
          esc(t('generadorAbrir')) + '</button>' +
        '<span class="contador-banco">' + total + ' ' + esc(t('preguntasDisponibles')) + '</span>' +
        '</div>';

      if (presets.length) {
        html += '<h2 class="titulo-seccion">' + esc(t('listadoTitulo')) + '</h2>' +
          filtroHTML(secs) +
          visibles.map(function (s) { return seccionHTML(s, api, conEncabezado); }).join('');
      }

      html += historialHTML();
      cont.innerHTML = html;

      ui.$('#btn-generador').addEventListener('click', function () { api.abrirGenerador(); });

      cont.querySelectorAll('[data-grupo]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          grupoActivo = btn.dataset.grupo;
          QZ.vistaListado.render(api);
        });
      });

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
