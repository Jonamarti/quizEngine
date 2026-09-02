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
  origen: 'generada'         // opcional: 'generada' | 'autorada'
}
```

Reglas que impone el validador:

- `id` único en todo el banco.
- Entre 2 y 8 opciones, todas con `texto` y `explicacion` no vacíos,  **también las
  incorrectas**.
- El número de opciones con `correcta: true` debe ser exactamente `seleccionar`.
- Sin textos de opción repetidos dentro de una misma pregunta.
- Sin enunciados repetidos en todo el banco.
- Toda clave y todo valor de `facetas` deben estar declarados en `TEMA.facetas`.

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
  n: 25,
  duracion: '30'
}
```

Los valores de `filtros` son siempre arrays. Un array vacío o una faceta ausente significan
«cualquiera».
