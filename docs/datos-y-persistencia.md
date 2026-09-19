# Datos y persistencia

Revisado el 19 de septiembre de 2026. [Índice](README.md).

## Fuentes del contrato

[ESQUEMA.md](../ESQUEMA.md) contiene los ejemplos de autoría y
[pruebas/tema-ejemplo](../pruebas/tema-ejemplo) los ejercita. Esta referencia
describe cómo consume el motor esos datos y qué valida realmente
[scripts/validar.js](../scripts/validar.js).

```text
tema/
  config.js        registra TEMA
  banco/*.js       añade preguntas a PREGUNTAS; carga alfabética, no recursiva
  medios/          recursos opcionales; copia recursiva a medios/ del sitio
```

Ambos tipos de script deben funcionar con `window` en navegador y `globalThis`
en Node. El ejemplo de `window.TEMA = ...` en el esquema necesita envolverse en
el patrón de auto-registro mostrado allí para poder validarse desde Node.

## Configuración consumida

| Campo | Comportamiento |
| --- | --- |
| `id`, `titulo`, `prefijoAlmacen` | Obligatorios para el validador. El prefijo separa el almacenamiento entre temas. |
| `subtitulo` | Texto opcional de cabecera. |
| `aprobado` | Fracción en `(0, 1]`; por defecto el motor usa `0.65`. |
| `duraciones` | Lista de `{ valor, etiqueta, minutos }`; en ausencia se ofrece solo `sin`, con cero minutos. Conviene mantener ese identificador para el modo sin reloj. |
| `tamanos` | Tamaños del generador; por defecto `[10, 20, 40]`, recortados a las preguntas disponibles. Se añade la opción de usar todas. |
| `facetas` | Al menos una; define clasificación, filtros, chips y desgloses. |
| `presets` | Exámenes predefinidos; el motor admite ausencia o lista vacía. |
| `grupos` | Organización opcional de presets en el listado. |
| `textos` | Sobrescribe claves de `QZ.T`; `QZ.t` usa después el diccionario y, si falta, la propia clave. No todos los textos de la interfaz pasan por esta función. |

Un preset consume `id`, `titulo`, `descripcion`, `filtros`, `grupo`, `n`,
`duracion`, `barajarOpciones`, `barajarPreguntas` e `ids`. Las dos clases de
barajado están activas salvo `false` explícito. `ids` define una composición
cerrada y ordenada; sin él se selecciona desde los filtros. Si `n` se omite, se
toman todas las candidatas; si excede el banco filtrado, se toman las disponibles.

Los grupos se presentan en su orden de declaración. Las secciones vacías no se
dibujan. Los presets sin grupo, o con referencia desconocida, van a «Otros»
cuando hay grupos declarados; el segundo caso es además un error del validador.
Las pastillas de grupo solo aparecen con dos o más secciones no vacías.

## Preguntas y filtrado

Una pregunta lleva `id` estable, `enunciado`, `facetas` y entre dos y ocho
`opciones`. Cada opción tiene `texto`, `explicacion` y `correcta` opcional de
tipo booleano; omitirla equivale a incorrecta. `seleccionar` vale uno por defecto
y, si se especifica, debe ser entero positivo e igual al número de correctas.
`nota`, `fuente`, `origen` e `imagen` amplían la revisión o la trazabilidad.

Las reglas se implementan en [banco.js](../web/js/banco.js):

- Los criterios son arrays. Un eje ausente o un array vacío no restringe.
- Los valores de un mismo eje se combinan con OR; los ejes diferentes, con AND.
- Una pregunta puede tener un valor escalar o varios valores en un array.
- Las facetas sin `valores` son abiertas: el motor deduce sus valores del banco
  y el validador no exige un catálogo. Esto matiza la regla general del esquema
  que dice que todos los valores deben estar declarados.
- En una faceta acumulativa se incluyen los valores anteriores al mayor
  seleccionado, según el orden declarado en `valores`.
- `dependeDe` controla qué filtros se muestran, comprobando la selección literal
  del usuario. No impone por sí mismo un filtro al banco ni expande dependencias
  por el orden acumulativo.
- `idsPermitidos`, cuando se proporciona, restringe además las preguntas por ID;
  un array vacío devuelve cero preguntas y `null` no restringe.

