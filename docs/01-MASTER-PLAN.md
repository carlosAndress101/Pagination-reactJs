# MASTER PLAN v2 — ORCHESTRATOR

Base: `docs/architecture-analysis.md` (T-01). Rama: `feat/modernize-pagination`.
Fase: **IMPLEMENTATION**. Checkout compartido — solo el ENGINEER escribe en `src/`.

## A. Decisiones cerradas sobre las 9 escaladas del Architect

| # | Decisión | Veredicto | Motivo |
|---|---|---|---|
| 1 | **Paginación cliente vs servidor** | **CLIENTE** — decidido por el usuario | Dataset fijo de 200 ítems. Coincide con la regla del usuario de no meter TanStack Query sin server state real, y con DEC-04/05 (tests deterministas). El seam `useTodos` mantiene la forma `{data,loading,error,retry}`: migrar a servidor después es reescribir un archivo. |
| 2 | **TypeScript** | **5.9.3**, no 7.0.2 | TS 7 expone solo `tsc`, **sin `tsserver`** → sin language service en el editor. API marcada `unstable/*`. El coste de trabajar a ciegas en el IDE no lo compensa el rendimiento del compilador nativo. |
| 3 | **React 19.3.0** | **ADOPT** | Riesgo bajo, cumple "React actual/estable". |
| 4 | **Vite 8.3.0 + `@vitejs/plugin-react` 6.1.1** | **ADOPT** | Elimina `@vitejs/plugin-react-swc` y con él `@swc/core` y su postinstall. Vite 8 usa rolldown, no esbuild. |
| 5 | **Tailwind CSS 4** | **REJECT** — confirmado por el usuario | El design-spec ya define los tokens como custom properties CSS puras: el design system existe sin Tailwind. 4 paquetes + binario nativo para 6 componentes en una pantalla no se amortiza. **Trigger de revisión: ≥3 pantallas o ≥20 componentes.** |
| 6 | **oxlint 1.82.0** | **ADOPT** | Cubre DEC-02 con evidencia: 36 reglas `jsx-a11y` (incluida `click-events-have-key-events`, que habría cazado D3), `eqeqeq` (D6), `no-unused-vars` (D13), `no-array-index-key` (D4), `rules-of-hooks`, `exhaustive-deps`. |
| 6b | **oxfmt 0.67.0** | **REJECT** → **Prettier 3.9.6** | Versión 0.x con publicaciones semanales. Un formatter que cambia su salida entre versiones genera diffs ruidosos y rompe `--check` en CI. Trigger de revisión: oxfmt 1.0. |
| 7 | **`@playwright/test` + Chromium (~150 MB)** | **ADOPT, acotado** | Único modo de verificar B5/C1/contraste con layout real; jsdom no calcula layout. Restricciones: solo devDependency, **solo Chromium**, y `pnpm build`/`pnpm test` **no pueden depender de él** — si Playwright falta, esos dos siguen funcionando. |
| 8 | **DEC-03** | **ACTUALIZADA** | Con `plugin-react` y Vite 8, las entradas `@swc/core` y `esbuild` quedan muertas. Se eliminan en T-05. Se conserva `allowBuilds` como allowlist explícita para futuros paquetes con script. La intención de DEC-03 se mantiene; su ejecución cambia. |
| 9 | **`[AJUSTABLE]` del design-spec** | **SE MANTIENEN** | Tamaños 10/20/50/100 con default 10, y sin salto rápido en ≥480px. Decisión razonada y documentada por el Designer. |

**Acoplamiento consciente** (señalado por el Architect y decidido a propósito): elegir TS 5.9.3 reabre la opción
ESLint 9 + typescript-eslint con linting *type-aware*, que oxlint no ofrece. Se elige oxlint igualmente: cubre
DEC-02 por completo, es preferencia declarada del usuario, y en una app sin cadenas de promesas la pérdida de
reglas type-aware (`no-floating-promises`, `no-misused-promises`) es asumible. **No es un descuido: es una renuncia.**

## A.1 Decisiones del GATE 1

