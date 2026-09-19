# quizEngine

Motor de exámenes tipo test agnóstico del tema. No sabe nada de la materia que
pregunta: todo lo específico llega desde fuera, en una carpeta de tema.

Vanilla JS sobre un único espacio de nombres global (`window.QZ`). Sin framework, sin
bundler y sin dependencias en tiempo de ejecución. El sitio que produce se abre con
doble clic, sin servidor.

## Cómo se usa desde un repo de datos

El motor se consume como dependencia, no se copia:

```bash
npm install github:Jonamarti/quizEngine#v1.4.0
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

## Documentación técnica

`docs/` contiene la referencia del motor, escrita para quien lo modifica:

| Documento | Contenido |
| --- | --- |
| [Arquitectura](docs/arquitectura.md) | Módulos, orden de carga, flujos y decisiones de diseño. |
| [Datos y persistencia](docs/datos-y-persistencia.md) | Cómo consume el motor el contrato y qué guarda en `localStorage`. |
| [Desarrollo](docs/desarrollo.md) | Preparación, comandos, los tres CLI, CI, publicación y contenido del paquete. |
| [Pruebas](docs/pruebas.md) | Qué cubre cada capa de pruebas y qué no. |
| [Deuda técnica](docs/deuda-tecnica.md) | Registro de hallazgos y cierres de la 1.3.0. |

Para trabajar sobre el motor:

```bash
npm ci
npm test                       # pruebas de unidad, sin navegador
npx playwright install chromium
npm run test:e2e               # construye el tema de ejemplo y le pasa la prueba de humo
npm run benchmark              # referencia con un banco sintético de 10.000 preguntas
```

Los demás scripts, la integración continua, cómo publicar una versión y la
estructura del repositorio están en [docs/desarrollo.md](docs/desarrollo.md).

## Licencia

MIT.
