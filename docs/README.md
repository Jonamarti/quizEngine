# Documentación técnica de quizEngine

Revisión del 19 de septiembre de 2026 sobre la versión `1.3.0` de
[package.json](../package.json), con base en el commit `5336241`. Describe el
código local y las comprobaciones realizadas; no acredita el estado de una
publicación remota.

| Documento | Contenido |
| --- | --- |
| [Arquitectura](arquitectura.md) | Componentes, orden de carga, flujos y decisiones de diseño. |
| [Datos y persistencia](datos-y-persistencia.md) | Contrato operativo, filtrado, corrección y almacenamiento local. |
| [Desarrollo](desarrollo.md) | Preparación, comandos, los tres CLI, CI, publicación y contenido del paquete. |
| [Pruebas](pruebas.md) | Qué cubre cada capa de pruebas, qué no cubre y qué límites tiene. |
| [Deuda técnica](deuda-tecnica.md) | Registro de los doce hallazgos de 1.2 y su cierre en 1.3. |

El [README principal](../README.md) introduce el proyecto y
[ESQUEMA.md](../ESQUEMA.md) contiene los ejemplos del contrato de temas. Esta
carpeta complementa esos documentos y señala sus discrepancias con la
implementación cuando las hay.

## Estado comprobado

- Aplicación estática en JavaScript, sin dependencias de ejecución, servidor ni
  bundler. El ensamblado del sitio se hace mediante un script de Node.
- Diez módulos de navegador bajo `window.QZ`, dos CLI de construcción/validación
  y una prueba de humo reutilizable con Playwright.
- Tema de ejemplo con 15 preguntas y todas las capacidades; tema mínimo sin
  presets, fuentes, grupos, imágenes ni reloj para comprobar la opcionalidad.
- Dos capas de pruebas: unidad sobre los módulos del motor y los CLI, sin
  navegador, y un recorrido de humo con Chromium sobre el sitio construido.
  Su alcance y sus huecos están en [pruebas](pruebas.md).

La pasada de cierre ejecutó 86 pruebas de Node y dos recorridos de humo en
Chromium. Persistencia tiene pruebas unitarias; reloj, modal, UI y coordinación
se verifican en el navegador. Los límites restantes están en [pruebas](pruebas.md).

## Mantenimiento de esta documentación

Al cambiar un módulo, revisar su responsabilidad en arquitectura; al cambiar
datos o almacenamiento, revisar el contrato y la compatibilidad del progreso;
al corregir un hallazgo, actualizar su estado y anotar la prueba que evita la
regresión. Los resultados de pruebas son una fotografía fechada, no una garantía
para cambios posteriores.