- **DEC-07 — A3, al cambiar el tamaño de página se conserva el primer elemento visible (*anclaje*).**
  `nuevaPagina = floor(((paginaActual - 1) * tamañoAnterior) / tamañoNuevo) + 1`.
  Descartadas las dos opciones que planteó el Engineer: *recortar a la última página válida* deja al usuario en
  un sitio arbitrario (en la página 2 con tamaño 5 mira los ítems 6–10; al pasar a tamaño 50, recortar lo manda
  a los ítems 51–100), y *volver a la página 1* pierde siempre la posición. El anclaje mantiene a la vista el
  ítem que el usuario estaba mirando, que es lo que pide de verdad quien cambia el tamaño de página.
  Cuesta lo mismo: una línea de aritmética, sin estado nuevo.
  **Efecto secundario útil:** el resultado es siempre una página válida por construcción (`primerÍndice < total`),
  así que A3 se cumple sin depender del recorte. `clampPage` se mantiene, pero para lo que de verdad lo necesita:
  sanear `page` que llega de la URL (A6).
- **DEC-08 — Criterio de aceptación de tamaño de bundle** (de T-01b): **JS ≤ 72 kB gzip** y **≤ 235 kB sin comprimir**,
  con aviso a 70 kB. Hoy: 68.5 kB / 221.5 kB. Justificación medida por el Architect con una matriz 2×2
  (Vite 4/8 × React 18/19): el +54 % es **98.5 % `react-dom`**; Vite 8 con rolldown **reduce** 1.5 kB, y el código
  de la app no crece. No es un fallo de configuración ni de tree-shaking, es el suelo de React 19 (~66.9 kB gzip
  para cualquier app). Se acepta el coste: revertir a React 18 recuperaría ~22.6 kB pero desharía una decisión
  ya tomada, y cambiar de framework está fuera de scope.
- **DEC-09 — T-12 (Playwright) va DESPUÉS de T-11**, no antes. Los specs de e2e afirman sobre roles, selectores y
  el modo compacto que crean T-10 y T-11; escribirlos antes sería escribirlos a ciegas contra una UI inexistente.
  Coincide con el paso 8 del orden del Architect. La ventana de paralelizarlo con la ola 1 ya pasó.

## A.2 Decisiones posteriores a T-10

- **DEC-10 — DEC-08 se expresa en BYTES y se comprueba por script, no a ojo.**
  El aviso de T-10 ("71.33 kB gzip, rozando el límite de 72") fue una **falsa alarma por unidades**: se comparaba
  el número que imprime Vite contra un umbral definido de otra forma. DEC-08 fija la línea base en **68 486 B**
  medidos con `zlib` nivel 9 por script propio; Vite comprime con otro nivel y además reporta en kB **decimales**,
  no KiB. Medido como el criterio manda, el bundle de T-10 son **70 392 B**, no 71 330.
  Dos números que no se pueden comparar produjeron una alarma sin causa — y por la misma razón podrían haber
  producido un aprobado sin causa.
  **Umbrales redefinidos en bytes, sin ambigüedad:** aviso **72 000 B**, límite duro **75 000 B**.
  Estado tras T-10: **70 392 B — por debajo del aviso.** No se sube el techo: no hacía falta.
  Crecimiento real de T-05 a T-10: **+1 906 B** para pasar de 1 componente a 8 más `lib/` y `hooks/`. Proporcionado.
  **La comprobación se automatiza**: T-12 añade el chequeo de tamaño a `pnpm verify`, midiendo con `zlib` nivel 9
  y fallando por bytes. Un criterio que se verifica leyendo la salida de otra herramienta no es un criterio.
- **DEC-11 — Dos conflictos del design-spec se resuelven ANTES de la auditoría, no en ella.** Se abre **T-02c**
  (DESIGNER, en paralelo a T-11): (a) el foco tras deshabilitarse el control pulsado, que el razonamiento de §6
  no cubría, y (b) el mensaje de error duplicado en pantalla por el choque entre §4 y §6. Ambos son contrato del
  Designer. Descubrirlos en T-14 significaría rehacer trabajo ya auditado.

