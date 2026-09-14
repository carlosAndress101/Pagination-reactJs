# ORCHESTRATOR — Contexto compartido

Runtime: Nodeterm. Agentes: ORCHESTRATOR (PO + Tech Lead + Quality Gate), ARCHITECT, ENGINEER, PRODUCT DESIGNER / AUDITOR.
Rama de trabajo: `feat/modernize-pagination`. Un solo checkout compartido: **no cambies de rama**.

Fase actual: **TECHNICAL ANALYSIS** (T-01, T-02 en paralelo).

---

## 0. GOBERNANZA — reparto de responsabilidades (vigente desde 2026-09-13)

Flujo obligatorio:
`DISCOVERY (producto) → ORCHESTRATOR` · `TECHNICAL DISCOVERY → ARCHITECT` · `MASTER PLAN → ORCHESTRATOR (a partir del informe del Architect)` ·
`IMPLEMENTATION → ENGINEER` · `DESIGN → DESIGNER` · `AUDIT → DESIGNER en Audit Mode` · `FINAL DECISION → ORCHESTRATOR`

**El Orchestrator NO realiza investigación técnica.** No audita dependencias, arquitectura, data flow, routing ni deuda
técnica por su cuenta; solo lo necesario para entender el objetivo de producto. Coordina y decide, no sustituye al especialista.

**El Master Plan no puede redactarse antes del informe del Architect.** Se construye a partir de sus hallazgos.

> Nota de trazabilidad: el material técnico ya presente en §2, §2.1 y §2.2 se produjo antes de esta regla —
> parte por el Engineer (T-04) y parte por el Orchestrator excediendo su rol. **Entra al Architect como INPUT
> a validar, no como conclusión establecida.** El Architect puede confirmarlo, corregirlo o descartarlo con evidencia.

## 1. DISCOVERY — estado real del repositorio (verificado, 2026-09-13)

Árbol completo (sin node_modules):

```
index.html  vite.config.js  .eslintrc.cjs  package.json  pnpm-lock.yaml  README.md
public/vite.svg
src/main.jsx  src/App.jsx  src/App.css  src/index.css
src/style/style.css
src/components/Pagination.jsx
src/assets/react.svg
```

Stack real: React 18.2, Vite 4.3, @vitejs/plugin-react-swc 3, ESLint 8 (`.eslintrc.cjs`), pnpm lockfile.
`node_modules` **no está instalado** (0 entradas). Node local v26.8.1, npm 11.19.0.

**No existe**: TypeScript, tests, Tailwind, router, state manager, formatter, CI, scripts de `typecheck`/`test`/`format`.
`package.json` solo tiene `dev`, `build`, `lint`, `preview`.

Datos: `fetch("https://jsonplaceholder.typicode.com/todos")` → 200 ítems, en `useEffect`, sin loading/error/abort.
Toda la app son 111 líneas en `src/components/Pagination.jsx`.

## 2. Defectos confirmados en el código actual (evidencia)

| # | Ubicación | Problema |
|---|---|---|
| D1 | `Pagination.jsx:19-21,62-75` | La ventana de números vive en estado derivado (`maxNumberLimit`/`minPageNumberLimit`) y se desincroniza: "Load More" cambia `itemsPage` → cambia el total de páginas, pero la ventana no se recalcula. Saltar por número tampoco la ajusta. Resultado: rangos vacíos o fuera de límite. |
| D2 | `Pagination.jsx:79,84` | Los `…` no saltan de bloque: llaman a `haddleNext`/`haddlePrev`, es decir avanzan **una** página. |
| D3 | `Pagination.jsx:39-47` | Los números son `<li onClick>`: no focusables, sin rol, sin teclado, sin `aria-current`. Inaccesible. |
| D4 | `Pagination.jsx:8` | `key={index}` teniendo los ítems un `id` real. |
| D5 | `Pagination.jsx:53-57` | Fetch sin estado loading/error, sin `AbortController`; StrictMode dispara doble petición en dev. |
| D6 | `Pagination.jsx:97,103` | `==` en vez de `===`, ternarios redundantes (`? true : false`), y `disabled` mal definido cuando `pages` está vacío (carga inicial). |
| D7 | `Pagination.jsx:106` | "Load More" es engañoso: no carga más datos, aumenta el tamaño de página en +5. |
| D8 | `index.css:73-84` | **RECLASIFICADO a LATENTE — ver §2.2.** El par roto existe en la cascada pero NO es visible hoy. Diagnóstico original del Orchestrator erróneo. |
| D9 | `App.css`, `assets/react.svg`, `public/vite.svg`, `index.html:7` | Restos de plantilla Vite (`.logo`, `logo-spin`, `.read-the-docs`, título "Vite + React"). Dead code. |
| D10 | `package.json`, `.eslintrc.cjs` | ESLint 8 en formato legacy y EOL; sin typecheck/test/format. |