`disponibles` excluye el criterio del propio eje al contar. Para facetas normales
devuelve frecuencias exactas; para acumulativas devuelve cuántas candidatas
quedarían al escoger cada tope, con la misma semántica que `filtrar`.

## Barajado y corrección

[examen.js](../web/js/examen.js) usa Mulberry32 y Fisher–Yates. La semilla por
defecto es `Date.now() >>> 0`; una semilla explícita permite repetir la selección
si el banco y su orden no cambian. El orden de las opciones deriva de la semilla
del examen y del ID de pregunta, de forma independiente al sorteo de preguntas.

Cada item tiene `{ pregunta, orden }`: `orden[posicionMostrada]` indica el índice
original de la opción. Las respuestas guardan **índices originales**, no letras
ni posiciones visibles. Una respuesta múltiple solo acierta si coincide con el
conjunto completo de opciones correctas. No hay puntos parciales ni penalización;
el aprobado se calcula como `aciertos / total >= aprobado`.

Una selección incompleta se clasifica como «sin responder». Los desgloses cuentan
la pregunta en cada valor de una faceta múltiple, por lo que sumar filas puede
superar el total de preguntas. La vista omite un desglose con menos de dos valores.

## Imágenes y límites del validador

`imagen` requiere un objeto con `src` y `alt`. Se comprueba que la ruta empiece
por `medios/`, que no sea una URL externa y que exista en el tema. Falta de crédito
produce aviso. El crédito y la imagen aparecen tanto en el examen como en la
revisión. La comprobación de existencia no asegura que la ruta quede dentro de
`medios/` después de normalizar `..`, ni que sea un fichero decodificable.

El validador detecta duplicados de ID y de enunciado no declarados como variantes, opciones repetidas y vacías,
explicaciones ausentes, incoherencias de selección, facetas desconocidas, valores
no declarados en facetas cerradas e incoherencias de grupos. Normaliza espacios
exteriores y minúsculas para comparar textos duplicados. No exige que toda
pregunta tenga todas las facetas; sí exige alguna. La falta de `fuente` es aviso.

También valida tipos estructurales, IDs y referencias de facetas/valores/presets,
dependencias y ciclos, filtros, duraciones, tamaños, presets cerrados, banco vacío
y contención normalizada de medios. El contenido sigue siendo código JavaScript
ejecutable y por tanto debe proceder de una fuente de confianza.

## Almacenamiento local

[persistencia.js](../web/js/persistencia.js) usa claves concatenadas con
`TEMA.prefijoAlmacen`; el fallback del motor es `quiz_`, aunque el validador exige
declarar un prefijo.

| Sufijo | Contenido | Retención |
| --- | --- | --- |
| `progreso` | Versión 2, política de selección, firmas de opciones, IDs ordenados, respuestas, modo y fecha límite. | Un examen; se sustituye al guardar y se borra al finalizar o empezar de nuevo. |
| `historial` | Intentos con fecha, título, preset, filtros, total y aciertos. | Los 50 últimos, más reciente primero; el listado muestra diez. |
| `aciertos` | Mapa por ID con `{ vistas, fallos, ultima }`. | Sin límite ni caducidad implementados. |

El progreso no copia las preguntas, pero firma ID, texto, orden y corrección de
opciones. Si desaparece un ID o cambia una firma, se descarta completo. Los
progresos anteriores a la versión 2 también se descartan porque no se puede
demostrar que sus índices sigan representando las mismas respuestas.

Las estadísticas se actualizan al **finalizar**. «Sin ver» significa sin resultados
registrados, no sin haber aparecido en pantalla. «Solo falladas» incluye preguntas
falladas alguna vez y también las dejadas sin responder; acertarlas después no
elimina su contador de fallos. «Repasar las falladas» desde resultados usa solo
las incorrectas o incompletas de ese intento. Borrar historial no borra progreso
ni estadísticas de preguntas.

Las excepciones de acceso y JSON inválido se absorben; las escrituras devuelven
éxito o fallo, pero la interfaz no lo comunica. Un JSON válido con forma errónea
no se sanea. No hay exportación, migración ni sincronización entre dispositivos
o pestañas. El comportamiento bajo `file://` depende del navegador y sus permisos;
en esta revisión se verificó únicamente Chromium con almacenamiento disponible.
