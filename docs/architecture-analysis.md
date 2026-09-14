# ANÁLISIS DE ARQUITECTURA — T-01 (ARCHITECT, modo READ-ONLY)

Autor: ARCHITECT. Fecha: 2026-09-13. Rama: `feat/modernize-pagination` (no se cambió de rama).
Alcance: investigación técnica del repo actual y propuesta de arquitectura objetivo.
Regla respetada: única escritura = este archivo. No se tocó `src/`, configs ni lockfile. No hubo commits.

> Este informe es **INPUT A VALIDAR** según `docs/00-ORCHESTRATOR.md` §0. Las secciones §2, §2.1 y §2.2
> del doc del Orchestrator se revisan aquí con criterio propio. Donde hay corrección, se marca **CORRECCIÓN**;
> donde hay confirmación, **CONFIRMADO**. Precedente respetado: D8 se dio por falso positivo antes; aquí se
> vuelve a medir/derivar todo lo que se pudo, y lo que no, se declara explícitamente como pendiente de medición.

Todas las versiones citadas salen de `npm view <pkg> version` ejecutado en esta sesión (comandos visibles en §1).
Runtime verificado en esta máquina: Node **v26.8.1**, npm **11.19.0**, pnpm **12.3.4**.
Instalado ahora: react 18.3.1, react-dom 18.3.1, vite 4.5.14, @vitejs/plugin-react-swc 3.11.0, eslint 8.57.1.
`node_modules` está parcialmente instalado (9 entradas). **No se ejecutó `install`** (prohibido por el brief).

---

## 0. Estado actual y hallazgos principales

### 0.1 Arquitectura actual (leída del código, no de nombres de archivo)

- **Runtime/build**: SPA Vite 4.5.14 + `@vitejs/plugin-react-swc` 3.11.0. `index.html` monta `#root`,
  `src/main.jsx` hace `createRoot(...).render(<StrictMode><App/></StrictMode>)`.
- **UI**: `App.jsx` (15 líneas) solo envuelve `<Pagination/>` en dos divs de la plantilla Vite.
  Toda la app son **111 líneas** en `src/components/Pagination.jsx`.
- **Estado**: 6 `useState` locales (`data`, `currentPage`, `itemsPage`, `pageNumberLimit`,
  `maxNumberLimit`, `minPageNumberLimit`). No hay estado en URL, ni router, ni store.
- **Data flow**: `useEffect` único en `Pagination.jsx:53-57` hace
  `fetch("https://jsonplaceholder.typicode.com/todos")` → 200 ítems → `setData`. Sin loading/error/abort.
- **Render flow**: `data` → `Math.ceil(data.length/itemsPage)` páginas → `slice()` de la página actual →
  `<ul>` de títulos. La "ventana" de números se calcula con `maxNumberLimit`/`minPageNumberLimit`.
- **Estilos**: 3 hojas (`index.css`, `App.css`, `style/style.css`) con solapamiento y restos de plantilla
  (`.logo`, `logo-spin`, `.read-the-docs`). Colores hardcodeados fuera de la media query.
- **Ausencias**: TypeScript, tests, formatter, router, CI, scripts `typecheck`/`test`/`format`.
  ESLint 8 legacy (`.eslintrc.cjs`) sin `eslint-plugin-jsx-a11y`.

### 0.2 Validación del inventario D1–D17

Confirmo por lectura de código D1–D7, D9–D15 y los menores (D4 `key={index}` en `Pagination.jsx:8`;
D5 fetch sin abort; D6 `==` en `:97,103` y ternarios redundantes; D7 `haddleLoadMore` sube `itemsPage`;
D13 `pageNumberLimit` nunca se escribe — solo se lee en `:63,64,71,72,73`; D14 `Number(event.target.id)`
en `:23-24` con `id` numérico global en `:41`). No repito la tabla del Orchestrator.

Los tres puntos que el kickoff pide validar explícitamente van en **§7**. Resumen de veredictos:

| Punto a validar | Veredicto |
|---|---|
| D8/D12 LATENTES y D17 (¿theming correcto?) | **CONFIRMADO** como latentes + D17 real. Estrategia de theming: tokens CSS + `prefers-color-scheme`, **sin** toggle manual (fuera de scope). |
| Umbral de ruptura D16 ≈518px | **PARCIALMENTE CONFIRMADO**: hay desborde seguro, pero los propios números medidos son **inconsistentes** (518.4 vs 550). No se debe fijar un umbral; el fix correcto es el modo compacto `<480px`. |
| Ratios de contraste y algoritmo de ellipsis del design-spec | **CONFIRMADOS** (20/20 ratios dentro de 0.06; 6/6 ejemplos y 0 violaciones de propiedades en totales 1..200). |
| DEC-03 (`allowBuilds=false` para @swc/core y esbuild) | **CORRECCIÓN**: intención correcta, ejecución obsoleta. Vite 8 **ya no depende de esbuild**; `@swc/core` solo entra si se mantiene `plugin-react-swc`. Con el plugin recomendado (`@vitejs/plugin-react` 6.1.1) no hay `@swc/core`. |

### 0.3 Hallazgos principales (los que cambian decisiones)

1. **El stack de lint actual no puede cubrir DEC-02 si se adopta TypeScript 7**: `typescript-eslint@8.70.0`
   declara peer `typescript >=4.8.4 <6.1.0`, y la última estable es **7.0.2**. Esto empuja a **oxlint** como
   linter, que no depende de la API de TypeScript y ya cubre a11y JSX (36 reglas `jsx-a11y`) y corrección
   estricta (`eqeqeq`, `rules-of-hooks`, `exhaustive-deps`).
2. **Vite 8 ya no usa esbuild**: `npm view vite@8.3.0 dependencies` → `rolldown ~1.2.6`, `lightningcss`,
   `postcss`, `picomatch`, `tinyglobby`. `esbuild` es solo peer **opcional**. La entrada `esbuild` de
   `pnpm-workspace.yaml` queda muerta.
3. **El plugin React de Vite 8 es `@vitejs/plugin-react@6.1.1`** (peer `vite ^8`), no `plugin-react-swc`.
   Adoptarlo elimina `@swc/core` y su postinstall, alineándose con el objetivo de DEC-03.
