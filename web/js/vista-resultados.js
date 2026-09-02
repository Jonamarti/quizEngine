'use strict';

// Resultados: resumen, desglose por cada faceta y revisión pregunta a pregunta
// con la explicación de todas las opciones.
(function (g) {
  var QZ = g.QZ;
  var ui = QZ.ui, t = QZ.t, esc = QZ.ui.esc;

  function desgloses(resultados) {
    var html = '';
    QZ.banco.facetas().forEach(function (f) {
      var tabla = QZ.examen.desglose(resultados, f.id);
      var claves = Object.keys(tabla);
      if (claves.length < 2) return;   // un solo valor no dice nada

      // Respeta el orden declarado en el tema, no el alfabético.
      if (f.valores) {
        var orden = f.valores.map(function (v) { return v.id; });
        claves.sort(function (a, b) { return orden.indexOf(a) - orden.indexOf(b); });
      } else {
        claves.sort();
      }

      var filas = claves.map(function (k) {
        var d = tabla[k];
        var pct = Math.round((d.ok / d.total) * 100);
        return '<tr><td>' + esc(ui.etiquetaValor(f.id, k)) + '</td>' +
          '<td>' + d.total + '</td><td>' + d.ok + '</td><td>' + pct + '%</td></tr>';
      }).join('');

      html += '<div class="panel"><h3>' + esc(t('desglosePor')) + ' ' +
        esc((f.etiqueta || f.id).toLowerCase()) + '</h3>' +
        '<div class="tabla-envoltorio"><table><thead><tr><th>' + esc(f.etiqueta || f.id) +
        '</th><th>' + esc(t('preguntas')) + '</th><th>' + esc(t('correctas')) +
        '</th><th>' + esc(t('acierto')) + '</th></tr></thead><tbody>' +
        filas + '</tbody></table></div></div>';
    });
    return html;
  }

  function revision(resultados) {
    var html = '<h2 class="titulo-seccion">' + esc(t('revision')) + '</h2>';

    resultados.forEach(function (r, i) {
      var p = r.pregunta;
      var insignia = r.correcta
        ? '<span class="insignia ok">' + esc(t('esCorrecta')) + '</span>'
        : (r.respondida
          ? '<span class="insignia fall">' + esc(t('esIncorrecta')) + '</span>'
          : '<span class="insignia vacio">' + esc(t('sinResponder')) + '</span>');

      html += '<article class="pregunta">' +
        '<div class="pregunta-cabecera">' +
          '<span class="pregunta-titulo">' + esc(t('pregunta')) + ' ' + (i + 1) + '</span>' +
          insignia + ui.chips(p) +
        '</div>' +
        '<p class="enunciado">' + esc(p.enunciado) + '</p>' +
        ui.imagenPregunta(p) +
        '<div class="opciones">';

      r.orden.forEach(function (orig, pos) {
        var op = p.opciones[orig];
        var elegida = r.seleccionadas.indexOf(orig) !== -1;
        var clase = 'opcion revision';
        if (op.correcta) clase += ' correcta';
        else if (elegida) clase += ' incorrecta';

        html += '<div class="' + clase + '">' +
          '<span class="opcion-letra">' + QZ.examen.letra(pos) + ')</span>' +
          '<span class="opcion-texto">' + esc(op.texto) +
            (op.correcta && !elegida
              ? ' <i>' + esc(t('correctaNoSeleccionada')) + '</i>' : '') +
          '</span></div>' +
          '<div class="explicacion ' + (op.correcta ? 'por-correcta' : 'por-incorrecta') + '">' +
            '<b>' + esc(op.correcta ? t('porQueCorrecta') : t('porQueIncorrecta')) + '</b> ' +
            esc(op.explicacion || '') +
          '</div>';
      });

      html += '</div>';
      if (p.nota) {
        html += '<p class="nota"><b>' + esc(t('clave')) + '</b> ' + esc(p.nota) + '</p>';
      }
      if (p.fuente) {
        html += '<p class="fuente"><b>' + esc(t('fuente')) + '</b> ' + esc(p.fuente) + '</p>';
      }
      html += '</article>';
    });
    return html;
  }

  QZ.vistaResultados = {
    render: function (examen, resultados, cb) {
      var cont = ui.$('#contenedor-resultados');
      var total = resultados.length;
      var ok = resultados.filter(function (r) { return r.correcta; }).length;
      var mal = resultados.filter(function (r) { return r.respondida && !r.correcta; }).length;
      var sin = resultados.filter(function (r) { return !r.respondida; }).length;
      var pct = total ? Math.round((ok / total) * 100) : 0;
      var pasa = total ? (ok / total) >= cb.aprobado : false;
      var minimo = Math.round(cb.aprobado * 100);

      var html = '<h2 class="titulo-seccion">' + esc(t('resultado')) + ' · ' +
        esc(examen.titulo || '') + '</h2>' +
        '<p class="veredicto ' + (pasa ? 'ok' : 'fall') + '">' +
          esc(pasa ? t('aprobado') : t('noAprobado')) + ' (' + minimo + '%)</p>' +
        '<div class="rejilla-resumen">' +
          '<div class="ficha"><div class="num">' + total + '</div><div class="etiq">' + esc(t('totales')) + '</div></div>' +
          '<div class="ficha ok"><div class="num">' + ok + '</div><div class="etiq">' + esc(t('correctas')) + '</div></div>' +
          '<div class="ficha fall"><div class="num">' + mal + '</div><div class="etiq">' + esc(t('incorrectas')) + '</div></div>' +
          '<div class="ficha vacio"><div class="num">' + sin + '</div><div class="etiq">' + esc(t('sinResponder')) + '</div></div>' +
          '<div class="ficha"><div class="num">' + pct + '%</div><div class="etiq">' + esc(t('acierto')) + '</div></div>' +
        '</div>' +
        desgloses(resultados) +
        '<div class="acciones">' +
          '<button class="btn btn-primario" id="btn-reintentar">' + esc(t('reintentar')) + '</button>' +
          (ok < total
            ? '<button class="btn" id="btn-falladas">' + esc(t('repasarFalladas')) + '</button>'
            : '') +
          '<button class="btn" id="btn-volver">' + esc(t('volverAlListado')) + '</button>' +
        '</div>' +
        revision(resultados);

      cont.innerHTML = html;

      ui.$('#btn-reintentar').addEventListener('click', cb.onReintentar);
      ui.$('#btn-volver').addEventListener('click', cb.onVolver);
      var f = ui.$('#btn-falladas');
      if (f) f.addEventListener('click', cb.onRepasarFalladas);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
