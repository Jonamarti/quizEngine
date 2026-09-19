'use strict';

// Indexa el banco por faceta y resuelve los filtros del generador.
(function (g) {
  g.QZ = g.QZ || {};

  var preguntas = [];
  var facetas = [];
  var porId = Object.create(null);

  function defFaceta(id) {
    for (var i = 0; i < facetas.length; i++) {
      if (facetas[i].id === id) return facetas[i];
    }
    return null;
  }

  // En una faceta acumulativa, seleccionar un valor arrastra todos los anteriores:
  // el examen de naranja incluye el temario de amarillo.
  function expandirAcumulativa(def, seleccionados) {
    var orden = (def.valores || []).map(function (v) { return v.id; });
    var tope = -1;
    seleccionados.forEach(function (v) {
      var i = orden.indexOf(v);
      if (i > tope) tope = i;
    });
    return tope < 0 ? seleccionados : orden.slice(0, tope + 1);
  }

  function cumple(pregunta, criterios) {
    var claves = Object.keys(criterios || {});
    for (var i = 0; i < claves.length; i++) {
      var clave = claves[i];
      var quiere = criterios[clave];
      if (!quiere || !quiere.length) continue;

      var def = defFaceta(clave);
      if (def && def.acumulativa) quiere = expandirAcumulativa(def, quiere);

      var tiene = pregunta.facetas ? pregunta.facetas[clave] : undefined;
      if (tiene === undefined) return false;

      var valores = Array.isArray(tiene) ? tiene : [tiene];
      var coincide = valores.some(function (v) { return quiere.indexOf(v) !== -1; });
      if (!coincide) return false;
    }
    return true;
  }

  g.QZ.banco = {
    init: function (lista, tema) {
      preguntas = lista || [];
      facetas = (tema && tema.facetas) || [];
      porId = Object.create(null);
      preguntas.forEach(function (p) { porId[p.id] = p; });
    },

    todas: function () { return preguntas; },
    porId: function (id) { return porId[id]; },
    facetas: function () { return facetas; },
    defFaceta: defFaceta,

    filtrar: function (criterios, idsPermitidos) {
      var permitidos = idsPermitidos ? new Set(idsPermitidos) : null;
      return preguntas.filter(function (p) {
        if (permitidos && !permitidos.has(p.id)) return false;
        return cumple(p, criterios);
      });
    },

    // Valores de una faceta que todavía dejan preguntas dado el resto de filtros.
    disponibles: function (facetaId, criterios, idsPermitidos) {
      var otros = {};
      Object.keys(criterios || {}).forEach(function (k) {
        if (k !== facetaId) otros[k] = criterios[k];
      });
      var base = this.filtrar(otros, idsPermitidos);
      var cuenta = Object.create(null);
      var def = defFaceta(facetaId);

      if (def && def.acumulativa && def.valores) {
        def.valores.forEach(function (valor) {
          var prueba = {};
          Object.keys(otros).forEach(function (k) { prueba[k] = otros[k]; });
          prueba[facetaId] = [valor.id];
          cuenta[valor.id] = g.QZ.banco.filtrar(prueba, idsPermitidos).length;
        });
        return cuenta;
      }
      base.forEach(function (p) {
        var v = p.facetas && p.facetas[facetaId];
        if (v === undefined) return;
        (Array.isArray(v) ? v : [v]).forEach(function (x) {
          cuenta[x] = (cuenta[x] || 0) + 1;
        });
      });
      return cuenta;
    },

    // Facetas que procede mostrar: se ocultan las que dependen de un valor que no está seleccionado.
    aplicables: function (criterios) {
      return facetas.filter(function (f) {
        if (!f.dependeDe) return true;
        return Object.keys(f.dependeDe).every(function (k) {
          var sel = (criterios || {})[k] || [];
          return sel.indexOf(f.dependeDe[k]) !== -1;
        });
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