- **DEC-12 — El presupuesto de bundle mide JS y CSS por separado, nunca sumados.** El Engineer detectó que DEC-10
  fijaba *cómo* medir (`zlib` nivel 9, en bytes) pero no *qué*. Al revisarlo: el informe T-01b del Architect ya
  proponía **tres presupuestos independientes** y yo perdí la fila del CSS al redactar DEC-08. Se restituye.
  Sumar JS y CSS daría 72 321 B y dispararía un aviso hoy mismo sobre una página legítima, además de **ocultar
  cuál de los dos creció**, que es justo lo que un presupuesto tiene que señalar.

  | Métrica | Hoy (T-11) | Aviso | Límite duro |
  |---|---|---|---|
  | JS gzip(9) | **70 397 B** ✅ | 72 000 B | 75 000 B |
  | JS sin comprimir | **227 302 B** ✅ | — | 235 000 B |
  | CSS gzip(9) | **1 900 B** ✅ | — | 4 000 B |

  T-12 implementa las tres comprobaciones por separado en `pnpm verify`, fallando por bytes y nombrando cuál se pasó.
- **DEC-13 — D18 registrado: `index.html` declaraba `lang="en"` con la interfaz en español.** Hallazgo del Engineer
  fuera de la lista de defectos, corregido en T-11. Incumple WCAG 3.1.1: un lector de pantalla lee contenido español
  con fonética inglesa. Se registra como **D18** para que la auditoría lo cubra, con tarea T-11 y estado cerrado.
  No estaba en el inventario original porque los 17 defectos salieron de leer `src/`, y este vivía en `index.html`.
- **DEC-14 — `flex-wrap` en la barra a 480–539px: aceptado y RATIFICADO por el DESIGNER en T-14.** Con 11 controles
  (7 slots + 4 extremos) no caben en una fila por debajo de 540px. Envolver mantiene C1 sin tocar el algoritmo de
  la ventana, que el spec dice explícitamente que no debe cambiar con el viewport.

  **Corregido tras la auditoría (hallazgo H6).** La redacción original decía «520 px necesarios» y «480–767px».
  Ambas cifras eran estimaciones aritméticas mías (11×40 + 10×8) y ambas eran falsas. Medido en navegador real por
  el Designer: el ancho necesario es **507 px** y el rango donde la barra envuelve de verdad es **480–539px** — a
  partir de 540px cabe en una fila. Cuarto caso en este proyecto de una cifra estimada que no resistió una medición;
  ver DEC-04. La solución era correcta, el alcance declarado no.

## A.3 GATE 2 — cierre de la implementación (verificado por el ORCHESTRATOR)

`pnpm verify` ejecutado por el Orchestrator: **exit 0**. 122 tests unitarios, 145 de navegador, 15 saltados con motivo.
Presupuesto: JS 70 415 B, CSS 1 909 B, ambos dentro. 25 commits en la rama. Árbol limpio.
Dependencias de producción: **`react` y `react-dom`, las mismas dos que al empezar.**

**Nota de método:** mis greps de `any` y de marcadores `TODO` dieron falsos positivos (`overflow-wrap: anywhere`,
la constante `TODOS_URL`, la palabra "METODO" sin tilde). Las afirmaciones del Engineer eran correctas y mi
verificación no. Tercer caso en este proyecto de una medición que parecía decir algo y no lo decía.

### Huecos de automatización declarados (entran en T-15 si la auditoría los confirma)
- **B4** — ninguna herramienta comprueba que un lector de pantalla *pronuncie* el anuncio. Procedimiento manual
  con VoiceOver, definido por el Architect en §7.2.
- **Dedupe de StrictMode** — no verificable contra el build de producción. Cubierto por `useTodos.test.tsx` en
  desarrollo y por la medición manual de T-09 (2 peticiones antes, 1 después).
- **D18** — no hay test del atributo `lang`. Es una línea en `e2e/layout.spec.ts`; **se añade en T-15**, agrupado
  con lo que salga de la auditoría, en vez de reabrir la implementación por un solo cambio.
