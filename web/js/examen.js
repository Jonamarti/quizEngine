'use strict';

// Construcción y corrección de un examen. Sin DOM: se puede probar desde Node.
(function (g) {
  g.QZ = g.QZ || {};

  // PRNG con semilla (mulberry32). Hace falta que barajar sea reproducible: al
  // recargar a media prueba hay que reconstruir el mismo examen, con las opciones
  // en el mismo orden, o las respuestas guardadas dejarían de corresponder.
  function aleatorio(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function barajar(lista, rnd) {
    var c = lista.slice();
    for (var i = c.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = c[i]; c[i] = c[j]; c[j] = t;
    }
    return c;
  }

  function letra(i) { return String.fromCharCode(97 + i); }

  // Semilla propia para barajar las opciones de una pregunta, derivada de la del
  // examen y del id. Sin esto, el orden dependería de cuántos números hubiera
  // consumido antes el PRNG, y rehidratar un examen guardado daría un orden distinto al original.
  function semillaOpciones(semilla, id) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return (h ^ (semilla >>> 0)) >>> 0;
  }

  function ordenOpciones(pregunta, semilla, mezclar) {
    var idx = pregunta.opciones.map(function (_, i) { return i; });
    if (!mezclar) return idx;
    return barajar(idx, aleatorio(semillaOpciones(semilla, pregunta.id)));
  }

  function indicesCorrectos(pregunta) {
    var r = [];
    pregunta.opciones.forEach(function (o, i) { if (o.correcta) r.push(i); });
    return r;
  }

  function copiarLista(lista) {
    return Array.isArray(lista) ? lista.slice() : null;
  }

  function firmaPregunta(p) {
    var s = p.id + '\u0000' + p.opciones.map(function (o) {
      return String(o.texto) + '\u0001' + (o.correcta ? '1' : '0');
    }).join('\u0002');
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  g.QZ.examen = {
    barajar: barajar,
    aleatorio: aleatorio,
    letra: letra,
    indicesCorrectos: indicesCorrectos,
    firmaPregunta: firmaPregunta,

    // `ids` define un examen cerrado. `barajarPreguntas: false` conserva su orden.
    construir: function (opts) {
      var semilla = opts.semilla != null ? opts.semilla : (Date.now() >>> 0);
      var rnd = aleatorio(semilla);
      var idsFijos = copiarLista(opts.ids);
      var candidatas = idsFijos
        ? idsFijos.map(function (id) { return g.QZ.banco.porId(id); }).filter(Boolean)
        : g.QZ.banco.filtrar(opts.filtros, opts.idsPermitidos);
      var ordenadas = opts.barajarPreguntas === false ? candidatas.slice() : barajar(candidatas, rnd);
      var elegidas = ordenadas.slice(0, opts.n || ordenadas.length);

      return {
        titulo: opts.titulo,
        filtros: opts.filtros || {},
        semilla: semilla,
        barajarOpciones: opts.barajarOpciones !== false,
        barajarPreguntas: opts.barajarPreguntas !== false,
        idsFuente: idsFijos,
        idsPermitidos: copiarLista(opts.idsPermitidos),
        duracion: opts.duracion || 'sin',
        presetId: opts.presetId || null,
        items: elegidas.map(function (p) {
          return {
            pregunta: p,
            // orden[posicionMostrada] = indiceOriginalDeLaOpcion
            orden: ordenOpciones(p, semilla, opts.barajarOpciones !== false)
          };
        })
      };
    },

    // Reconstruye un examen guardado a partir de los ids y la semilla. Los ids se guardan porque el banco puede haber cambiado entre sesiones.
    rehidratar: function (guardado) {
      var items = [];
      var invalido = false;
      guardado.ids.forEach(function (id) {
        var p = g.QZ.banco.porId(id);
        if (!p || (guardado.firmas && guardado.firmas[id] !== firmaPregunta(p))) {
          invalido = true;
          return;
        }
        items.push({
          pregunta: p,
          orden: ordenOpciones(p, guardado.semilla, guardado.barajarOpciones !== false)
        });
      });
      if (invalido || !items.length) return null;
      return {
        titulo: guardado.titulo,
        filtros: guardado.filtros || {},
        semilla: guardado.semilla,
        barajarOpciones: guardado.barajarOpciones,
        barajarPreguntas: guardado.barajarPreguntas !== false,
        idsFuente: copiarLista(guardado.idsFuente),
        idsPermitidos: copiarLista(guardado.idsPermitidos),
        duracion: guardado.duracion,
        presetId: guardado.presetId || null,
        items: items
      };
    },

    necesarias: function (pregunta) { return pregunta.seleccionar || 1; },

    respondida: function (item, respuestas) {
      var sel = respuestas[item.pregunta.id];
      return Array.isArray(sel) && sel.length === this.necesarias(item.pregunta);
    },

    corregir: function (examen, respuestas) {
      var self = this;
      return examen.items.map(function (item) {
        var sel = respuestas[item.pregunta.id] || [];
        var correctas = indicesCorrectos(item.pregunta);
        var completa = sel.length === self.necesarias(item.pregunta);
        var acierto = completa &&
          sel.slice().sort().join(',') === correctas.slice().sort().join(',');
        return {
          pregunta: item.pregunta,
          orden: item.orden,
          seleccionadas: sel,
          correctas: correctas,
          respondida: completa,
          correcta: acierto
        };
      });
    },

    // Desglose de aciertos por cada faceta declarada
    desglose: function (resultados, facetaId) {
      var tabla = Object.create(null);
      resultados.forEach(function (r) {
        var v = r.pregunta.facetas && r.pregunta.facetas[facetaId];
        if (v === undefined) return;
        (Array.isArray(v) ? v : [v]).forEach(function (x) {
          tabla[x] = tabla[x] || { total: 0, ok: 0 };
          tabla[x].total++;
          if (r.correcta) tabla[x].ok++;
        });
      });
      return tabla;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