4. **TypeScript 7 es el compilador nativo (Go)**: el paquete `typescript@7.0.2` pesa 2.5 MB desempaquetado,
   expone **un único bin `tsc`** (sin `tsserver`), usa `optionalDependencies` `@typescript/typescript-<plat>-<arch>`
   y una API JS marcada `unstable/*`. `typescript@5.9.3` sí expone `tsc` **y** `tsserver`.
5. **JSONPlaceholder soporta paginación servidor**: medido con `curl` (ver §3), `?_page=2&_limit=10` y
   `?_start=10&_limit=10` devuelven `x-total-count: 200`; `_page=2&_limit=10` entrega ids 11..20.
   La decisión cliente-vs-servidor es real y queda **ESCALADA**.

---

## 1. Matriz de versiones objetivo

Comandos de verificación ejecutados (cada versión de la tabla viene de aquí):

```
npm view react version react-dom version
npm view typescript version
npm view vite version
npm view @vitejs/plugin-react version @vitejs/plugin-react-swc version
npm view tailwindcss version @tailwindcss/vite version @tailwindcss/oxide version
npm view vitest version @testing-library/react version @testing-library/dom version
npm view jsdom version happy-dom version
npm view oxlint version oxfmt version prettier version
npm view @playwright/test version playwright version @axe-core/playwright version
npm view @tanstack/react-router version @tanstack/react-query version nuqs version zod version
npm view eslint version eslint-plugin-jsx-a11y version typescript-eslint version
```

| Paquete | Última (`npm view`) | Instalado hoy | Decisión | Notas de compatibilidad |
|---|---|---|---|---|
| react | **19.3.0** | 18.3.1 | ADOPT 19.3.0 | Código ya usa `createRoot`; sin APIs legacy. `@types` 19.3.0 |
| react-dom | **19.3.0** | 18.3.1 | ADOPT 19.3.0 | peer `react ^19.3.0` |
| @types/react | **19.3.0** | 18.x | ADOPT | — |
| @types/react-dom | **19.3.0** | 18.x | ADOPT | — |
| typescript | **7.0.2** | — | ADOPT strict · **recomiendo 5.9.3** | 7.0.2 = nativo, solo `tsc`, API `unstable`; 5.9.3 = `tsc`+`tsserver`, ecosistema compatible. Ver §2.1 |
| vite | **8.3.0** | 4.5.14 | ADOPT | engines `^20.19 || >=22.12`; Node 26.8.1 ✅. Deps: rolldown 1.2.x + lightningcss |
| @vitejs/plugin-react | **6.1.1** | — | ADOPT | peer `vite ^8.0.0` ✅. Fast Refresh + JSX automático, sin SWC |
| @vitejs/plugin-react-swc | **4.3.3** | 3.11.0 | REJECT (superado) | peer `vite ^4-^8`; arrastra `@swc/core ^1.15.46` (binario nativo + postinstall) |
| vitest | **5.0.0** | — | ADOPT | peer `vite ^6.4 || ^7 || ^8` ✅; engines `^22.12 || ^24 || >=26` ✅ |
| @vitest/coverage-v8 | **5.0.0** | — | OPCIONAL | Mismo versionado que vitest |
| @testing-library/react | **16.3.3** | — | ADOPT | peer `react ^18 || ^19` ✅; peer obligatorio `@testing-library/dom ^10` |
| @testing-library/dom | **10.4.2** | — | ADOPT | Peer de RTL v16 (instalar explícito) |
| @testing-library/user-event | **14.6.7** | — | ADOPT | Necesario para tests reales de teclado (B3) |
| @testing-library/jest-dom | **7.0.1** | — | ADOPT | Matchers DOM |
| jsdom | **30.0.1** | — | ADOPT | engines `^22.22.2 || ^24.15 || >=26` ✅. Entorno de test |
| happy-dom | **20.14.5** | — | REJECT | Más rápido pero con huecos de spec; jsdom es el default seguro de RTL |
| oxlint | **1.82.0** | — | ADOPT | 870 reglas, 111 por defecto, 36 `jsx-a11y`, `eqeqeq`, `rules-of-hooks`, `exhaustive-deps` |
| oxfmt | **0.67.0** | — | REJECT | 0.x, 69 releases desde 0.0.0, sin 1.0; formatter aún cambiante |
| prettier | **3.9.6** | — | ADOPT | Formatter estable |
| @playwright/test | **1.63.0** | — | ADOPT | Runner de verificación runtime (DEC-05). `webServer` propio |
| playwright | **1.63.0** | — | ADOPT | Dependencia del runner; binarios de navegador aparte |
| @axe-core/playwright | **4.13.0** | — | OPCIONAL | Barrido a11y extra; no sustituye a las mediciones propias |
| eslint | 10.10.0 (9.x: **9.39.5**) | 8.57.1 | REJECT path | `eslint-plugin-jsx-a11y@6.10.2` solo soporta `^3-^9` → ESLint 10 incompatible |
| typescript-eslint | **8.70.0** | — | REJECT | peer `typescript <6.1.0` → incompatible con TS 7.0.2 |
| eslint-plugin-jsx-a11y | **6.10.2** | — | REJECT | peer `eslint ^3-^9`; queda fuera si se va a oxlint |
| @tanstack/react-router | **1.170.36** | — | REJECT | 1.04 MB desempaquetado + router-core/history/react-store/isbot; una sola pantalla |
| @tanstack/react-query | **5.102.8** | — | REJECT (si cliente) | 745 KB; un solo GET sin mutaciones/refetch/caché entre vistas |
| nuqs | **2.10.1** | — | REJECT | 472 KB; peers orientados a routers (next/react-router/tanstack) |
| zod | **4.6.5** | — | REJECT | 6.14 MB desempaquetado para validar 2 entradas; guard a mano ≈10 líneas |

**Compatibilidad global**: Node 26.8.1 satisface todos los `engines` anteriores. React 19 ↔ RTL 16.3.3 ↔
`@types` 19.3.0 encajan. Vite 8 ↔ plugin-react 6.1.1 ↔ Vitest 5.0.0 ↔ (si se adoptara) `@tailwindcss/vite` 4.3.3
encajan por peer. **Único choque real del set**: TS 7 vs `typescript-eslint`, resuelto no usándolo.