- **D4 técnico (dependencias justificadas) y E1 (sin dead code)** — juicio, no comando.

## B.0 Matriz de cobertura D1–D17 → tarea

Añadida tras T-06, al detectar que **D4, D10 y D14 no estaban asignados a ninguna tarea**. Un defecto sin dueño
no se implementa y no se puede auditar. Esta matriz es la referencia para T-14.

| Defecto | Tarea | Nota |
|---|---|---|
| D1 ventana derivada desincronizada | T-10 | |
| D2 `…` no salta de bloque | T-10 | El `…` pasa a `<span aria-hidden>` no interactivo (design-spec §3) |
| D3 `<li onClick>` inaccesible | T-10 | Genera 6 de los 7 errores de oxlint vivos tras T-06 |
| **D4 `key={index}`** | **T-06** | **Asignado tras el reporte del Engineer.** Una línea, sin efecto observable |
| D5 fetch sin loading/error/abort | T-09 | |
| D6 `==` y ternarios | T-06 **y** T-10 | **Partido:** el operador se corrige en T-06; el `disabled` derivado de `pages[0]` con datos vacíos **sigue vivo** y lo cierra T-10. Cambiar `==` por `===` no lo arregla: `1 === undefined` es `false` igual |
| D7 "Load More" engañoso | T-10 | Se sustituye por el selector de tamaño de página |
| D8 contraste latente | T-11 | |
| D9 restos de plantilla | T-11 | |
| **D10 ESLint EOL y sin a11y** | **T-05** | **Registrado retroactivamente.** Cerrado: ESLint fuera del árbol, oxlint con 36 reglas `jsx-a11y` |
| D11 `outline:none` sin reemplazo | T-11 | El `:focus-visible` global vive en `index.css` (design-spec §2.4) |
| D12 blancos hardcodeados | T-11 | |
| D13 estado muerto | T-06 | ✅ cerrado |
| **D14 página leída del DOM** | **T-10** | **Asignado explícitamente.** `onClick={() => goTo(n)}`; desaparecen los `id` numéricos globales |
| D15 page size sin clamp | T-10 | Requiere test de regresión propio (T-10) |
| D16 desbordamiento móvil | T-11 | Verificado en T-12 con `verify:runtime` |
| D17 modo claro inexistente | T-11 | |
| **D18 `lang="en"` con UI en español** | **T-11** | **Añadido tras T-11** (DEC-13). WCAG 3.1.1. Vivía en `index.html`, fuera del `src/` que produjo el inventario original |

## B. Tareas

Estados: `BLOCKED` `READY` `IN_PROGRESS` `REVIEW` `FAILED` `NEEDS_REMEDIATION` `COMPLETE`

| ID | Objetivo | Owner | Deps | Estado |
|---|---|---|---|---|
| T-05 | Toolchain y configs, sin tocar lógica | ENGINEER | — | READY |
| T-06 | Migración JS→TS strict, comportamiento idéntico | ENGINEER | T-05 | BLOCKED |
| T-07 | Lógica pura `lib/pagination.ts` + `lib/params.ts` + tests | ENGINEER | T-06 | BLOCKED |
| T-08 | Estado en URL (A5/A6) | ENGINEER | T-07 | BLOCKED |
| T-09 | Capa de datos: `api.ts` + `useTodos` (A4/D5) | ENGINEER | T-06 | BLOCKED |
| — | **GATE 1 — revisión del Orchestrator** | ORCHESTRATOR | T-05..T-09 | BLOCKED |
| T-10 | Reescritura de la UI accesible (D1/D2/D3/D7/D11/D14/D15 + `disabled` de D6, B1–B4) | ENGINEER | GATE 1 | BLOCKED |
| T-11 | Estilos y theming (D8/D9/D12/D16/D17, C1) | ENGINEER | T-10 | BLOCKED |
| T-12 | Andamiaje `verify:runtime` con Playwright (DEC-05) | ENGINEER | T-11 (DEC-09) | BLOCKED |
| T-13 | Cierre: `pnpm verify` en verde + evidencia | ENGINEER | T-10..T-12 | COMPLETE |
| T-14 | **AUDIT MODE** — verificación independiente | DESIGNER | T-13 | READY |
| T-15 | Remediación de hallazgos P0/P1 | ENGINEER | T-14 | BLOCKED |
| T-16 | Validación final y veredicto | ORCHESTRATOR | T-15 | BLOCKED |

