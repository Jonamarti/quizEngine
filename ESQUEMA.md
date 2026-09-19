# Contrato de datos del motor

El motor no sabe nada del tema. Todo lo que necesita llega en dos formas: un objeto
`window.TEMA` y un array `window.PREGUNTAS`. Un tema es una carpeta con esos dos
ingredientes; el constructor la une con el motor y produce un sitio estático.

## Ficheros de un tema

```
tema/
  config.js          define window.TEMA
  banco/*.js         empujan preguntas a window.PREGUNTAS
```

Ambos usan el mismo patrón de auto-registro, que permite abrir la web con `file://` sin
servidor y a la vez cargar los ficheros desde Node con `require()` para validarlos:

```js
(function (g) {
  'use strict';
  g.PREGUNTAS = g.PREGUNTAS || [];
  g.PREGUNTAS.push({ /* ... */ });
})(typeof window !== 'undefined' ? window : globalThis);
```

## Pregunta

```js
{
  id: 'judo-grado-0042',     // estable y único en todo el banco
  enunciado: 'texto de la pregunta',
  facetas: { disciplina: 'judo', grado: 'naranja', bloque: 'tecnica' },
  opciones: [
    { texto: '...', correcta: true,  explicacion: '...' },
    { texto: '...', correcta: false, explicacion: '...' }
  ],
  seleccionar: 1,            // opcional, por defecto 1. Nº de opciones correctas
  nota: '...',               // opcional. Clave de la respuesta, se muestra al revisar
  fuente: '...',             // opcional pero recomendado. Trazabilidad
  origen: 'generada',        // opcional: 'generada' | 'autorada'
  varianteDe: 'riesgo-producto' // opcional: variantes deliberadas con igual enunciado
}
```

Reglas que impone el validador:

- `id` único en todo el banco.
- El `id` empieza por letra o número y sólo contiene letras ASCII, números, `_`
  o `-`. `__proto__`, `prototype` y `constructor` están reservados.
- Entre 2 y 8 opciones, todas con `texto` y `explicacion` no vacíos,  **también las
  incorrectas**.
- El número de opciones con `correcta: true` debe ser exactamente `seleccionar`.
- Sin textos de opción repetidos dentro de una misma pregunta.
- Sin enunciados repetidos en todo el banco.
- Si dos variantes necesitan exactamente el mismo enunciado, ambas deben declarar
  el mismo `varianteDe`; así la repetición queda documentada en vez de ser accidental.
- Toda clave y todo valor de `facetas` deben estar declarados en `TEMA.facetas`.

## Imagen de una pregunta

Una pregunta puede llevar una imagen: sirve para pedir que se identifique lo que se
ve, en vez de describirlo con palabras.

```js
{
  id: 'judo-tec-0100',
  enunciado: '¿Qué técnica muestra el dibujo?',
  imagen: {
    src: 'medios/morote-gari.svg',                           // obligatorio, relativo al tema
    alt: 'Un competidor toma las dos piernas del rival',     // obligatorio
    credito: 'Judcosta, CC BY-SA 3.0, vía Wikimedia Commons' // recomendado
  },
  opciones: [ /* ... */ ]
}
```

Los ficheros viven en `tema/medios/` y el constructor los copia a `medios/` dentro
del sitio. **No se admiten URL externas**: el examen tiene que abrirse con `file://`
y sin conexión, y una imagen que no carga deja la pregunta sin respuesta posible,
porque lo que hay que identificar es justo el dibujo. Por eso el validador
comprueba que el fichero exista antes de construir.

El `alt` es obligatorio y **no puede nombrar la respuesta**: un lector de pantalla
leería «tai-otoshi» y resolvería la pregunta. Descríbase lo que se ve, no cómo se
llama. El `credito` se pinta bajo la imagen porque las licencias tipo CC BY-SA
obligan a atribuir allí donde se usa la obra.

**Las opciones no llevan letra.** El motor las baraja al construir el examen y asigna las
letras entonces.

## Tema

