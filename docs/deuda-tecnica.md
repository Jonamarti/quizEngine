# Deuda técnica

Revisión del 19 de septiembre de 2026 para `quiz-engine` 1.3.0.
[Índice](README.md).

La revisión de 1.2.0 registró doce hallazgos. La 1.3.0 los cierra con cambios de
código y pruebas. Este documento conserva las decisiones y la evidencia; no es
una afirmación de que el proyecto no pueda adquirir deuda nueva.

| ID | Prioridad | Estado en 1.3.0 | Evidencia |
| --- | --- | --- | --- |
| DT-01 | Alta | Cerrada | Constructor con rutas comprobadas, preparación temporal y publicación al final; pruebas de solapamiento y conservación de salida. |
| DT-02 | Alta | Cerrada | Fecha límite absoluta, bloqueo al vencer y modal no descartable; humo con reloj adelantado y Escape. |
| DT-03 | Alta | Cerrada | `idsPermitidos`, `idsFuente` y políticas de barajado viajan en examen y progreso. |
| DT-04 | Alta | Cerrada | Progreso v2, firmas de opciones, saneamiento de estructuras, aviso de escritura y límites. |
| DT-05 | Media | Cerrada | Recuentos acumulativos con semántica de filtro y poda de dependencias hasta punto fijo. |
| DT-06 | Media | Cerrada | Validación estructural, de referencias, ciclos, rutas y argumentos CLI. |
| DT-07 | Media | Cerrada | IDs restringidos por contrato, DOM codificado y mapas sin prototipo. |
| DT-08 | Media | Cerrada | Humo adaptable a capacidades opcionales y cierre de Chromium con `finally`. |
| DT-09 | Media | Cerrada | Nombre accesible, foco inicial/retorno, confinamiento y fondo inerte. |
| DT-10 | Baja | Cerrada | `color-mix()` válido, idioma/locale configurables y textos restantes externalizados. |
| DT-11 | Baja | Cerrada | Manifiesto, lockfile y documentación en 1.3.0; `docs/` incluido y `npm pack --dry-run` verificado. |
| DT-12 | Baja | Cerrada | Benchmark reproducible de 10.000 preguntas y eliminación de trabajo síncrono por tick. |

## Decisiones de cierre

### DT-01 · Construcción segura

`quiz-construir` valida argumentos y rechaza una salida que solape el tema o la
plantilla `web/` del motor, incluidos enlaces simbólicos como destino. Comprueba
la plantilla antes de tocar la salida, construye en un hermano temporal y sólo
entonces sustituye el sitio anterior. Los enlaces encontrados dentro de fuentes
se rechazan de forma explícita.

### DT-02 · Temporizador

El estado conserva `limite` en milisegundos. Cada actualización calcula el tiempo
restante contra `Date.now()`, por lo que un callback tardío no prolonga la prueba.
Al vencer se deshabilitan respuestas y reinicio; el aviso no se cierra con Escape
y sólo permite finalizar. Una reanudación usa el mismo límite y vence de inmediato
si ya pasó.

### DT-03 · Alcance de selección y presets cerrados

El examen conserva `idsPermitidos`, `idsFuente`, `barajarPreguntas` y
`barajarOpciones`. Reiniciar y reintentar reconstruyen desde esa política, no sólo
desde filtros y tamaño. Esta misma base implementa los presets cerrados de 1.3.0:
`ids` fija sus integrantes y `barajarPreguntas: false` conserva el orden declarado.

### DT-04 · Persistencia

El progreso usa formato `version: 2` y guarda una firma por pregunta derivada de
ID, texto, orden y corrección de opciones. Un ID retirado o una firma diferente
descarta el avance completo, evitando reinterpretar índices antiguos. Progreso,
historial y estadísticas se sanean al leer; el historial queda en 50 intentos y
las estadísticas en las 5.000 preguntas más recientes. Un fallo de `localStorage`
se muestra en la barra del examen.

No hay migración de progresos 1.x: se descartan deliberadamente porque carecen de
firma y no se puede demostrar que sus índices sigan significando lo mismo.

### DT-05 · Generador

`disponibles` calcula cada valor acumulativo con la misma expansión que `filtrar`.
La poda de facetas dependientes se repite hasta que no quedan filtros invisibles.
El validador rechaza ciclos de dependencia.

### DT-06 · Contrato y CLI

El validador comprueba estructuras antes de recorrerlas; unicidad y formato de
facetas, valores, grupos y presets; dependencias; duraciones; tamaños; filtros;
referencias de `ids`; banco no vacío y rutas de medios normalizadas y contenidas.
Los dos CLI rechazan flags desconocidos o sin valor con un diagnóstico breve.

Los enunciados duplicados siguen siendo error salvo que todas sus apariciones
declaren el mismo `varianteDe`, que documenta que son variantes deliberadas.

### DT-07 · Identificadores

El contrato acepta IDs que empiezan por letra o número y continúan con letras
ASCII, números, `_` o `-`; reserva `__proto__`, `prototype` y `constructor`.
Además, los índices internos usan objetos sin prototipo y los IDs del DOM se
derivan con codificación porcentual. La defensa en ejecución no depende sólo del
validador.

### DT-08 y DT-09 · Humo y accesibilidad

El recorrido de humo ya no exige fuentes, desgloses, presets ni grupos no vacíos,
y una faceta acumulativa sólo debe mantener o aumentar candidatos. Chromium se
cierra en `finally`. El mismo recorrido verifica foco dentro del modal, fondo
inerte, vencimiento y Escape. El diálogo está asociado a `modal-titulo`, confina
Tab/Mayús+Tab y devuelve el foco al cerrarse.

### DT-10 · Presentación y localización

Los fondos se generan con `color-mix(in srgb, …, transparent)`, válido para HSL,
hex y colores CSS. `TEMA.idioma` actualiza `lang`; `TEMA.locale` controla fechas
mediante `Intl.DateTimeFormat`. «Fecha», «Examen», «Aciertos», «Repaso» y
«acumulativo» pasan por `TEMA.textos`.

### DT-11 · Distribución

`package.json`, `package-lock.json` y ejemplos declaran 1.3.0. El paquete incluye
`docs/`. El 19 de septiembre de 2026, `npm pack --dry-run --json` produjo un
inventario de 25 ficheros e incluyó motor, CLI, esquema, humo y documentación. No
se creó tag, commit ni tarball durante la comprobación.

### DT-12 · Rendimiento

`npm run benchmark` genera un banco sintético y deja visibles volumen, versión de
Node y memoria. Medición de referencia en Windows, Node 23.7.0, 10.000 preguntas:

| Operación | Resultado |
| --- | ---: |
| 100 filtros sobre el banco | 92,9 ms |
| 20 recuentos de faceta | 45,7 ms |
| 100 exámenes de 40 preguntas | 43,7 ms |
| Heap usado al terminar | 15,3 MiB |

Además, `idsPermitidos` usa `Set`, el listado lee el historial una vez por render y
el temporizador dejó de serializar todo el progreso cada segundo. El benchmark no
es un umbral de CI: sirve para detectar regresiones de orden de magnitud y decidir
optimizaciones con datos.