### Defectos adicionales (reportados por ENGINEER, verificados por ORCHESTRATOR 2026-09-13)

| # | Ubicación | Problema | Verificación |
|---|---|---|---|
| D11 | `style/style.css:40-42` | `.pageNumbers li button:focus { outline: none }` elimina el foco de Prev/Next —los dos únicos controles navegables por teclado— sin sustituirlo. WCAG 2.4.7. Independiente de D3 y D8. Bloquea B3. | CONFIRMADO (grep) |
| D12 | `style/style.css:8,20-22,29,36-37` | Blancos y negros hardcodeados sin considerar el esquema de color: bordes, píldora activa, color de botón y estado hover. En modo claro todo desaparece sobre fondo blanco. **D8 solo citaba `index.css`: arreglar únicamente ese archivo deja el bug vivo.** Ampliado por el Orchestrator para incluir `:36-37` (hover). | CONFIRMADO (grep) |
| D13 | `Pagination.jsx:19` | `pageNumberLimit` es estado muerto: `setPageNumberLimit` no se invoca nunca. Constante disfrazada de `useState`. | CONFIRMADO (grep: solo lecturas en 63,64,71,72,73) |
| D14 | `Pagination.jsx:23-24,41` | El número de página se lee del DOM vía `Number(event.target.id)`, con `id` numéricos globales por `<li>`. Contamina el espacio de ids del documento y falla si el click cae en un nodo hijo. Se resuelve con `onClick={() => goTo(n)}`. | CONFIRMADO (grep) |
| D15 | `Pagination.jsx:87-89` + `32-34` | Subir el tamaño de página no clampea `currentPage`. Con `itemsPage=5, currentPage=40`, un click en Load More da `slice(390,400)` sobre 200 ítems → `[]`: lista en blanco sin estado empty. D1 es la ventana de números; esto vacía **los datos**. Requiere test propio. | CONFIRMADO (traza aritmética) |
| D16 | `style/style.css:1-11` + `index.css:35-38` | `.pageNumbers` es `display:flex` sin `flex-wrap`; Prev + 5 números + 2 ellipsis + Next no caben en 320px → scroll horizontal. Incumple C1. | **PLAUSIBLE** — estimación ~370px por análisis estático. Pendiente de verificación visual real cuando la app arranque. No lo des por cerrado sin medirlo. |

Menores aceptados dentro de D9/D10, sin D# propio:
- `Pagination.jsx:1-2`: `useState` y `useEffect` en dos `import` separados.
- `index.css:26-33`: `body { display:flex; place-items:center }` — en flexbox `justify-items` se ignora; el centrado real lo hace `#root { margin: 0 auto }`. Resto de plantilla.
- `.eslintrc.cjs` **sin `eslint-plugin-jsx-a11y`** — amplía D10: la config no solo es EOL, es que no cubre la categoría de defectos que domina este backlog (D3, D11 pasaron el lint limpiamente). **La config de lint objetivo debe incluir reglas de a11y, sea cual sea la herramienta elegida.**

## 2.2 RECLASIFICACIONES tras T-04 BASELINE (evidencia medida en navegador, 2026-09-13)

El baseline del ENGINEER corrigió tres diagnósticos. Las conclusiones de medición sustituyen a las de análisis estático.

### D8 y D12 → **LATENTES, no activos**
El diagnóstico original del Orchestrator ("la app es ilegible en modo claro") era **incorrecto**.
Causa real: `index.css:32` fija `body { background-color: #242424 }` **fuera** de la media query, y el bloque
`@media (prefers-color-scheme: light)` solo redefine `:root`, nunca `body`. Como `body` es `display:flex; min-height:100vh`,
tapa el `#ffffff` del `html`. Medido en modo claro emulado: h1 y texto de lista dan **12.44:1** — cumplen de sobra.
En modo claro la app se ve exactamente igual de oscura que en modo oscuro; no hay un solo píxel blanco.

