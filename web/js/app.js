'use strict';

// Arranque, estado del examen en curso y navegación entre vistas.
(function (g) {
  var QZ = g.QZ;
  var ui = QZ.ui, t = QZ.t, esc = QZ.ui.esc;

  var TEMA = g.TEMA || {};
  var estado = null;        // { examen, respuestas, modo, restante, limite, vencido }
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
    var firmas = Object.create(null);
    estado.examen.items.forEach(function (i) {
      firmas[i.pregunta.id] = QZ.examen.firmaPregunta(i.pregunta);
    });
    var ok = QZ.almacen.guardarProgreso({
      titulo: estado.examen.titulo,
      filtros: estado.examen.filtros,
      semilla: estado.examen.semilla,
      barajarOpciones: estado.examen.barajarOpciones,
      barajarPreguntas: estado.examen.barajarPreguntas,
      idsFuente: estado.examen.idsFuente,
      idsPermitidos: estado.examen.idsPermitidos,
      presetId: estado.examen.presetId,
      ids: estado.examen.items.map(function (i) { return i.pregunta.id; }),
      firmas: firmas,
      respuestas: estado.respuestas,
      modo: estado.modo,
      restante: estado.restante,
      limite: estado.limite,
      epoch: Date.now()
    });
    QZ.vistaExamen.avisarGuardado(!ok ? t('errorGuardado') : '');
  }

  function opcionesDe(examen) {
    return {
      titulo: examen.titulo,
      filtros: examen.filtros,
      n: examen.items.length,
      ids: examen.idsFuente,
      idsPermitidos: examen.idsPermitidos,
      barajarPreguntas: examen.barajarPreguntas,
      barajarOpciones: examen.barajarOpciones,
      presetId: examen.presetId
    };
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
      limite: d.minutos > 0 ? Date.now() + d.minutos * 60000 : null,
      vencido: false
    };
    if (guardado && guardado.modo === d.valor && d.minutos > 0 && guardado.restante != null) {
      estado.limite = Number.isFinite(guardado.limite)
        ? guardado.limite
        : guardado.epoch + guardado.restante * 1000;
      estado.restante = Math.max(0, Math.ceil((estado.limite - Date.now()) / 1000));
    }

    ui.vista('examen');
    QZ.vistaExamen.render(estado, {
      onCambio: function () { QZ.vistaExamen.actualizar(estado); guardar(); },
      onFinalizar: confirmarFinalizar,
      onReiniciar: reiniciar,
      onSalir: salir
    });
    guardar();
    arrancarCrono();
  }

  function reiniciar() {
    var nuevo = QZ.examen.construir(opcionesDe(estado.examen));
    QZ.almacen.borrarProgreso();
    iniciar(nuevo, estado.modo, null);
  }

  function confirmarFinalizar() {
    if (estado.vencido) return finalizar();
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
        iniciar(QZ.examen.construir(opcionesDe(examen)), modo, null);
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
    function actualizar() {
      estado.restante = Math.max(0, Math.ceil((estado.limite - Date.now()) / 1000));
      QZ.vistaExamen.pintarTiempo(estado.restante);
      if (estado.restante <= 0) {
        detenerCrono();
        estado.vencido = true;
        QZ.vistaExamen.bloquear();
        guardar();
        ui.modal(t('tiempoAgotado'), t('tiempoAgotadoMsg'), [
          {
            texto: t('finalizarExamen'), clase: 'btn-primario',
            onClick: function () { ui.cerrarModal(true); finalizar(); }
          }
        ], { cerrable: false });
      }
    }
    actualizar();
    if (!estado.vencido) cronoId = setInterval(actualizar, 250);
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
      var hayAvance = !!guardado;

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
            var recuperado = QZ.examen.rehidratar(guardado);
            if (!recuperado) {
              QZ.almacen.borrarProgreso();
              ui.modal(t('avanceIncompatible'), t('avanceIncompatibleMsg'), [
                { texto: t('aceptar'), clase: 'btn-primario', onClick: ui.cerrarModal }
              ]);
              return;
            }
            iniciar(recuperado, guardado.modo, guardado);
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
    if (TEMA.idioma) document.documentElement.lang = TEMA.idioma;
    var h1 = ui.$('#cabecera-titulo');
    if (h1) h1.textContent = TEMA.titulo || 'Quiz';
    var sub = ui.$('#cabecera-sub');
    if (sub) sub.textContent = TEMA.subtitulo || '';
    var aviso = ui.$('#aviso');
    if (aviso) {
      if (TEMA.aviso) { aviso.textContent = TEMA.aviso; aviso.hidden = false; }
      else aviso.hidden = true;
    }

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
