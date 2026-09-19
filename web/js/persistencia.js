'use strict';

// Progreso del examen en curso, historial de intentos y aciertos por pregunta.
// Todo bajo TEMA.prefijoAlmacen para que dos temas publicados en el mismo origen
// no se pisen el localStorage.
(function (g) {
  g.QZ = g.QZ || {};

  var MAX_HISTORIAL = 50;
  var MAX_ACIERTOS = 5000;
  var VERSION_PROGRESO = 2;
  var ultimoError = null;

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
      ultimoError = null;
      return true;
    } catch (e) {
      ultimoError = e;
      return false;   // cuota llena o almacenamiento bloqueado
    }
  }

  function esObjeto(x) { return x && typeof x === 'object' && !Array.isArray(x); }

  function progresoValido(p) {
    if (!esObjeto(p) || p.version !== VERSION_PROGRESO) return false;
    if (!Array.isArray(p.ids) || !p.ids.length || !esObjeto(p.respuestas) || !esObjeto(p.firmas)) return false;
    if (typeof p.semilla !== 'number' || typeof p.modo !== 'string') return false;
    if (p.ids.some(function (id) { return typeof id !== 'string' || typeof p.firmas[id] !== 'string'; })) return false;
    return Object.keys(p.respuestas).every(function (id) {
      return Array.isArray(p.respuestas[id]) && p.respuestas[id].every(Number.isInteger);
    });
  }

  function historialValido(h) {
    return Array.isArray(h) ? h.filter(function (x) {
      return esObjeto(x) && Number.isFinite(x.fecha) && Number.isInteger(x.total) &&
        Number.isInteger(x.aciertos) && x.total >= 0 && x.aciertos >= 0 && x.aciertos <= x.total;
    }) : [];
  }

  function aciertosValidos(a) {
    var limpio = Object.create(null);
    if (!esObjeto(a)) return limpio;
    Object.keys(a).forEach(function (id) {
      var x = a[id];
      if (esObjeto(x) && Number.isInteger(x.vistas) && Number.isInteger(x.fallos) &&
          x.vistas >= 0 && x.fallos >= 0 && x.fallos <= x.vistas && Number.isFinite(x.ultima)) {
        limpio[id] = { vistas: x.vistas, fallos: x.fallos, ultima: x.ultima };
      }
    });
    return limpio;
  }

  function borrar(clave) {
    try { localStorage.removeItem(prefijo() + clave); } catch (e) { /* noop */ }
  }

  g.QZ.almacen = {
    versionProgreso: VERSION_PROGRESO,
    leerProgreso: function () {
      var p = leer('progreso', null);
      return progresoValido(p) ? p : null;
    },
    guardarProgreso: function (p) {
      var copia = Object.assign({}, p, { version: VERSION_PROGRESO });
      return escribir('progreso', copia);
    },
    borrarProgreso: function () { borrar('progreso'); },
    ultimoError: function () { return ultimoError; },

    historial: function () { return historialValido(leer('historial', [])); },
    anotarIntento: function (intento) {
      var h = historialValido(leer('historial', []));
      h.unshift(intento);
      escribir('historial', h.slice(0, MAX_HISTORIAL));
    },
    borrarHistorial: function () { borrar('historial'); },

    aciertos: function () { return aciertosValidos(leer('aciertos', {})); },

    // Registra el resultado de cada pregunta de un intento. Es lo que alimenta los
    // filtros "solo falladas" y "solo sin ver" del generador.
    anotarAciertos: function (resultados) {
      var a = aciertosValidos(leer('aciertos', {}));
      var ahora = Date.now();
      resultados.forEach(function (r) {
        var e = a[r.pregunta.id] || { vistas: 0, fallos: 0, ultima: 0 };
        e.vistas++;
        if (!r.correcta) e.fallos++;
        e.ultima = ahora;
        a[r.pregunta.id] = e;
      });
      var ids = Object.keys(a);
      if (ids.length > MAX_ACIERTOS) {
        ids.sort(function (x, y) { return a[y].ultima - a[x].ultima; });
        ids.slice(MAX_ACIERTOS).forEach(function (id) { delete a[id]; });
      }
      escribir('aciertos', a);
    },

    idsFalladas: function () {
      var a = aciertosValidos(leer('aciertos', {}));
      return Object.keys(a).filter(function (id) { return a[id].fallos > 0; });
    },

    idsVistas: function () {
      return Object.keys(aciertosValidos(leer('aciertos', {})));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