Siguen siendo obligatorios de arreglar, pero como **deuda latente**: en cuanto se normalice o elimine el fondo del
`body` —primer paso de cualquier rediseño— el fallo se activa. No busques el síntoma en pantalla: no se ve.

### D17 (NUEVO) — **el modo claro no existe**
`index.css:6,73-84` declara `color-scheme: light dark` y una media query de modo claro, pero el resultado neto es que
el tema claro **no llega a renderizarse nunca**. No es un fallo de contraste: es una funcionalidad rota que aparenta
estar implementada. Se arregla decidiendo una estrategia de theming, no cambiando valores — por eso no entra dentro de D8.
El `docs/design-spec.md` §2.1/§2.2 ya entrega paletas completas de ambos modos: **D17 queda cubierto por T-02**.

### D16 → **CONFIRMADO**, y el umbral real no es 320px
Medido con CDP sobre Chrome/153 headless contra el dev server:

| viewport | scrollWidth | clientWidth | overflow |
|---|---|---|---|
| 320px | **550px** | 320 | +230px |
| 375px | 550 | 375 | +175 |
| 414px | 550 | 414 | +136 |

`.pageNumbers` mide **486.4px** reales, no los ~370px que estimamos el Orchestrator y el Engineer por separado.
El error de ambos: Prev y Next no son cajas pequeñas — su `<button>` interno lleva `font-size:1.5rem` (`style.css:30`)
y arrastra los `<li>` a 126.6px y 129.5px. Solo Prev+Next son 256px de los 320 disponibles.
**Punto de ruptura real: ~518px.** La app desborda en todo móvil y en tablet vertical.
Lección de proceso: dos estimaciones independientes que coincidían estaban las dos mal. Medir, no estimar.

Hallazgos adjuntos de la misma medición:
- **B5 INCUMPLIDO en el código actual**: el objetivo táctil menor mide **29.1px** (el número "1"); mínimo exigido 44px.
- `h1` computa a **51.2px** (`3.2em`) y desborda por sí solo: su borde derecho cae en 381px con viewport de 320.

### D15 → **CONFIRMADO end to end, y más grave de lo redactado**
Secuencia real: carga → 39 clicks en Next → 1 click en "Load More". Resultado medido:
lista `<ul></ul>` literalmente vacía, y la barra queda en `Prev | … | Next` con **cero números de página**.
Tres agravantes que no estaban en la redacción original y entran en el alcance del fix:
1. No solo se vacía la lista: **desaparece también la ventana de números**. D15 y D1 se componen — el usuario pierde
   el contenido *y* el mecanismo para volver.
2. **Next sigue habilitado**: con `currentPage=40` y último elemento `20`, `40 == 20` es falso. El usuario puede
   alejarse indefinidamente sin que nada lo frene.
3. **Recuperarse cuesta 21 clicks a ciegas en Prev**; la pantalla no cambia hasta el click 21. En la práctica, el
   usuario recarga o abandona.

### D11 → confirmado en runtime
Con el foco en Next por teclado: `outlineStyle === "none"`, `boxShadow === "none"`.
Solo hay **3 elementos tabulables en toda la app** (Prev, Next, Load More); los 40 números son inalcanzables por
teclado (`tabIndex:-1`, `role:null`, `aria-current:null`). Sin `<nav>`, sin `<main>`, sin `[aria-live]`.

### Baseline de referencia para comparar al final
```
pnpm build  -> VERDE.  dist JS 143.93 kB / 46.35 kB gzip.  34 módulos.  225ms
pnpm lint   -> 1 error: 'setPageNumberLimit' no usado (= D13). Nada más.
runtime real: react 18.3.1, react-dom 18.3.1, vite 4.5.14, eslint 8.57.1 (deprecated)
```
**El linter detecta 1 de 17 defectos.** D3, D11, D14 pasan por falta de reglas de a11y; **D6 también pasa** porque
`eqeqeq` no está en `eslint:recommended`.

## 2.1 DECISIONES CERRADAS POR EL ORCHESTRATOR

