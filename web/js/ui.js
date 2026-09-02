'use strict';

// Utilidades compartidas por las vistas.
(function (g) {
  g.QZ = g.QZ || {};
  var t = function () { return g.QZ.t.apply(null, arguments); };

  function esc(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  g.QZ.ui = {
    esc: esc,
    $: function (sel) { return document.querySelector(sel); },

    vista: function (nombre) {
      ['listado', 'generador', 'examen', 'resultados'].forEach(function (v) {
        var el = document.querySelector('#vista-' + v);
        if (el) el.classList.toggle('activa', v === nombre);
      });
      window.scrollTo(0, 0);
    },

    modal: function (titulo, mensajeHTML, botones) {
      var m = document.querySelector('#modal');
      document.querySelector('#modal-titulo').textContent = titulo;
      document.querySelector('#modal-mensaje').innerHTML = mensajeHTML;
      var cont = document.querySelector('#modal-acciones');
      cont.innerHTML = '';
      botones.forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'btn ' + (b.clase || '');
        btn.textContent = b.texto;
        btn.addEventListener('click', b.onClick);
        cont.appendChild(btn);
      });
      m.classList.remove('oculto');
      m.dataset.abierto = '1';
    },

    cerrarModal: function () {
      var m = document.querySelector('#modal');
      m.classList.add('oculto');
      delete m.dataset.abierto;
    },

    tiempo: function (seg) {
      if (seg == null || seg < 0) seg = 0;
      var m = Math.floor(seg / 60), s = seg % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },

    fecha: function (ms) {
      var d = new Date(ms);
      var p = function (n) { return String(n).padStart(2, '0'); };
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
        ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    },

    etiquetaValor: function (facetaId, valorId) {
      var def = g.QZ.banco.defFaceta(facetaId);
      if (def && def.valores) {
        for (var i = 0; i < def.valores.length; i++) {
          if (def.valores[i].id === valorId) return def.valores[i].etiqueta || valorId;
        }
      }
      return valorId;
    },

    colorValor: function (facetaId, valorId) {
      var def = g.QZ.banco.defFaceta(facetaId);
      if (def && def.valores) {
        for (var i = 0; i < def.valores.length; i++) {
          if (def.valores[i].id === valorId) return def.valores[i].color || null;
        }
      }
      return null;
    },

    // Chips de facetas de una pregunta. El color va en línea para que añadir un
    // valor nuevo al tema no obligue a tocar el CSS.
    chips: function (pregunta) {
      var self = this;
      var html = '';
      g.QZ.banco.facetas().forEach(function (f) {
        var v = pregunta.facetas && pregunta.facetas[f.id];
        if (v === undefined) return;
        (Array.isArray(v) ? v : [v]).forEach(function (x) {
          var color = self.colorValor(f.id, x);
          var estilo = color
            ? ' style="background:' + esc(color) + '22;border-color:' + esc(color) + '"'
            : '';
          html += '<span class="chip"' + estilo + '>' + esc(self.etiquetaValor(f.id, x)) + '</span>';
        });
      });
      return html;
    },

    resumenFiltros: function (filtros) {
      var self = this;
      var partes = [];
      Object.keys(filtros || {}).forEach(function (k) {
        var vs = filtros[k];
        if (!vs || !vs.length) return;
        partes.push(vs.map(function (v) { return self.etiquetaValor(k, v); }).join(' / '));
      });
      return partes.length ? partes.join(' · ') : t('cualquiera');
    }
  };

  // Imagen opcional de una pregunta: identificar una técnica por su dibujo. El
  // credito va pegado a la imagen porque las licencias tipo CC BY-SA obligan a
  // atribuir donde se usa la obra, no en una pagina aparte.
  QZ.ui.imagenPregunta = function (p) {
    if (!p.imagen || !p.imagen.src) return '';
    return '<figure class="imagen-pregunta">' +
      '<img src="' + QZ.ui.esc(p.imagen.src) + '"' +
        ' alt="' + QZ.ui.esc(p.imagen.alt || '') + '" loading="lazy">' +
      (p.imagen.credito
        ? '<figcaption>' + QZ.ui.esc(p.imagen.credito) + '</figcaption>'
        : '') +
      '</figure>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