```js
window.TEMA = {
  id: 'combat',
  titulo: 'Artes marciales y teoría del entrenamiento',
  subtitulo: 'Exámenes con explicación en cada opción',
  prefijoAlmacen: 'combatquiz_v1_',   // namespace de localStorage
  aprobado: 0.7,                       // fracción para aprobar
  idioma: 'es',                        // opcional: atributo lang del documento
  locale: 'es-ES',                     // opcional: formato de fecha de Intl
  duraciones: [
    { valor: 'sin', etiqueta: 'Sin temporizador', minutos: 0 },
    { valor: '20',  etiqueta: '20 minutos',       minutos: 20 }
  ],
  tamanos: [10, 20, 40],               // opciones de nº de preguntas del generador
  facetas: [ /* ver abajo */ ],
  presets: [ /* ver abajo */ ]
}
```

`prefijoAlmacen` tiene que ser único por aplicación: si dos temas se publican bajo el mismo
origen, por ejemplo dos rutas del mismo GitHub Pages, comparten `localStorage` y sin
prefijo distinto se pisan el progreso.

## Faceta

Un eje de clasificación: El motor construye con ellas los filtros, los chips y el desglose
de resultados, sin saber qué significan.

```js
{
  id: 'grado',
  etiqueta: 'Grado',
  valores: [
    { id: 'amarillo', etiqueta: 'Amarillo', color: 'hsl(48, 90%, 50%)' },
    { id: 'naranja',  etiqueta: 'Naranja' }
  ],
  acumulativa: true,           // opcional
  dependeDe: { tema: 'artes-marciales' }   // opcional
}
```

- `acumulativa`: filtrar por un valor incluye todos los anteriores en el orden de
  `valores`. Por si quieremos que un examen de cinturón naranja incluya el material de
  amarillo.
- `dependeDe`: la faceta solo se ofrece cuando las facetas indicadas tienen ese valor. Sirve
  para que «disciplina» no aparezca si estás filtrando teoría del entrenamiento.
- `color`: se aplica con `style` en línea, no con clases CSS, para que añadir un valor no
  obligue a tocar la hoja de estilos.

## Preset

Un examen que he hecho yo manualmente, con filtros fijos.

```js
{
  id: 'judo-naranja',
  titulo: 'Judo · Cinturón Naranja',
  descripcion: 'Programa completo hasta naranja',
  filtros: { disciplina: ['judo'], grado: ['naranja'] },
  grupo: 'artes-marciales',        // opcional, ver más abajo
  n: 25,
  duracion: '30'
}
```

Los valores de `filtros` son siempre arrays. Un array vacío o una faceta ausente significan
«cualquiera».

### Preset cerrado

Cuando la composición forma parte del examen —por ejemplo, un simulacro oficial—,
`ids` enumera exactamente sus preguntas. `barajarPreguntas: false` conserva ese orden;
`barajarOpciones: false` conserva también el orden de las respuestas.

```js
{
  id: 'simulacro-1',
  titulo: 'Simulacro 1',
  ids: ['istqb-e01-q01', 'istqb-e01-q02', 'istqb-e01-q03'],
  barajarPreguntas: false,
  barajarOpciones: false,
  duracion: '60'
}
```

Los IDs deben existir, no pueden repetirse y `n`, si se declara, no puede superar
la lista. Sin `barajarPreguntas: false`, el motor conserva la composición pero
baraja las preguntas en cada intento.

## Grupos de exámenes

Cuando hay muchos presets, una rejilla plana deja de servir para encontrarlos. Un tema
puede declarar grupos y repartir sus exámenes entre ellos:

```js
window.TEMA = {
  grupos: [
    { id: 'artes-marciales', etiqueta: 'Artes marciales', descripcion: 'Por disciplina' },
    { id: 'entrenamiento',   etiqueta: 'Entrenamiento' }
  ],
  presets: [ /* cada uno con su `grupo` */ ]
}
```

El listado pinta entonces una sección por grupo, en el orden en que se declaran, y una fila
de pastillas para ver sólo uno. **Es opcional y compatible hacia atrás:** un tema que no
declare `grupos` se sigue pintando plano, que es lo razonable con cuatro exámenes.

Un preset sin `grupo`, o con uno que el tema no declara, no desaparece: cae en una sección
final «Otros». El validador avisa del primer caso y da error en el segundo, porque apuntar a
un grupo inexistente casi siempre es una errata.