- **DEC-01 (REVISADA) — Gestor de paquetes: pnpm.** Se mantiene la decisión, **pero el argumento original era falso**:
  pnpm 12.3.4 rechazó el lockfile versionado (`lockfileVersion 6.0` incompatible, `[WARN] Ignoring broken lockfile`)
  y lo re-resolvió entero desde `package.json` (+2029 −1177 líneas, ahora `9.0`). El churn era inevitable y ya ocurrió.
  pnpm se mantiene por estar instalado y ser el gestor de origen del proyecto, no por preservar el lockfile.

  **REGLA SIN EXCEPCIONES (reforzada por el usuario, "muy importante"): `pnpm` en TODO comando, nunca `npm` ni `npx`.**
  Incluye las consultas de solo lectura: `pnpm view <pkg> version` (no `npm view`), `pnpm why`, `pnpm dlx` (no `npx`),
  `pnpm exec`. La incumplieron por separado el ORCHESTRATOR (al verificar la matriz de versiones) y el ARCHITECT
  (en toda la §1 de su informe). Los datos obtenidos siguen siendo válidos —`view` no altera el árbol de
  dependencias ni el lockfile— pero **ningún comando nuevo puede usar `npm`**. Si un brief o un doc de este
  repositorio muestra un comando `npm`, está desactualizado: tradúcelo antes de ejecutarlo.
- **DEC-02 (AMPLIADA) — Cobertura de lint: a11y **y** corrección estricta, obligatorias.** Cualquier stack de lint
  propuesto debe cubrir (a) reglas de accesibilidad en JSX y (b) reglas de corrección estricta, `eqeqeq` incluida.
  Motivo ampliado: el linter actual detecta 1 de 17 defectos. D3/D11/D14 se cuelan por falta de a11y y **D6 se cuela
  porque `eqeqeq` no está en `eslint:recommended`**. Si la herramienta no cubre ambas categorías, no es candidata válida.
- **DEC-03 — Lockfile regenerado: se commitea.** Se versiona el `pnpm-lock.yaml` 9.0 como parte de la modernización,
  en un commit `chore(deps)` separado. Revertir a 6.0 no es opción: el pnpm instalado no puede consumirlo.
  `pnpm-workspace.yaml` se versiona con `allowBuilds` resuelto a `false` para `@swc/core` y `esbuild` —
  ambos traen binario precompilado, `pnpm build` es verde sin sus postinstall, y menos scripts en install = menos
  superficie de supply chain. A revisar si el Architect cambia el toolchain.
- **DEC-04 — Medir, no estimar.** Ningún defecto de layout, contraste o tamaño se da por confirmado sin medición real
  en navegador. Precedente: D16 y D8, donde el análisis estático falló en ambas direcciones (uno subestimado, otro falso positivo).

- **DEC-05 — Titularidad de la verificación en runtime (B5, C1, contraste).** Dos pasadas, agentes distintos:
  1. **ENGINEER — autoverificación, obligatoria.** Mide su propia implementación y escribe los tests de layout.
     No es opcional ni un extra: §10 le exige reportar evidencia ejecutada. Un criterio de aceptación sin comando
     que lo pruebe no está entregado.
  2. **DESIGNER en AUDIT MODE — verificación independiente, es el gate.** Vuelve a medir sin dar por buena la
     evidencia del Engineer. Quien escribe el código no puede ser quien certifica que cumple.
  El **método** (herramienta, jsdom vs navegador real, qué es testeable automáticamente y qué exige comprobación
  manual) lo define el **ARCHITECT** en la sección 7 de su informe, no el Orchestrator. DEC-05 reparte la
  titularidad; el Architect decide el cómo.