---

## 2. Decisión tecnológica, una por una

### 2.1 TypeScript strict — **ADOPT**

Evidencia: no hay ningún `.ts`/`.tsx`; el único archivo con lógica, `Pagination.jsx`, mezcla 6 estados y
manipula índices de array (`slice(indexOfFirstItem, indexOfLastItem)`) con riesgo aritmético ya materializado
en D15. Tipar `Todo` (`{id:number; userId:number; title:string; completed:boolean}`), `PageParams` y las
props de los componentes es el mayor retorno por línea invertida del backlog.

**Migración: completa de golpe, sin `allowJs`.** Con 4 archivos fuente y ~140 líneas totales, el modo
progresivo (`allowJs:true` + conversión incremental) añade una configuración intermedia y un estado mixto
que no aporta nada: no hay módulos JS de terceros propios que migrar. Renombrar `.jsx`→`.tsx`, añadir tipos,
`tsc --noEmit` en verde.

**Versión — decisión que requiere aprobación**:
- **Recomiendo TypeScript 5.9.3** para v1. Motivos anclados: (a) `typescript@5.9.3` expone `tsc` **y**
  `tsserver`; `typescript@7.0.2` solo expone `tsc` (verificado desempaquetando el tarball: `package/bin/tsc`,
  `optionalDependencies: @typescript/typescript-<plat>-<arch>`, sin `tsserver`), lo que degrada la integración
  de editores; (b) `typescript-eslint` no soporta 7, y aunque oxlint lo evita hoy, cierra la puerta a linting
  type-aware sin cambiar de versión; (c) la app no necesita la velocidad del compilador nativo.
- **Alternativa aceptable**: TS 7.0.2 si el Orchestrator prioriza el compilador nativo y acepta el riesgo de
  tooling. En ese caso `oxlint` es obligatorio (no hay ESLint typed posible).

`tsconfig.json` propuesto: `strict:true`, `noUncheckedIndexedAccess:true`, `noImplicitOverride:true`,
`moduleResolution:"bundler"`, `jsx:"react-jsx"`, `noEmit:true`, `types:["vite/client"]`. `noUncheckedIndexedAccess`
es directamente relevante: es la clase de bug de D15 (`pages[...]`/`slice` fuera de rango).

### 2.2 Tailwind CSS 4 — **REJECT**

Evidencia del código: 3 hojas con solapamiento y deuda real (D8/D12/D9). Pero Tailwind **no es necesario para
resolverlo**: `docs/design-spec.md` §2 define los tokens como **custom properties CSS puras** (`--color-*`,
`--text-*`, `--space-*`, `--radius-*`). Eso ya es un design system nativo de CSS; `@theme` es solo una forma
alternativa de declararlo. Reescribir el componente con utilidades añade:

- 4 paquetes y un binario nativo (`tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/node`,
  `@tailwindcss/oxide` + `@tailwindcss/oxide-<plat>` por `optionalDependencies`) para estilizar 6 componentes.
- Preflight, que resetea el layout de la plantilla — precisamente el que hay que demoler (D9).
- Una capa de indirección (`@theme` ↔ clase utilitaria) sobre una app donde el diseñador ya entregó variables.

**YAGNI**: el coste de Tailwind se amortiza con decenas de componentes y múltiples pantallas; aquí hay una
pantalla y ~6 componentes. La deuda D8/D12/D9 se salda igual con **una sola hoja `index.css`** que contenga
los tokens de §2 y las clases de los componentes, borrando `App.css` y `style/style.css`.
**Trigger para revisar**: si el producto crece a ≥3 pantallas o ≥20 componentes, Tailwind 4 pasa a ser razonable.

### 2.3 Vitest — **ADOPT** (entorno **jsdom**)

Evidencia: D3 del §4 exige "tests de la lógica de rango/ellipsis y de la interacción + URL". El algoritmo de
ellipsis del design-spec §3 tiene 6 casos literales y propiedades de borde (total=7, actual siempre visible).
Es lógica pura, ideal para tests rápidos. Vitest 5 comparte transform con Vite 8 (peer `vite ^6.4||^7||^8`),
sin configuración de bundler adicional.

**Entorno: jsdom 30.0.1, no happy-dom.** jsdom es el default de Testing Library y tiene mejor soporte de roles
ARIA y eventos, que es justo lo que se testea (B1/B2/B3). happy-dom es más rápido pero con lagunas de spec.
`jsdom@30` requiere Node `^22.22.2||^24.15||>=26` → Node 26.8.1 ✅.
Tests co-localizados (`src/lib/pagination.test.ts`, `src/components/PaginationScreen.test.tsx`).

### 2.4 oxlint + oxfmt — **oxlint ADOPT · oxfmt REJECT** (formatter: **Prettier 3.9.6**)

**oxlint 1.82.0 ADOPT.** Evidencia dura contra DEC-02:
- a11y JSX: **36 reglas `jsx-a11y`**, incluidas `click-events-have-key-events`,
  `no-noninteractive-element-interactions`, `interactive-supports-focus`, `no-noninteractive-tabindex`,
  `role-has-required-aria-props`, `aria-*`. Son exactamente las que habrían cazado D3.
- Corrección estricta: `eqeqeq` (caza D6), `no-unused-vars` (caza D13), `no-array-index-key` (caza D4).
- React Hooks: `rules-of-hooks` + `exhaustive-deps` **están implementados** (verificado en la referencia de
  reglas de oxc.rs: `react/rules-of-hooks`, `react/exhaustive-deps`, `react/hooks`).
- No depende de la API de TypeScript → **inmune al choque TS 7 vs typescript-eslint**.
- Binario único (2.4 MB), sin config legacy, ejecución en milisegundos.

**Contra (honesto)**: no hace linting type-aware por defecto (oxlint lo tiene en preview vía `tsgolint`);
pierde reglas que requieren tipos (`no-floating-promises`, `no-misused-promises` aparecen marcadas como
type-aware). En una app de 4 archivos sin promesas encadenadas más allá del fetch, la pérdida es aceptable.
Si el Orchestrator exige type-aware, la única vía es bajar a TS 5.9.3 + ESLint 9.39.5 + typescript-eslint
(no ESLint 10: `eslint-plugin-jsx-a11y` no lo soporta). **Recomiendo oxlint.**