### Detalle de las tareas de la ola 1

**T-05 — Toolchain**
- Resultado esperado: `package.json` con scripts `dev/build/lint/format/typecheck/test/verify:runtime/verify`; `tsconfig.json` (strict + `noUncheckedIndexedAccess`, `noEmit`, `moduleResolution: bundler`) y `tsconfig.node.json`; `vite.config.ts`; `.oxlintrc.json`; `.prettierrc.json` + `.prettierignore`; `pnpm-workspace.yaml` actualizado. Los `.jsx` siguen siendo `.jsx` en este paso.
- AC: `pnpm build` verde · `pnpm lint` ejecuta oxlint · `pnpm format --check` pasa · `.eslintrc.cjs` eliminado · `@vitejs/plugin-react-swc` y `@swc/core` fuera del árbol de dependencias.
- Validación: pegar salida de `pnpm build`, `pnpm lint`, `pnpm exec tsc --version`, y `pnpm why @swc/core` (debe no encontrarlo).

**T-06 — Migración a TS strict**
- Resultado esperado: `main.tsx`, `App.tsx`, `components/Pagination.tsx`, `types.ts`. Sin `any`. D13 (estado muerto), D6 (`==`, ternarios) y **D4 (`key={index}` → `key={todo.id}`)** corregidos. **Comportamiento idéntico** — los bugs D1/D2/D15 siguen vivos a propósito: se arreglan en T-10, no aquí.
- AC **(corregido tras el reporte del Engineer)**: `pnpm typecheck` verde · `pnpm build` verde · cero `any` · cero `.jsx` en `src/` · `pnpm lint` **sin más errores que los de D3**, que cierra T-10.
  > El AC original decía "`pnpm lint` sin errores" y era **imposible de cumplir sin invadir T-10**: D3 genera 6 errores de `jsx-a11y` y arreglarlo exige convertir los `<li onClick>` en `<button>` con teclado — un cambio de comportamiento observable que contradice la condición de equivalencia de esta misma tarea. Error de redacción mío, no desviación del Engineer.
- Validación: pegar las tres salidas + `grep -rn ": any\|as any" src/` vacío.

**T-07 — Lógica pura + tests**
- Resultado esperado: `lib/pagination.ts` (`getPageRange`, `clampPage`, `getTotalPages`) implementando el algoritmo del design-spec §3, y `lib/params.ts` (`parseParams`/`serializeParams`). Ambos puros, sin React.
- AC: los **6 ejemplos literales** del design-spec §3 como tests (`total=1,c=1`; `3,2`; `7,4`; `20,1`; `20,10`; `20,20`) · tests de propiedades: la página actual siempre presente, nunca un `…` ocultando una sola página, nunca >7 slots · tests A6: `page=0`, `page=999`, `page=abc`, `pageSize=7`, `page>totalPages`.
- Validación: `pnpm test` verde con el recuento de tests pegado.

**T-08 — Estado en URL** · AC: `page`/`pageSize` en la URL, back/forward funcional, saneado A6 sin romper la UI, sin bucles de historial. Validación: tests de `params` + comprobación manual descrita.

**T-09 — Capa de datos** · AC: `AbortController`, estados `loading`/`error`/`retry`, **una sola llamada en dev pese a StrictMode**. Validación: test que cuenta llamadas al mock.

## C. Reglas de la fase

