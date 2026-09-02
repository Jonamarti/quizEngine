'use strict';

// Todas las cadenas de interfaz en un solo sitio, para poder traducir el motor sin
// tocar la lógica. Un tema puede sobreescribir cualquiera desde TEMA.textos.
(function (g) {
  g.QZ = g.QZ || {};

  g.QZ.T = {
    sinPreguntas: 'No hay preguntas cargadas. Comprueba que el tema se construyó con su banco.',

    listadoTitulo: 'Elige un examen',
    generadorAbrir: 'Generar examen a medida',
    generadorTitulo: 'Generar examen',
    generadorVolver: 'Volver',
    preguntasDisponibles: 'preguntas disponibles',
    numeroPreguntas: 'Número de preguntas',
    temporizador: 'Temporizador',
    barajarOpciones: 'Barajar las opciones',
    soloFalladas: 'Solo las que he fallado',
    soloSinVer: 'Solo las que no he visto',
    generar: 'Generar',
    limpiarFiltros: 'Limpiar filtros',
    sinResultados: 'Ningún filtro deja preguntas. Prueba a quitar alguno.',
    cualquiera: 'Cualquiera',

    preguntas: 'preguntas',
    aprobadoCon: 'aprobado',
    comenzar: 'Comenzar',
    borrarAvance: 'Borrar avance',
    avanceBorrado: 'Avance borrado',
    completado: 'Completado',
    ultimoIntento: 'Último intento',

    examenEnCurso: 'Examen en curso',
    hayAvance: 'Hay un avance guardado. ¿Qué quieres hacer?',
    continuar: 'Continuar',
    empezarDeNuevo: 'Empezar de nuevo',
    cancelar: 'Cancelar',

    seCorrigeAlFinalizar: 'las respuestas se corrigen al pulsar Finalizar',
    respondidas: 'respondidas',
    finalizar: 'Finalizar',
    reiniciar: 'Reiniciar',
    salir: 'Salir',
    navegadorTitulo: 'Preguntas',
    leyendaRespondida: 'respondida',
    leyendaSin: 'sin responder',
    pregunta: 'Pregunta',
    seleccionaN: 'Selecciona {n} opciones.',

    tiempoAgotado: 'Tiempo agotado',
    tiempoAgotadoMsg: 'Se ha agotado el tiempo. Puedes finalizar para corregir el examen.',
    finalizarExamen: 'Finalizar examen',
    sinResponderTitulo: 'Preguntas sin responder',
    sinResponderMsg: 'Hay <b>{n}</b> pregunta(s) sin respuesta completa. Contarán como incorrectas. ¿Finalizar de todos modos?',
    finalizarIgual: 'Finalizar de todos modos',
    seguirRespondiendo: 'Seguir respondiendo',

    resultado: 'Resultado',
    aprobado: 'Aprobado',
    noAprobado: 'No alcanza el mínimo',
    totales: 'Totales',
    correctas: 'Correctas',
    incorrectas: 'Incorrectas',
    sinResponder: 'Sin responder',
    acierto: 'Acierto',
    desglosePor: 'Acierto por',
    reintentar: 'Reintentar',
    repasarFalladas: 'Repasar las falladas',
    volverAlListado: 'Volver al listado',
    revision: 'Revisión pregunta a pregunta',
    esCorrecta: 'Correcta',
    esIncorrecta: 'Incorrecta',
    correctaNoSeleccionada: '(correcta, no seleccionada)',
    porQueCorrecta: 'Por qué es CORRECTA:',
    porQueIncorrecta: 'Por qué es INCORRECTA:',
    clave: 'Clave:',
    fuente: 'Fuente:',

    historialTitulo: 'Tus últimos intentos',
    historialVacio: 'Todavía no has terminado ningún examen.',
    historialBorrar: 'Borrar historial'
  };

  g.QZ.t = function (clave, sust) {
    var tema = g.TEMA && g.TEMA.textos;
    var s = (tema && tema[clave]) || g.QZ.T[clave] || clave;
    if (sust) {
      Object.keys(sust).forEach(function (k) {
        s = s.replace('{' + k + '}', sust[k]);
      });
    }
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