**oxfmt 0.67.0 REJECT.** Versión 0.x, 69 releases partiendo de 0.0.0, publicaciones semanales (0.62→0.67 entre
ago-03 y sep-07 de 2026), sin 1.0. Un formatter que cambia su salida entre versiones genera diffs ruidosos y
rompe `--check` en CI. **Prettier 3.9.6 ADOPT** como formatter. Trigger para revisar oxfmt: llegada de 1.0.

### 2.5 TanStack Router — **REJECT**

Evidencia: la app es **una sola pantalla** (`App.jsx` monta `<Pagination/>` y nada más). No hay rutas, layouts,
loaders, params de path ni code-splitting. Lo único que el producto pide de "routing" es A5: que `page` y
`pageSize` vivan en la URL con back/forward. Eso es `URLSearchParams` + `history.pushState` + `popstate`, no
un router.

Coste medido: `@tanstack/react-router@1.170.36` = **1.04 MB desempaquetado** + `router-core`, `history`,
`react-store`, `isbot`. Para dos enteros en el query string. **REJECT**.

**Alternativa ADOPT**: un hook `usePaginationParams()` (~40 líneas) sobre `URLSearchParams` + History API,
con saneado A6 (`page=0|999|abc`, `pageSize=7` → valores válidos). Sin dependencias.

### 2.6 TanStack Query — **REJECT** (condicionado a la decisión de §3)

Evidencia: hay **un solo GET estático**, sin mutaciones, sin invalidación, sin caché entre vistas (solo hay
una vista). `react-query@5.102.8` = 745 KB. Un `useEffect` con `AbortController`, `loading`/`error`/`retry`
son ~40 líneas y ya hay que escribirlas para cubrir D5 y A4.

**Condición**: si el Orchestrator elige **paginación servidor** (§3), TanStack Query pasa a ser defendible
(caché por página, `keepPreviousData`, estados por fetch, retry). En ese escenario recomendaría reconsiderarlo.
Con paginación **cliente** (mi recomendación), REJECT por YAGNI.

### 2.7 Zod — **REJECT**

Evidencia: hay exactamente **dos entradas externas**: la respuesta de JSONPlaceholder y los search params.
- La respuesta: un type guard de ~6 líneas (`Array.isArray(x) && typeof x[0]?.id === "number"`) basta; el
  dataset es fijo y de confianza moderada.
- Los params: el saneado de A6 es aritmético, no de forma (`page` entero ≥1 y ≤totalPages, `pageSize` en la
  lista permitida). Un `sanitizeParams()` de ~15 líneas lo cubre mejor que un schema, porque además **clampa**
  contra el total real de páginas, algo que Zod no hace.

`zod@4.6.5` = 6.14 MB desempaquetado para eso. **REJECT**.

### 2.8 Otras decisiones de toolchain

- **Vite 8.3.0 + `@vitejs/plugin-react` 6.1.1 — ADOPT.** Vite 8 es Rolldown-based (deps reales: `rolldown`,
  `lightningcss`, `postcss`), y `@vitejs/plugin-react@6.1.1` es el plugin oficial con peer `vite ^8`. Aporta
  Fast Refresh y JSX automático sin SWC. **`@vitejs/plugin-react-swc` 4.3.3 — REJECT**: sigue soportando Vite 8,
  pero arrastra `@swc/core` (binario nativo + postinstall) que deja de ser necesario y contradice el espíritu de
  DEC-03. Fallback si `plugin-react` 6.1.1 diera problemas: `plugin-react-swc` 4.3.3 (drop-in).
- **React 19.3.0 — ADOPT.** `main.jsx` ya usa `createRoot` y no hay APIs legacy; `@types` 19 y RTL 16.3.3
  soportan 19. Riesgo bajo. (Si se quisiera minimizar churn, 18.3.1 sigue siendo válido; no es un requisito.)
- **Playwright Test 1.63.0 — ADOPT** para la verificación runtime de DEC-05 (§7).
- **`@axe-core/playwright` 4.13.0 — OPCIONAL**; complementa pero no sustituye las mediciones de B5/C1.

---

## 3. DECISIÓN ESCALADA AL ORCHESTRATOR — paginación cliente vs servidor

> **No la cierro.** Analizo, recomiendo, y la dejo marcada como `ESCALADA AL ORCHESTRATOR`.

Medición del API (ejecutada con `curl`, no de memoria):

```
curl -s -D - -o /dev/null "https://jsonplaceholder.typicode.com/todos?_page=2&_limit=10"
  -> HTTP/2 200 ; access-control-expose-headers: X-Total-Count, Link ; x-total-count: 200
curl -s -D - -o /dev/null "https://jsonplaceholder.typicode.com/todos?_start=10&_limit=10"
  -> HTTP/2 200 ; x-total-count: 200
curl -s "https://jsonplaceholder.typicode.com/todos?_page=2&_limit=10"
  -> items: 10  firstId: 11  lastId: 20
```

Ambas variantes (`_page/_limit` y `_start/_limit`) devuelven `x-total-count`. Es decir: **paginación servidor
es técnicamente viable hoy**.

| Criterio | Cliente (actual) | Servidor |
|---|---|---|
| Realismo de producto | Bajo: un fetch y cortes locales; el dataset cabe entero | Alto: patrón de producción real |
| Estados loading/error por página | Solo en la carga inicial | Uno por cada cambio de página (más rico) |
| Complejidad | Ventana de números derivada (los bugs D1/D2/D15 son de esta lógica) | Igual ventana + concurrencia de fetch (race al pulsar Next rápido) |
| Dependencia de red | Una sola vez | Cada cambio de página; JSONPlaceholder es un mock público compartido |
| Determinismo para tests/auditoría (DEC-04/05) | Alto: un fetch cacheable/mockeable | Bajo: red en cada aserción de paginación |
| Justifica TanStack Query | No | Sí (caché por página, `keepPreviousData`, retry) |
| Coste en KB (si Query) | 0 | 745 KB + `query-core` |

