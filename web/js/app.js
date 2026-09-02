'use strict';

// Arranque, estado del examen en curso y navegación entre vistas.
(function (g) {
  var QZ = g.QZ;
  var ui = QZ.ui, t = QZ.t, esc = QZ.ui.esc;

  var TEMA = g.TEMA || {};
  var estado = null;        // { examen, respuestas, modo, restante, epoch }
  var cronoId = null;

  function aprobado() { return TEMA.aprobado || 0.65; }

  function duraciones() {
    return TEMA.duraciones || [{ valor: 'sin', etiqueta: 'Sin temporizador', minutos: 0 }];
  }

  function duracion(valor) {
    var d = duraciones().filter(function (x) { return x.valor === valor; });
    return d[0] || duraciones()[0];
  }

  // -------------------------------------------------- progreso

  function guardar() {
    if (!estado) return;
    QZ.almacen.guardarProgreso({
      titulo: estado.examen.titulo,
      filtros: estado.examen.filtros,
      semilla: estado.examen.semilla,
      barajarOpciones: estado.examen.barajarOpciones,
      presetId: estado.examen.presetId,
      ids: estado.examen.items.map(function (i) { return i.pregunta.id; }),
      respuestas: estado.respuestas,
      modo: estado.modo,
      restante: estado.restante,
      epoch: Date.now()
    });
  }

  // -------------------------------------------------- examen

  function iniciar(examen, modo, guardado) {
    detenerCrono();
    var d = duracion(modo);
    estado = {
      examen: examen,
      respuestas: (guardado && guardado.respuestas) || {},
      modo: d.valor,
      restante: d.minutos > 0 ? d.minutos * 60 : 0,
      epoch: Date.now()
    };
    // Al continuar se descuenta lo transcurrido, pero solo si el temporizador
    // elegido coincide con aquel con el que se guardó.
    if (guardado && guardado.modo === d.valor && d.minutos > 0 && guardado.restante != null) {
      var pasado = Math.floor((Date.now() - guardado.epoch) / 1000);
      estado.restante = Math.max(0, guardado.restante - pasado);
    }

    ui.vista('examen');
    QZ.vistaExamen.render(estado, {
      onCambio: function () { QZ.vistaExamen.actualizar(estado); guardar(); },
      onFinalizar: confirmarFinalizar,
      onReiniciar: reiniciar,
      onSalir: salir
    });
    arrancarCrono();
    guardar();
  }

  function reiniciar() {
    var nuevo = QZ.examen.construir({
      titulo: estado.examen.titulo,
      filtros: estado.examen.filtros,
      n: estado.examen.items.length,
      barajarOpciones: estado.examen.barajarOpciones,
      presetId: estado.examen.presetId
    });
    QZ.almacen.borrarProgreso();
    iniciar(nuevo, estado.modo, null);
  }

  function confirmarFinalizar() {
    var faltan = estado.examen.items.filter(function (i) {
      return !QZ.examen.respondida(i, estado.respuestas);
    }).length;
    if (!faltan) return finalizar();

    ui.modal(t('sinResponderTitulo'), t('sinResponderMsg', { n: faltan }), [
      {
        texto: t('finalizarIgual'), clase: 'btn-primario',
        onClick: function () { ui.cerrarModal(); finalizar(); }
      },
      { texto: t('seguirRespondiendo'), onClick: ui.cerrarModal }
    ]);
  }

  function finalizar() {
    detenerCrono();
    var examen = estado.examen;
    var modo = estado.modo;
    var resultados = QZ.examen.corregir(examen, estado.respuestas);
    var ok = resultados.filter(function (r) { return r.correcta; }).length;

    QZ.almacen.anotarAciertos(resultados);
    QZ.almacen.anotarIntento({
      fecha: Date.now(),
      titulo: examen.titulo,
      presetId: examen.presetId,
      filtros: examen.filtros,
      total: resultados.length,
      aciertos: ok
    });
    QZ.almacen.borrarProgreso();

    QZ.vistaResultados.render(examen, resultados, {
      aprobado: aprobado(),
      onReintentar: function () {
        iniciar(QZ.examen.construir({
          titulo: examen.titulo,
          filtros: examen.filtros,
          n: examen.items.length,
          barajarOpciones: examen.barajarOpciones,
          presetId: examen.presetId
        }), modo, null);
      },
      onRepasarFalladas: function () {
        var ids = resultados.filter(function (r) { return !r.correcta; })
          .map(function (r) { return r.pregunta.id; });
        if (!ids.length) return;
        iniciar(QZ.examen.construir({
          titulo: t('repasarFalladas'),
          filtros: {},
          idsPermitidos: ids,
          n: ids.length,
          barajarOpciones: examen.barajarOpciones
        }), 'sin', null);
      },
      onVolver: salir
    });
    ui.vista('resultados');
  }

  function salir() {
    detenerCrono();
    estado = null;
    QZ.vistaListado.render(api);
    ui.vista('listado');
  }

  // -------------------------------------------------- temporizador

  function arrancarCrono() {
    detenerCrono();
    if (estado.modo === 'sin') return;
    QZ.vistaExamen.pintarTiempo(estado.restante);
    cronoId = setInterval(function () {
      estado.restante--;
      QZ.vistaExamen.pintarTiempo(estado.restante);
      guardar();
      if (estado.restante <= 0) {
        detenerCrono();
        ui.modal(t('tiempoAgotado'), t('tiempoAgotadoMsg'), [
          {
            texto: t('finalizarExamen'), clase: 'btn-primario',
            onClick: function () { ui.cerrarModal(); finalizar(); }
          }
        ]);
      }
    }, 1000);
  }

  function detenerCrono() {
    if (cronoId) { clearInterval(cronoId); cronoId = null; }
  }

  // -------------------------------------------------- API que usan las vistas

  var api = {
    tema: TEMA,
    duraciones: duraciones,
    aprobado: aprobado,

    lanzar: function (opciones, modo) {
      var guardado = QZ.almacen.leerProgreso();
      var hayAvance = guardado && guardado.respuestas &&
        Object.keys(guardado.respuestas).length > 0;

      if (!hayAvance) {
        iniciar(QZ.examen.construir(opciones), modo, null);
        return;
      }

      ui.modal(t('examenEnCurso'),
        t('hayAvance') + '<br><b>' + esc(guardado.titulo || '') + '</b>', [
        {
          texto: t('continuar'), clase: 'btn-primario',
          onClick: function () {
            ui.cerrarModal();
            iniciar(QZ.examen.rehidratar(guardado), guardado.modo, guardado);
          }
        },
        {
          texto: t('empezarDeNuevo'),
          onClick: function () {
            ui.cerrarModal();
            QZ.almacen.borrarProgreso();
            iniciar(QZ.examen.construir(opciones), modo, null);
          }
        },
        { texto: t('cancelar'), onClick: ui.cerrarModal }
      ]);
    },

    abrirGenerador: function () {
      QZ.vistaGenerador.render(api);
      ui.vista('generador');
    },

    volverAlListado: function () {
      QZ.vistaListado.render(api);
      ui.vista('listado');
    }
  };

  // -------------------------------------------------- arranque

  function init() {
    var preguntas = g.PREGUNTAS || [];

    document.title = TEMA.titulo || 'Quiz';
    var h1 = ui.$('#cabecera-titulo');
    if (h1) h1.textContent = TEMA.titulo || 'Quiz';
    var sub = ui.$('#cabecera-sub');
    if (sub) sub.textContent = TEMA.subtitulo || '';

    if (!preguntas.length) {
      ui.$('#lista-examenes').innerHTML = '<p class="aviso">' + esc(t('sinPreguntas')) + '</p>';
      return;
    }

    QZ.banco.init(preguntas, TEMA);
    QZ.vistaListado.render(api);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.$('#modal').dataset.abierto) ui.cerrarModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
