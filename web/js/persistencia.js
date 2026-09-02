'use strict';

// Progreso del examen en curso, historial de intentos y aciertos por pregunta.
// Todo bajo TEMA.prefijoAlmacen para que dos temas publicados en el mismo origen
// no se pisen el localStorage.
(function (g) {
  g.QZ = g.QZ || {};

  var MAX_HISTORIAL = 50;

  function prefijo() {
    return (g.TEMA && g.TEMA.prefijoAlmacen) || 'quiz_';
  }

  function leer(clave, porDefecto) {
    try {
      var crudo = localStorage.getItem(prefijo() + clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch (e) {
      return porDefecto;
    }
  }

  function escribir(clave, valor) {
    try {
      localStorage.setItem(prefijo() + clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;   // cuota llena o almacenamiento bloqueado
    }
  }

  function borrar(clave) {
    try { localStorage.removeItem(prefijo() + clave); } catch (e) { /* noop */ }
  }

  g.QZ.almacen = {
    leerProgreso: function () { return leer('progreso', null); },
    guardarProgreso: function (p) { return escribir('progreso', p); },
    borrarProgreso: function () { borrar('progreso'); },

    historial: function () { return leer('historial', []); },
    anotarIntento: function (intento) {
      var h = leer('historial', []);
      h.unshift(intento);
      escribir('historial', h.slice(0, MAX_HISTORIAL));
    },
    borrarHistorial: function () { borrar('historial'); },

    aciertos: function () { return leer('aciertos', {}); },

    // Registra el resultado de cada pregunta de un intento. Es lo que alimenta los
    // filtros "solo falladas" y "solo sin ver" del generador.
    anotarAciertos: function (resultados) {
      var a = leer('aciertos', {});
      var ahora = Date.now();
      resultados.forEach(function (r) {
        var e = a[r.pregunta.id] || { vistas: 0, fallos: 0, ultima: 0 };
        e.vistas++;
        if (!r.correcta) e.fallos++;
        e.ultima = ahora;
        a[r.pregunta.id] = e;
      });
      escribir('aciertos', a);
    },

    idsFalladas: function () {
      var a = leer('aciertos', {});
      return Object.keys(a).filter(function (id) { return a[id].fallos > 0; });
    },

    idsVistas: function () {
      return Object.keys(leer('aciertos', {}));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
