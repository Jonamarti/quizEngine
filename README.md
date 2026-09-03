# quizEngine

Motor de exámenes tipo test agnóstico del tema. No sabe nada de la materia que
pregunta: todo lo específico llega desde fuera, en una carpeta de tema.

Vanilla JS sobre un único espacio de nombres global (`window.QZ`). Sin framework, sin
bundler y sin dependencias en tiempo de ejecución. El sitio que produce se abre con
doble clic, sin servidor.

## Cómo se usa desde un repo de datos

El motor se consume como dependencia, no se copia:

```bash
npm install github:Jonamarti/quizEngine#v1.0.0
```

Eso deja tres comandos disponibles:

```bash
npx quiz-validar   --tema tema --cobertura disciplina,bloque   # contrato + informe de huecos
npx quiz-construir --tema tema --salida web                    # motor + tema = sitio estático
npx quiz-humo      web                                         # prueba de humo del sitio
```

`quiz-humo` necesita Playwright, que es dependencia de desarrollo del motor y por tanto
no viaja con la instalación: el repo que lo use debe declarar `playwright` por su cuenta.

## El contrato

Un tema es una carpeta con dos ingredientes:

```
tema/
  config.js       define window.TEMA
  banco/*.js      empujan preguntas a window.PREGUNTAS
```

Los datos entran como `<script src>` y no por `fetch` porque `file://` bloquea las
peticiones, y el objetivo es que el examen funcione con doble clic. El mismo patrón de
auto-registro hace que los ficheros sirvan también para `require()` desde Node, que es
como los leen el validador y los tests.

`ESQUEMA.md` tiene el contrato completo: forma de una pregunta, de una faceta y de un
preset, y las reglas que impone el validador. `pruebas/tema-ejemplo/` es ese contrato
funcionando, y sirve a la vez de fixture de los tests y de demo.

## Desarrollo

```bash
npm ci
npm test                       # 71 pruebas de unidad, sin navegador
npx playwright install chromium
npm run test:e2e               # construye el tema de ejemplo y le pasa la prueba de humo
npm run demo                   # sólo construir la demo, en salida-pruebas/
```

Los tests de unidad cargan los módulos del motor en un global falso (`pruebas/cargar.js`),
así que se prueban `banco.js` y `examen.js` tal cual los ejecuta el navegador, sin
duplicar la lógica. `validar.js` y `construir.js` se prueban como los CLI que son:
lanzándolos y mirando el código de salida.

## Publicar una versión

Los repos de datos apuntan a un tag, así que una versión nueva es un tag nuevo:

```bash
npm version minor -m "v%s"     # actualiza package.json y crea el tag
git push quizEngine master --follow-tags
```

El workflow de release vuelve a pasar los tests, empaqueta con `npm pack` y adjunta el
`.tgz` a la Release de GitHub. Para adoptarla, el repo de datos cambia la referencia del
tag en su `package.json` y vuelve a instalar.

## Estructura

```
web/            el motor: index.html es una plantilla con el marcador DATOS_DEL_TEMA
  js/           módulos que se cuelgan de window.QZ, en orden de carga
  css/
scripts/
  validar.js    valida un tema contra ESQUEMA.md y saca cobertura cruzada
  construir.js  une motor + tema y escribe el sitio
pruebas/
  cargar.js     carga los módulos del motor desde Node
  humo.js       prueba de humo end-to-end con Playwright
  unidad/       node:test, sin dependencias
  tema-ejemplo/ fixture y demo
```

## Licencia

MIT.