**Recomendación del ARCHITECT: paginación CLIENTE.** Motivos anclados en este producto:
1. El dataset es **fijo y pequeño** (200 ítems). Servidor resuelve un problema de escala que este producto no
   tiene — YAGNI.
2. Los 17 defectos son de lógica de ventana, accesibilidad, estilos y URL; **ninguno** se arregla con paginación
   servidor, y varios (D15, D1) son más fáciles de probar con datos locales deterministas.
3. DEC-04/05 exigen medición fiable. Un fetch único es reproducible; 20 fetches contra un mock público, no.
4. A4 (loading/error/retry) se cubre con el fetch inicial; el skeleton del design-spec §4 se sigue usando.
5. La capa de datos queda aislada en `lib/api.ts` + `hooks/useTodos.ts`: **cambiar a servidor después es
   reescribir un archivo**, sin tocar UI ni lógica de paginación.

**Si el Orchestrator elige servidor**: entonces cambian dos veredictos — `@tanstack/react-query` pasa a ADOPT
(caché/estados por página) y `useTodos` pasa a `useQuery` con `queryKey:['todos',page,pageSize]`. El resto de
la arquitectura de §4 no cambia.

---

## 4. Arquitectura objetivo

Máximo lo que estos requisitos necesitan: sin carpetas vacías, sin barrel files, sin capas especulativas.

```
index.html                     # título real, favicon propio o ninguno (D9); monta /src/main.tsx
package.json                   # scripts: dev/build/lint/format/typecheck/test/verify:runtime/verify
tsconfig.json                  # strict + noUncheckedIndexedAccess, noEmit, bundler
tsconfig.node.json             # tipa vite.config.ts / vitest.config.ts / playwright.config.ts
vite.config.ts                 # plugin-react + (si se aprueba) nada más; config de Vitest inline
playwright.config.ts           # webServer propio + proyectos por viewport/esquema de color (DEC-05)
.oxlintrc.json                 # categorías correctness + jsx-a11y + eqeqeq + react-hooks
.prettierrc.json / .prettierignore
src/
  main.tsx                     # createRoot + StrictMode + import de index.css
  App.tsx                      # shell: <h1> + <PaginationScreen/>
  index.css                    # ÚNICO CSS: tokens del design-spec §2 + base + focus-visible + reduced-motion
  types.ts                     # Todo, PageParams, FetchState
  lib/
    pagination.ts              # PURO: getPageRange(current,total), clampPage, getTotalPages
    pagination.test.ts         # 6 ejemplos del spec + propiedades (total=7, actual visible, ≤7 slots)
    params.ts                  # PURO: parseParams(URLSearchParams) / serializeParams → saneado A6
    params.test.ts             # page=0/999/abc, pageSize=7, page>totalPages → clamp
    api.ts                     # fetchTodos(signal): Promise<Todo[]>; valida forma y lanza Error tipado
  hooks/
    useTodos.ts                # data/loading/error + retry + AbortController (D5, A4)
    usePaginationParams.ts     # {page,pageSize,setParams} ↔ URL + popstate (A5)
  components/
    PaginationScreen.tsx       # compone hooks + estados; decide compacto/desktop
    PaginationScreen.test.tsx  # interacción: roles, aria-current, disabled, teclado, ellipsis
    TodoList.tsx               # lista / empty; skeleton delegado
    PaginationControls.tsx     # <nav aria-label> + <ul>/<li>/<button>; ellipsis como <span aria-hidden>
    PageSizeSelect.tsx         # <label>+<select>; en <480px el <select> de salto directo
    StatusMessage.tsx          # ÚNICA región aria-live (loading/loaded/error)
    Skeleton.tsx               # filas del design-spec §4 (altura estable, reduced-motion)
    ErrorBanner.tsx            # mensaje + botón Reintentar
e2e/
  layout.spec.ts               # C1: sin scroll horizontal a 320/375/414
  touch-targets.spec.ts        # B5: ≥44px en móvil
  contrast.spec.ts             # B5: ratios calculados en navegador real, ambos esquemas
  focus.spec.ts                # B2/B3: :focus-visible y aria-current
  reduced-motion.spec.ts       # B6
```

**Dónde vive cada cosa**:
- **Lógica de paginación**: función pura en `lib/pagination.ts`, testeable sin React. No en el componente
  (así se elimina de raíz el acoplamiento estado↔DOM de D1/D14).
- **Fetch**: `lib/api.ts` (I/O aislado y tipado) + `hooks/useTodos.ts` (ciclo de vida React).
- **Tipos**: `src/types.ts`, compartidos por lib/hooks/componentes.
- **URL**: `hooks/usePaginationParams.ts`, única fuente de verdad de `page`/`pageSize` (A5).
- **Theming (D17)**: tokens en `index.css` bajo `:root` y `@media (prefers-color-scheme: light)`.
  `color-scheme: light dark` declarado; **el `background-color` del `body` se deriva del token**, nunca
  hardcodeado. Sin toggle manual (fuera de scope).

**Seam de datos** (para §3): `useTodos` expone la misma forma `{data, loading, error, retry}` tanto si detrás
hay un fetch de 200 ítems como si hay un fetch por página. La UI no sabe cuál es.

---

## 5. Orden de implementación

Cada paso deja `pnpm build` en verde. "Detección" = comando o señal que evidencia la rotura.

1. **Toolchain y configs (sin tocar lógica).** Añadir TS 5.9.3, Vite 8, `@vitejs/plugin-react` 6.1.1,
   React 19, Vitest 5, oxlint, Prettier; crear `tsconfig*`, `.oxlintrc.json`, `.prettierrc`,
   `playwright.config.ts`; actualizar `pnpm-workspace.yaml` (DEC-03). Mantener `.jsx` un paso más.
   *Puede romperse*: resolución de deps nativas. *Detección*: `pnpm build`, `pnpm lint`.
2. **Migración JS→TS strict.** Renombrar 4 archivos a `.tsx`, añadir `types.ts`, quitar el estado muerto D13,
   corregir `eqeqeq`/ternarios (D6). Comportamiento idéntico.
   *Puede romperse*: tipos de `event.target.id` (D14). *Detección*: `pnpm typecheck`, `pnpm build`.
