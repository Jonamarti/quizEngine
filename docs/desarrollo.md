# Desarrollo

[Índice](README.md).

Referencia operativa del repositorio del motor: preparar el entorno, ejecutar los
comandos, entender qué hace la integración continua y qué contiene realmente el
paquete publicado. Para consumir el motor desde un repositorio de datos basta el
[README principal](../README.md).

## Preparación

`package.json` declara `engines.node >= 20`; CI ejecuta las pruebas de unidad
sobre Node 20 y 22.

```bash
npm ci                          # instala Playwright, única dependencia declarada
npx playwright install chromium # solo necesario para la prueba de humo
```

El motor no tiene dependencias de ejecución: `web/` es JavaScript clásico que el
navegador carga tal cual. Playwright es dependencia **de desarrollo** y no viaja
con la instalación del paquete, de modo que un repositorio de datos que quiera
ejecutar `quiz-humo` debe declararla por su cuenta.

## Comandos

| Script | Efecto |
| --- | --- |
| `npm test` | Pruebas de unidad con `node --test`, sin navegador. |
| `npm run validar` | Valida un tema contra el contrato; admite los flags de `validar.js`. |
| `npm run construir` | Une motor y tema en un sitio estático. |
| `npm run demo` | Construye el tema de ejemplo en `salida-pruebas/`, con destino explícito. |
| `npm run humo` | Prueba de humo sobre un sitio **ya construido**. |
| `npm run test:e2e` | `demo` y a continuación la prueba de humo sobre su salida. |

La diferencia entre `demo` y `test:e2e` importa: el primero solo construye, el
segundo construye y además recorre el sitio con Chromium. `npm run humo` por sí
solo no construye nada y opera sobre lo que encuentre en la carpeta indicada.

## Los tres ejecutables

`package.json` publica tres binarios, que son los mismos scripts del repositorio:

```bash
npx quiz-validar   --tema tema --cobertura disciplina,bloque
npx quiz-construir --tema tema --salida web
npx quiz-humo      web
```

- `quiz-validar` ([scripts/validar.js](../scripts/validar.js)) carga el tema con
  `require()`, asocia cada pregunta con su fichero de procedencia y separa errores
  de avisos. Sale con código 1 si hay errores, para encadenarlo en CI. `--cobertura`
  recibe dos identificadores de faceta separados por coma y produce una tabla
  cruzada que señala los huecos del banco.
- `quiz-construir` ([scripts/construir.js](../scripts/construir.js)) copia `web/`,
  copia el tema a `tema/`, copia `medios/` de forma recursiva y sustituye el
  marcador `<!-- DATOS_DEL_TEMA -->` por una etiqueta `script` por fichero, en
  orden alfabético. **No ejecuta el validador**: comprobar que existen `config.js`
  y algún `.js` en `banco/` no dice nada sobre la validez de los datos.
- `quiz-humo` ([pruebas/humo.js](../pruebas/humo.js)) abre el sitio construido con
  `file://` y recorre listado, generador, examen, persistencia y resultados. Su
  alcance real y sus supuestos están descritos en [pruebas](pruebas.md).

### Destino de construcción

Ambos CLI validan flags y valores. `construir.js` exige una carpeta de salida que
no solape el tema ni la plantilla del motor, comprueba las entradas y monta el
resultado en una carpeta temporal antes de sustituir el destino. Sigue siendo
preferible pasar `--salida` explícitamente, como hace `npm run demo`.

## Integración continua

[.github/workflows/ci.yml](../.github/workflows/ci.yml) se dispara en `push` a
`master`, en cada *pull request* y a mano, con tres trabajos:

| Trabajo | Contenido |
| --- | --- |
| `unidad` | `npm ci` y `npm test` sobre una matriz de Node 20 y 22, sin `fail-fast`. |
| `humo` | `npx playwright install --with-deps chromium` y `npm run test:e2e` en Node 22. |
| `demo` | `npm run demo` y subida de `salida-pruebas/` como artefacto `demo-tema-ejemplo`. |

El artefacto de `demo` permite descargar la demo construida desde la pestaña de
la ejecución, sin clonar el repositorio.

[.github/workflows/release.yml](../.github/workflows/release.yml) se dispara al
empujar un tag `v*`: repite las comprobaciones, empaqueta con `npm pack` y adjunta
el `.tgz` a la Release de GitHub, de modo que quede constancia de qué contenía
exactamente cada versión.

## Publicar una versión

Los repositorios de datos apuntan a un tag, así que una versión nueva es un tag
nuevo:

```bash
npm version minor -m "v%s"     # actualiza package.json y crea el tag
git push quizEngine master --follow-tags
```

Para adoptarla, el repositorio de datos cambia la referencia del tag en su
`package.json` y vuelve a instalar. Antes de etiquetar, comprueba que manifiesto,
lockfile y ejemplos mantienen la misma versión y ejecuta
`npm pack --dry-run --json`.

## Qué contiene el paquete

La lista `files` de `package.json` limita lo que se publica a `web`, `scripts`,
`docs`, `pruebas/humo.js` y `ESQUEMA.md`; npm añade además `package.json`, `README.md` y
`LICENSE`, que incluye siempre. En consecuencia, **no** viajan con la
instalación:

- Las pruebas de unidad, `pruebas/cargar.js` y el tema de ejemplo, que son
  material del repositorio del motor y no del consumidor.
- Playwright, por ser dependencia de desarrollo, pese a que `quiz-humo` la
  necesita en tiempo de ejecución.

`npm pack --dry-run` enumera el contenido exacto sin publicar nada.

## Estructura del repositorio

```
web/            el motor: index.html es una plantilla con el marcador DATOS_DEL_TEMA
  js/           módulos que se cuelgan de window.QZ, en orden de carga
  css/
scripts/
  validar.js    valida un tema contra ESQUEMA.md y saca cobertura cruzada
  construir.js  une motor + tema y escribe el sitio
pruebas/
  cargar.js     carga los módulos del motor desde Node, sobre un global falso
  humo.js       prueba de humo end-to-end con Playwright
  unidad/       node:test, sin dependencias
  tema-ejemplo/ fixture de las pruebas y demo a la vez
docs/           esta documentación
```

El reparto de responsabilidades entre los módulos de `web/js/` y su orden de carga
están en [arquitectura](arquitectura.md).