- **DEC-06 — Un solo escritor de git por fase.** Dos agentes con permiso de commit sobre el mismo checkout
  colisionan por mucha disciplina que se ponga: ya ocurrió dos veces, en las dos direcciones (un `git add -A`
  del Orchestrator absorbió el árbol del Engineer; un `--amend` del Engineer reescribió un commit del
  Orchestrator). Ninguna de las dos perdió contenido, pero ambas rompieron la trazabilidad, y la causa no se
  elimina con reglas de uso: `--amend` opera sobre HEAD, y en un checkout compartido HEAD puede cambiar de dueño
  entre un commit y su enmienda.
  **Regla:** durante la fase de IMPLEMENTACIÓN (T-05..T-13) **git pertenece en exclusiva al ENGINEER**.
  El Orchestrator no commitea: escribe los documentos que necesite y los deja **sin commitear**.
  Los **GATES son las ventanas de sincronización**: en un gate el Engineer está parado por definición, y es ahí
  —y solo ahí— donde el Orchestrator commitea su documentación acumulada.
  El ARCHITECT y el DESIGNER nunca commitean; sus entregables los commitea quien tenga la ventana.
  **Antes de cualquier `--amend`, verificar `git log -1` y abortar si el commit no es propio.** Ante la duda,
  un commit nuevo de corrección en vez de reescribir: más ruidoso, pero no puede pisar a nadie.

## 3. PRODUCT DEFINITION

Producto: **demo profesional de paginación** sobre una lista de tareas (200 ítems de JSONPlaceholder).
No es una librería ni un componente aislado: es una pantalla de producto que debe sentirse real.

Usuario objetivo: alguien que recorre un dataset paginado en escritorio y en móvil, con teclado o lector de pantalla.

Fuera de scope (salvo aprobación explícita del Orchestrator): backend propio, autenticación, i18n, dark/light toggle manual, CI/CD, despliegue, tests E2E con navegador real.

## 4. CRITERIOS DE ACEPTACIÓN v1 (borrador — se cierran en el Master Plan v2)

**A. Funcional**
- A1 Lista paginada de los 200 ítems; tamaño de página seleccionable.
- A2 Primera / anterior / siguiente / última + números con ellipsis; `disabled` correcto en los límites.
- A3 Cambiar el tamaño de página no deja al usuario en una página inexistente.
- A4 Estados `loading`, `error` (con reintento) y `empty` reales y visibles.
- A5 `page` y `pageSize` viven en la URL: enlace compartible y back/forward del navegador funcionando.
- A6 Parámetros inválidos (`page=0`, `page=999`, `page=abc`, `pageSize=7`) se sanean sin romper la UI.

**B. Accesibilidad**
- B1 `<nav aria-label>`, controles que son `<button>` reales, HTML semántico.
- B2 `aria-current="page"` en la página actual.
- B3 Navegación completa por teclado; `:focus-visible` claramente visible; el foco no se pierde al cambiar de página.
- B4 El cambio de página se anuncia a lectores de pantalla (región `aria-live="polite"`).
- B5 Contraste AA: ≥4.5:1 en texto, ≥3:1 en UI. Objetivos táctiles ≥44px en móvil.
- B6 `prefers-reduced-motion` respetado.

**C. Responsive**
- C1 Sin scroll horizontal desde 320px. Variante compacta en móvil.

**D. Técnico**
- D1 TypeScript strict, cero `any`.
- D2 lint + format + typecheck + tests + build en verde, con evidencia pegada.
- D3 Tests de la lógica de rango/ellipsis y de la interacción + URL.
- D4 Cada dependencia nueva justificada una por una. Sin dependencias "porque son modernas".

**E. Calidad**
- E1 Sin dead code de plantilla. Sin abstracciones prematuras. D1–D10 corregidos o explícitamente descartados con motivo.

### Input del ENGINEER para el Master Plan v2 (aceptado como input, no como plan)
Trabajo que NO depende de la decisión cliente-vs-servidor y por tanto es paralelizable en cuanto haya Master Plan:
D9 (limpieza de plantilla), D11/D12 (foco y colores), D16 (responsive) y el andamiaje de TS/lint/test.
Ninguno toca la lógica de paginación. El orden lo fija el Master Plan a partir del informe del Architect.

## 5. Reglas para todos los agentes

1. Inspecciona antes de modificar. El repositorio es la fuente de verdad.
2. No amplíes el scope por iniciativa propia: si detectas algo fuera de tu tarea, repórtalo, no lo implementes.
3. No declares "done" sin evidencia ejecutada y pegada (comando + salida).
4. Si necesitas una decisión de producto o arquitectura, **detente** y repórtalo al Orchestrator.
5. Conventional Commits. No hagas `git push`, ni tags, ni releases, ni rebase/reset destructivo.
6. Solo ENGINEER escribe en `src/`. ARCHITECT y DESIGNER escriben únicamente en `docs/`.