3. **Extraer lógica pura + tests.** `lib/pagination.ts` con el algoritmo del design-spec §3; tests de los 6
   ejemplos y de las propiedades (total=7, actual siempre presente, ≤7 slots). `lib/params.ts` + tests A6.
   *Puede romperse*: la ventana actual si se copia mal. *Detección*: `pnpm test`.
4. **Estado en URL (A5/A6).** `usePaginationParams` con `pushState`/`popstate`; saneado y clamp.
   *Puede romperse*: bucles de historial o back/forward roto. *Detección*: tests de `params` + manual.
5. **Capa de datos (A4/D5).** `lib/api.ts` + `useTodos` con AbortController, loading/error/retry.
   *Puede romperse*: doble fetch por StrictMode (dev). *Detección*: test que cuenta llamadas al mock + smoke.
6. **Reescribir la UI (D1/D2/D3/D7/D11/D15, B1–B4).** `PaginationControls` con `<nav>`/`<button>`/`aria-current`,
   ellipsis decorativo, sin "Load More" (se reemplaza por el selector de tamaño), `disabled` derivado de
   `currentPage===1`/`===totalPages` (no de `pages[0]`), clamp D15.
   *Puede romperse*: orden de tabulación, foco tras cambio de página. *Detección*: `PaginationScreen.test.tsx`.
7. **Estilos y theming (D8/D9/D12/D17, D16/C1).** Borrar `App.css` y `style/style.css`; una `index.css` con
   tokens de §2; modo compacto `<480px` del §5 del design-spec (4 botones ícono + `<select>` de salto);
   `:focus-visible`; skeleton con `prefers-reduced-motion`.
   *Puede romperse*: layout a 320px. *Detección*: `pnpm verify:runtime` (paso 8).
8. **Andamiaje de verificación runtime (DEC-05).** Specs de Playwright para C1/B5/B6/B3 + `webServer`;
   script `verify:runtime` y `verify` agregado.
   *Puede romperse*: el servidor no arranca o el navegador no está instalado. *Detección*: el propio runner.
9. **Cierre.** `pnpm verify` completo en verde; pegar evidencia; limpieza final.

**No paralelizable por lógica**: 6 depende de 3/4/5; 7 depende de 6; 8 es independiente y puede escribirse en
paralelo a 3–7 (DEC-05 exige que sea reejecutable por otro agente).

---

## 6. Riesgos

| # | Riesgo | Prob. | Impacto | Prioridad | Mitigación |
|---|---|---|---|---|---|
| R1 | Migración JS→TS rompe el build | Media | Medio | **P1** | Migración completa en un paso con `tsc --noEmit` como gate; sin `allowJs`; `noUncheckedIndexedAccess` desde el inicio |
| R2 | TS 7.0.2 sin `tsserver`/ecosistema (si se aprueba 7) | Alta | Medio | **P1** | Recomendar 5.9.3; si se va a 7, oxlint obligatorio y `tsc --noEmit` como typecheck; verificar LSP del editor |
| R3 | `@vitejs/plugin-react` 6.1.1 es nuevo y su peer `oxc-transform-react` es opcional/0.x | Media | Medio | **P2** | Fallback documentado: `plugin-react-swc` 4.3.3 (peer Vite 8). Detección: `pnpm dev` + `pnpm build` |
| R4 | Playwright descarga binarios de navegador (~150 MB) y puede fallar en entornos sin red/CI | Media | Medio | **P1** | Documentar `pnpm exec playwright install chromium` como setup único; fijar versión; `PLAYWRIGHT_BROWSERS_PATH` cacheado; si el entorno del DESIGNER no lo permite, plan B: procedimiento manual documentado (§7) |
| R5 | StrictMode dispara doble fetch en dev (D5) | Alta | Bajo | **P2** | `AbortController` + cleanup en `useTodos`; test que cuente invocaciones; la doble petición dev es inocua |
| R6 | `node_modules` parcial y lockfile regenerado (DEC-01/DEC-03) | Media | Medio | **P1** | `pnpm install` limpio en el paso 1; commit `chore(deps)` separado; verificar `pnpm build` antes de seguir |
| R7 | DEC-03 queda obsoleto y bloquea un postinstall necesario | Baja | Medio | **P2** | Actualizar: quitar `esbuild` (ya no es dep de Vite 8), quitar `@swc/core` si se adopta plugin-react; los binarios nuevos (oxide, lightningcss, rolldown, TS nativo) van por `optionalDependencies`, sin script |
| R8 | Modo compacto `<480px` cambia la semántica de navegación y rompe tests de foco | Media | Medio | **P2** | Foco se queda en el control activado; el `<select>` de salto dispara el mismo `goTo`; cubrir con test |
| R9 | `prefers-color-scheme` no es conmutable en el runner | Baja | Bajo | **P3** | Playwright `colorScheme` por proyecto; verificar ambos esquemas en `contrast.spec.ts` |
| R10 | Reintroducir D15 al migrar (clamp de `currentPage` al cambiar `pageSize`) | Media | Alto | **P1** | Test dedicado: `itemsPage` sube con `currentPage` en el límite → nunca `slice()` vacío; clamp en `lib/pagination.ts` |

---

## 7. Estrategia de validación

### 7.1 Qué comando prueba qué criterio (§4 del Orchestrator)