0. **`pnpm` en todo comando, nunca `npm` ni `npx`.** Sin excepciones, incluidas consultas de solo lectura (`pnpm view`, `pnpm dlx`, `pnpm exec`). Cualquier comando `npm` que aparezca en un doc de este repo está desactualizado.
1. **Un commit por tarea**, Conventional Commits, con el ID de tarea en el asunto. Sin `git push`, sin tags.
2. **Evidencia ejecutada y pegada** en cada entrega. "Funciona" sin salida de comando no se acepta.
3. **Parada obligatoria en GATE 1.** No empezar T-10 sin mi revisión: es donde cambia el comportamiento visible.
4. Si algo del plan choca con la realidad del código, **parar y reportar**, no improvisar una solución distinta.
5. T-12 puede escribirse en paralelo a T-07..T-09 si conviene, pero **nunca** a la vez que T-10/T-11 (mismo checkout).

---

## A.4 Disposición de la auditoría T-14 (decisión del ORCHESTRATOR)

Veredicto del Designer en Audit Mode: **READY_WITH_CONDITIONS**, 0 P0, 0 P1, 6 hallazgos (H1–H6).

Antes de aceptarlo verifiqué yo mismo los cuatro hallazgos comprobables sin navegador. Los cuatro son ciertos:
`playwright.config.ts` declara `320/375/414/768/1280` y ningún spec de `e2e/` sobrescribe el viewport (H2);
`scripts/screenshots.mjs:19` define 20 títulos inventados (H3); DEC-14 decía 520 px y 480–767px (H6); y no existe
ningún test del atributo `lang` en todo el árbol.

**Un hallazgo que la auditoría no hizo.** El informe marca D18 como CORREGIDO citando `index.html:2`. El atributo
está, pero no hay ninguna prueba que lo proteja: D18 es el único de los 18 defectos cerrado sin test de regresión, y
la auditoría verificó la corrección sin verificar su blindaje. No invalida el veredicto —el defecto está corregido—
pero es el tipo de hueco que un auditor debía haber marcado, y lo registro aquí para que conste que salió de la
revisión del veredicto y no del informe.

| # | Sev. | Decisión | Dueño |
|---|---|---|---|
| H1 | — | Confirma T-02c con evidencia propia. Nada que hacer. | — |
| H2 | P2 | **A T-15.** Se cierra el hueco con cobertura real en 480–539px. DEC-04 exige medir; el rango se estimó dos veces sin medirse. | ENGINEER |
| H3 | P2 | **A T-15.** Regenerar con una respuesta real y fija de JSONPlaceholder. Rotular las capturas como «ilustrativas» se rechaza: el objetivo del producto es parecer real, y una nota al pie no arregla una portada que enseña algo que la app nunca muestra. | ENGINEER |
| H4 | P2 | **No remediable por ningún agente.** Se eleva al usuario como verificación humana. B4 queda como «correcto a nivel de árbol de accesibilidad, pendiente de confirmación audible». | USUARIO |
| H5 | P3 | **No se remedia.** Riesgo dependiente de plataforma, no reproducido en dos métodos ni en dos modos de navegador. Tocar un control que funciona por un comportamiento que nadie ha observado aquí es exactamente el cambio que introduce el defecto siguiente. Se documenta como riesgo conocido y se cierra. | ORCHESTRATOR |
| H6 | P3 | **Corregido ya**, en DEC-14 arriba. Documento mío, error mío. | ORCHESTRATOR |
| D18 | — | **A T-15**, como estaba comprometido: test del atributo `lang`. | ENGINEER |

**Riesgo aceptado (H5).** El `<select>` de salto directo podría disparar un `change` por pulsación de flecha en
Chrome sobre Windows/Linux con el desplegable cerrado. No se reprodujo en macOS/Chromium en headless ni con ventana
real. Se acepta conscientemente: afecta a una ruta alternativa (el salto directo existe solo en modo compacto, donde
la navegación principal sigue siendo por botones), el impacto sería navegación de más, no pérdida de datos ni de
acceso, y la corrección a ciegas —diferir el `change`, o sustituir el `<select>` nativo— cambiaría un control
accesible y probado por uno sin probar. Si alguien reproduce el fallo en Windows o Linux, se reabre.
