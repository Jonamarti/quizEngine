'use strict';

// Vista del examen: barra superior, navegador lateral y lista de preguntas.
(function (g) {
  var QZ = g.QZ;
  var ui = QZ.ui, t = QZ.t, esc = QZ.ui.esc;

  var refEstado = null;
  var refCb = null;

  function idDom(pid) {
    return 'p-' + String(pid).replace(/[^A-Za-z0-9_-]/g, '_');
  }

  function renderBarra(estado, cb) {
    var conCrono = estado.modo !== 'sin';
    ui.$('#barra-examen').innerHTML =
      '<div class="barra-info">' +
        '<div class="info-titulo">' + esc(estado.examen.titulo || '') + '</div>' +
        '<div class="info-meta">' + estado.examen.items.length + ' ' + esc(t('preguntas')) +
          ' · ' + esc(t('seCorrigeAlFinalizar')) + '</div>' +
      '</div>' +
      (conCrono ? '<div class="temporizador" id="temporizador">--:--</div>' : '') +
      '<div class="progreso-respuestas" id="progreso-respuestas"></div>' +
      '<div class="acciones">' +
        '<button class="btn btn-primario" id="btn-finalizar">' + esc(t('finalizar')) + '</button>' +
        '<button class="btn" id="btn-reiniciar">' + esc(t('reiniciar')) + '</button>' +
        '<button class="btn" id="btn-salir">' + esc(t('salir')) + '</button>' +
      '</div>';

    ui.$('#btn-finalizar').addEventListener('click', cb.onFinalizar);
    ui.$('#btn-reiniciar').addEventListener('click', cb.onReiniciar);
    ui.$('#btn-salir').addEventListener('click', cb.onSalir);
  }

  function renderPreguntas(estado, cb) {
    var cont = ui.$('#contenedor-preguntas');
    cont.innerHTML = '';

    estado.examen.items.forEach(function (item, i) {
      var p = item.pregunta;
      var n = QZ.examen.necesarias(p);

      var tarjeta = document.createElement('article');
      tarjeta.className = 'pregunta';
      tarjeta.id = idDom(p.id);

      var cab = document.createElement('div');
      cab.className = 'pregunta-cabecera';
      cab.innerHTML = '<span class="pregunta-titulo">' + esc(t('pregunta')) + ' ' + (i + 1) + '</span>' +
        ui.chips(p);
      tarjeta.appendChild(cab);

      if (n > 1) {
        var aviso = document.createElement('p');
        aviso.className = 'aviso-multi';
        aviso.textContent = t('seleccionaN', { n: n });
        tarjeta.appendChild(aviso);
      }

      var enun = document.createElement('p');
      enun.className = 'enunciado';
      enun.textContent = p.enunciado;
      tarjeta.appendChild(enun);

      if (p.imagen && p.imagen.src) {
        var figura = document.createElement('div');
        figura.innerHTML = ui.imagenPregunta(p);
        tarjeta.appendChild(figura.firstChild);
      }

      var caja = document.createElement('div');
      caja.className = 'opciones';

      item.orden.forEach(function (orig, pos) {
        var op = p.opciones[orig];
        var etiq = document.createElement('label');
        etiq.className = 'opcion';

        var sel = estado.respuestas[p.id] || [];
        var input = document.createElement('input');
        input.type = n > 1 ? 'checkbox' : 'radio';
        input.name = 'g-' + idDom(p.id);
        input.value = String(orig);
        input.checked = sel.indexOf(orig) !== -1;
        input.addEventListener('change', function () {
          cambiar(estado, item, orig, input, cb);
        });

        var letra = document.createElement('span');
        letra.className = 'opcion-letra';
        letra.textContent = QZ.examen.letra(pos) + ')';

        var texto = document.createElement('span');
        texto.className = 'opcion-texto';
        texto.textContent = op.texto;

        etiq.appendChild(input);
        etiq.appendChild(letra);
        etiq.appendChild(texto);
        caja.appendChild(etiq);
      });

      tarjeta.appendChild(caja);
      cont.appendChild(tarjeta);
    });
  }

  function cambiar(estado, item, orig, input, cb) {
    var p = item.pregunta;
    var n = QZ.examen.necesarias(p);
    var sel = (estado.respuestas[p.id] || []).slice();

    if (n > 1) {
      if (input.checked) {
        if (sel.indexOf(orig) === -1) sel.push(orig);
        // Al superar el número pedido se descarta la más antigua, en vez de
        // desmarcar la que el usuario acaba de pulsar: cambiar de idea sobre la
        // última opción es lo normal, y desmarcarla obliga a deshacer a mano.
        while (sel.length > n) {
          var fuera = sel.shift();
          var otro = document.querySelector(
            'input[name="g-' + idDom(p.id) + '"][value="' + fuera + '"]');
          if (otro) otro.checked = false;
        }
      } else {
        sel = sel.filter(function (x) { return x !== orig; });
      }
    } else {
      sel = input.checked ? [orig] : [];
    }

    if (sel.length) estado.respuestas[p.id] = sel;
    else delete estado.respuestas[p.id];

    cb.onCambio();
  }

  function renderNavegador(estado) {
    var nav = ui.$('#navegador-preguntas');
    nav.innerHTML = '';

    var titulo = document.createElement('h4');
    titulo.textContent = t('navegadorTitulo');
    nav.appendChild(titulo);

    var rejilla = document.createElement('div');
    rejilla.className = 'navegador-rejilla';

    estado.examen.items.forEach(function (item, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-num';
      b.textContent = i + 1;
      b.addEventListener('click', function () {
        var destino = document.getElementById(idDom(item.pregunta.id));
        if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      rejilla.appendChild(b);
    });
    nav.appendChild(rejilla);

    // Esta leyenda se construye con appendChild a propósito. Añadirla con
    // innerHTML += reconstruiría la rejilla y tiraría los listeners de arriba,
    // que es justo lo que rompía la navegación en la app de ISTQB.
    var leyenda = document.createElement('div');
    leyenda.className = 'leyenda-navegador';
    leyenda.innerHTML = '<span class="punto respondida"></span> ' + esc(t('leyendaRespondida')) +
      '<br><span class="punto sin"></span> ' + esc(t('leyendaSin'));
    nav.appendChild(leyenda);
  }

  QZ.vistaExamen = {
    render: function (estado, cb) {
      refEstado = estado;
      refCb = cb;
      renderBarra(estado, cb);
      renderPreguntas(estado, cb);
      renderNavegador(estado);
      this.actualizar(estado);
    },

    actualizar: function (estado) {
      var nums = document.querySelectorAll('#navegador-preguntas .nav-num');
      var hechas = 0;
      estado.examen.items.forEach(function (item, i) {
        var ok = QZ.examen.respondida(item, estado.respuestas);
        if (ok) hechas++;
        if (nums[i]) nums[i].classList.toggle('respondida', ok);
      });
      var prog = ui.$('#progreso-respuestas');
      if (prog) {
        prog.textContent = hechas + '/' + estado.examen.items.length + ' ' + t('respondidas');
      }
    },

    pintarTiempo: function (seg) {
      var el = ui.$('#temporizador');
      if (!el) return;
      el.textContent = ui.tiempo(seg);
      el.classList.toggle('urgente', seg <= 60);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