| Criterio | Comando / test | Notas |
|---|---|---|
| A1 lista paginada, tamaño seleccionable | `pnpm test` (`PaginationScreen.test.tsx`) + `e2e` smoke | Datos mockeados en unit; red real no necesaria |
| A2 first/prev/next/last + ellipsis, `disabled` en límites | `pnpm test` (lógica + componente) | Propiedades de `getPageRange` cubren ellipsis |
| A3 cambiar tamaño no deja página inexistente | `pnpm test` (`params` + clamp) | Test explícito de D15 |
| A4 loading/error/retry/empty | `pnpm test` con fetch mockeado (3 estados) | `retry` invoca de nuevo el mock |
| A5 `page`/`pageSize` en URL + back/forward | `pnpm test` (`usePaginationParams`) + manual | `pushState`/`popstate` en jsdom |
| A6 params inválidos saneados | `pnpm test` (`params.test.ts`) | `page=0/999/abc`, `pageSize=7` |
| B1 `<nav>` + `<button>` + HTML semántico | `pnpm test` + `pnpm lint` (jsx-a11y) | Roles consultados con RTL |
| B2 `aria-current="page"` | `pnpm test` + `e2e/focus.spec.ts` | — |
| B3 teclado + `:focus-visible` + foco estable | `pnpm test` (user-event) + `e2e/focus.spec.ts` | El outline computado exige navegador real |
| B4 anuncio en `aria-live` | **Verificación manual** (lector de pantalla) | No automatizable de forma fiable |
| B5 contraste AA + táctil ≥44px | `e2e/contrast.spec.ts` + `e2e/touch-targets.spec.ts` | Navegador real; ambos esquemas |
| B6 `prefers-reduced-motion` | `e2e/reduced-motion.spec.ts` | Playwright `reducedMotion:'reduce'` |
| C1 sin scroll horizontal desde 320px | `e2e/layout.spec.ts` | Navegador real, 320/375/414 |
| D1 TS strict, cero `any` | `pnpm typecheck` + `pnpm lint` | — |
| D2 lint+format+typecheck+test+build verdes | `pnpm verify` | Evidencia pegada por el ENGINEER |
| D3 tests de rango/ellipsis/interacción/URL | `pnpm test` | — |
| D4 cada dependencia justificada | Este informe (§1/§2) | — |
| E1 sin dead code ni abstracciones prematuras | `pnpm lint` + revisión | Borrado de plantilla en paso 7 |

### 7.2 Andamiaje reejecutable (DEC-05) — el método lo fija el ARCHITECT

**Diseño**: `@playwright/test` 1.63.0 con `webServer` en `playwright.config.ts`. El runner arranca **y para**
el servidor y lanza el navegador por sí mismo; no hay puerto elegido a mano ni navegador levantado a mano.

```ts
// playwright.config.ts (esquema)
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  projects: [
    { name: 'mobile-320', use: { viewport: { width: 320, height: 720 } } },
    { name: 'mobile-375', use: { viewport: { width: 375, height: 720 } } },
    { name: 'mobile-414', use: { viewport: { width: 414, height: 720 } } },
    { name: 'desktop-light', use: { viewport: { width: 1280, height: 800 }, colorScheme: 'light' } },
    { name: 'desktop-dark', use: { viewport: { width: 1280, height: 800 }, colorScheme: 'dark' } },
  ],
});
```

