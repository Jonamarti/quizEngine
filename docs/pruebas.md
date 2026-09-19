# Pruebas

[Índice](README.md).

## Capas

| Capa | Comando | Finalidad |
| --- | --- | --- |
| Unidad y CLI | `npm test` | Módulos puros, persistencia, validación y construcción sobre árboles temporales. |
| Humo | `npm run test:e2e` | Recorrido real en Chromium del sitio generado con `file://`. |
| Rendimiento | `npm run benchmark` | Referencia informativa con 10.000 preguntas; no es umbral de CI. |
| Paquete | `npm pack --dry-run --json` | Inventario exacto que recibiría un consumidor. |

## Unidad y CLI

`pruebas/cargar.js` ejecuta los mismos módulos clásicos que usa el navegador en
un objeto global aislado. Las pruebas de `banco` y `examen` cubren filtrado,
facetas acumulativas, conjuntos permitidos, presets por IDs, orden configurable,
semillas, firmas, rehidratación, corrección múltiple y desgloses.

`persistencia.test.js` inyecta un `localStorage` controlado y prueba versión del
progreso, estructuras incorrectas, almacenamiento bloqueado y saneamiento de
historial.

Los CLI se ejecutan como procesos reales:

- `validar.test.js` cubre estructura, IDs, variantes, opciones, facetas,
  dependencias cíclicas, filtros, grupos, presets cerrados, imágenes y cobertura.
- `construir.test.js` cubre ensamblado, orden de scripts, medios, limpieza de
  restos, rechazo de solapamientos y conservación del destino ante un fallo.

## Humo en Chromium

`pruebas/humo.js` lee las capacidades del tema cargado y recorre sólo las que
aplican. No exige presets, fuentes, desgloses, imágenes, grupos ni duraciones con
reloj. Comprueba:

- carga sin errores, título, contador y generador;
- facetas dependientes y acumulativas;
- construcción, respuesta simple/múltiple y navegador;
- persistencia, reanudación, resultados, historial y repaso;
- foco y fondo inerte del modal;
- vencimiento por fecha límite, bloqueo y Escape;
- colores configurables, imágenes, grupos, modo oscuro y ancho móvil.

El navegador se cierra mediante `finally`, incluso si una aserción o Playwright
interrumpe el recorrido.

## Límites

La suite no verifica navegadores distintos de Chromium, sincronización entre
dispositivos ni contenido pedagógico. Los temas son JavaScript de confianza: ni
el validador ni las pruebas son un sandbox. El benchmark sirve para comparar
órdenes de magnitud en el mismo entorno, no para prometer tiempos absolutos.