Script de `package.json` (un comando, reproducible por el DESIGNER sin preguntar al ENGINEER):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "oxlint",
    "format": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "verify:runtime": "playwright test",
    "verify": "pnpm lint && pnpm format && pnpm typecheck && pnpm test && pnpm build && pnpm verify:runtime"
  }
}
```

**Setup único** (una vez por máquina): `pnpm exec playwright install chromium`.
**Gate independiente**: el DESIGNER en Audit Mode ejecuta `pnpm verify:runtime` y vuelve a medir sin dar por
buena la evidencia del ENGINEER.

**Qué es comprobable en jsdom/happy-dom y qué exige navegador real**:
- **jsdom (Vitest)**: lógica de ellipsis/rango, saneado de params, roles/aria/atributos, `disabled`,
  manejadores de teclado, estados de fetch con mock, `aria-current`. jsdom **no calcula layout ni cascada CSS
  real**, así que no sirve para tamaños ni colores computados.
- **Navegador real (Playwright/Chromium)**: `scrollWidth` vs `clientWidth` (C1), `getBoundingClientRect`
  (B5 táctil), `getComputedStyle` de color/fondo para contraste (B5) y de `outline` para foco (B3),
  `prefers-reduced-motion` (B6), `prefers-color-scheme` (D8/D12/D17). Aporte: `@playwright/test` 1.63.0
  (+ binario Chromium, ~150 MB, descarga única).
- **No automatizable de forma razonable**: B4 (que un lector de pantalla anuncie de verdad). Procedimiento
  manual explícito: con VoiceOver (macOS, Cmd+F5), enfocar la paginación, cambiar de página y comprobar que
  se anuncia el texto de la región `aria-live` (`"Mostrando 11–20 de 200 resultados"`). Se documenta como
  paso manual del AUDIT; no se finge cobertura automática.

### 7.3 Validaciones explícitas pedidas por el kickoff

**(a) D8/D12 latentes y D17 — CONFIRMADO. ¿Es correcta la estrategia de theming?**
- Cadena causal verificada en `index.css`: `:root { background-color:#242424 }` (`:8`) y `body { background-color:#242424 }`
  (`:32`) están **fuera** de la media query; la media query clara (`:59-63`) solo redefine `:root` (`color:#e6e6e6`,
  `background:#fff`), nunca `body`. Como `body` tiene `min-height:100vh` (`:31`) y pinta su propio fondo, tapa el
  `#fff` del `html`. Resultado: en modo claro la app sigue oscura y el par roto `#e6e6e6/#ffffff` **no llega a
  renderizarse**. D8/D12 latentes ✅. D17 (modo claro inexistente) real ✅.
- Ratios medidos con la fórmula WCAG: `#e6e6e6` sobre `#ffffff` = **1.25:1** (el spec dice 1.28 — diferencia
  inmaterial), y sobre `#242424` = **12.44:1** (idéntico al baseline). Confirma el diagnóstico.
- **Estrategia de theming recomendada**: correcta la de tokens + `prefers-color-scheme`, con una condición:
  el `background-color` del `body` debe derivarse del token `--color-bg`, nunca hardcodearse. El design-spec §2.1/§2.2
  entrega ambas paletas y sus ratios; se adoptan tal cual. **Sin toggle manual** (fuera de scope §3 del Orchestrator).
  El `color-scheme: light dark` se conserva para que los controles nativos (selects, scrollbars) sigan el tema.

**(b) Umbral de ruptura D16 ≈518px — PARCIALMENTE CONFIRMADO / CORRECCIÓN.**
- El desborde es seguro: a 320px el contenido mide ~486px solo la barra, contra 320 disponibles. La afirmación
  de producto (desborda en todo móvil y tablet vertical) **se sostiene**.
- Pero **los números medidos son internamente inconsistentes**: `.pageNumbers = 486.4px` + un gutter de 32px
  (`#root padding:2rem`) da **518.4px**; el propio baseline reporta `scrollWidth = 550px` a 320px, que
  implicaría 486.4 + 64 (ambos gutters) = **550.4px**. No se puede cerrar "~518px" con esa evidencia.
- **Recomendación**: no fijar ningún umbral. El fix correcto es el modo compacto `<480px` del design-spec §5,
  que elimina los números y deja 4 botones ícono (`4×44 + 3×8 = 200px ≤ 288px` disponibles). Con eso, el valor
  exacto del breakpoint deja de ser crítico. El runner de §7.2 medirá el ancho real como parte de C1.
- Nit de trazabilidad: `docs/design-spec.md:24` atribuye la estimación de ~370px al "Architect"; el doc del
  Orchestrator la atribuye al Orchestrator y al Engineer. El dato real medido es 486.4px. Sin impacto técnico.

**(c) Ratios de contraste y algoritmo de ellipsis de `docs/design-spec.md` §2 y §3 — CONFIRMADOS.**
- **Contraste**: recalculé las 20 parejas de §2.1/§2.2 con la fórmula WCAG estándar. **20/20 dentro de ±0.06**
  del valor declarado (p. ej. border-default claro 4.83, text-primary claro 14.68, accent/subtle claro 5.49,
  accent-emphasis oscuro 6.97, danger oscuro 6.40, accent-subtle-bg vs página oscura 1.71). El uso del **borde**
  de 2px en el pill activo para no depender del relleno (1.71:1) es correcto. La paleta es apta AA.
- **Ellipsis**: implementé el pseudocódigo de §3 y lo ejecuté. **6/6 ejemplos literales coinciden**
  (`total=1,c=1`; `3,2`; `7,4`; `20,1`; `20,10`; `20,20`). Barrido exhaustivo de `total=1..200` × `current=1..total`:
  **0 violaciones** de las propiedades declaradas — la página actual siempre está presente, nunca hay `…`
  ocultando una sola página, nunca hay duplicados, el resultado está ordenado y nunca supera 7 slots.
  El umbral `total<=7` (sin ellipsis) es consistente con `boundaryCount=1`/`siblingCount=1`. Algoritmo apto
  para implementar tal cual, con esos casos como tests.

**(d) DEC-03 (`allowBuilds=false` para `@swc/core` y `esbuild`) — CORRECCIÓN.**
- La **intención** es correcta: minimizar scripts en install reduce superficie de supply chain.
- La **ejecución queda obsoleta** con el toolchain recomendado:
  - `npm view vite@8.3.0 dependencies` → `rolldown`, `lightningcss`, `postcss`, `picomatch`, `tinyglobby`.
    **`esbuild` ya no es dependencia**; es solo peer opcional. La entrada `esbuild` es inocua pero muerta.
  - `@swc/core` solo entra por `@vitejs/plugin-react-swc`. Con `@vitejs/plugin-react@6.1.1` **no se instala**,
    así que la entrada `@swc/core` también deja de aplicar.
  - Los binarios nativos del stack nuevo (`@tailwindcss/oxide` —si se adoptara—, `lightningcss`, `rolldown`,
    `@typescript/typescript-<plat>-<arch>`) llegan por `optionalDependencies` y **no declaran postinstall**;
    no necesitan permiso de build.
- **Recomendación**: actualizar `pnpm-workspace.yaml` en el paso 1: eliminar `esbuild`; eliminar `@swc/core`
  si se adopta `plugin-react` (recomendado); conservar `allowBuilds` como allowlist explícita para cualquier
  paquete futuro con script. Si el Orchestrator decide mantener `plugin-react-swc`, `@swc/core: false` sigue
  siendo correcto en macOS (el binario de plataforma viene por `optionalDependencies`, el postinstall no es
  necesario), con el matiz de que en Linux musl el postinstall es el que selecciona el binario correcto — otro
  motivo más para preferir `plugin-react`.

---

## 8. Decisiones que requieren aprobación del Orchestrator

1. **ESCALADA — paginación cliente vs servidor** (§3). Recomendación: cliente; servidor activa TanStack Query.
2. **Versión de TypeScript**: 5.9.3 (recomendada, `tsc`+`tsserver`, ecosistema) vs 7.0.2 (nativa, solo `tsc`, API `unstable`).
3. **React 18.3.1 → 19.3.0**: recomendado (bajo riesgo); no es requisito funcional.
4. **Vite 8 + `@vitejs/plugin-react` 6.1.1** (recomendado, elimina SWC) vs mantener `plugin-react-swc` 4.3.3.
5. **REJECT de Tailwind 4** (recomendado) frente a ADOPT. Si el Orchestrator quiere Tailwind, el spec de tokens
   ya está preparado para `@theme` y no hay que rehacer el diseño.
6. **oxlint + Prettier** (recomendado) frente a ESLint 9.39.5 + typescript-eslint (obliga a TS <6.1 y a fijar ESLint 9).
7. **Añadir `@playwright/test` + binario Chromium (~150 MB)** como dependencia de verificación (DEC-05).
8. **Actualizar DEC-03** (§7.3d).
9. **[AJUSTABLE] del design-spec**: lista de tamaños de página `10/20/50/100` (default 10) y ausencia de salto
   rápido en ≥480px. No bloquean; el Orchestrator puede vetarlos.

---

## 9. Criterios de aceptación de T-01 (auto-check)

- [x] `docs/architecture-analysis.md` existe y cubre las 7 secciones del brief (más el estado actual y las
      validaciones explícitas de §7.3).
- [x] Cada versión citada viene de `npm view`, con los comandos visibles (§1).
- [x] Cada tecnología tiene veredicto explícito ADOPT/REJECT anclado en este código (§2, §1).
- [x] La decisión cliente-vs-servidor queda marcada como `ESCALADA AL ORCHESTRATOR` (§3), no resuelta.
- [x] DEC-05: el método de verificación runtime es un script de `package.json` con servidor y navegador
      gestionados por el runner (§7.2); se declara qué no es automatizable (B4) con procedimiento manual.
- [x] `git status` sin cambios fuera de `docs/` (solo el archivo nuevo).
- [x] No se hicieron commits.

T-01 COMPLETE — docs/architecture-analysis.md listo para revisión del Orchestrator
