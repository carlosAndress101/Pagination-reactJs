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
| T-10 | Reescritura de la UI accesible (D1/D2/D3/D7/D11/D15, B1–B4) | ENGINEER | GATE 1 | BLOCKED |
| T-11 | Estilos y theming (D8/D9/D12/D16/D17, C1) | ENGINEER | T-10 | BLOCKED |
| T-12 | Andamiaje `verify:runtime` con Playwright (DEC-05) | ENGINEER | T-05 | BLOCKED |
| T-13 | Cierre: `pnpm verify` en verde + evidencia | ENGINEER | T-10..T-12 | BLOCKED |
| T-14 | **AUDIT MODE** — verificación independiente | DESIGNER | T-13 | BLOCKED |
| T-15 | Remediación de hallazgos P0/P1 | ENGINEER | T-14 | BLOCKED |
| T-16 | Validación final y veredicto | ORCHESTRATOR | T-15 | BLOCKED |

### Detalle de las tareas de la ola 1

**T-05 — Toolchain**
- Resultado esperado: `package.json` con scripts `dev/build/lint/format/typecheck/test/verify:runtime/verify`; `tsconfig.json` (strict + `noUncheckedIndexedAccess`, `noEmit`, `moduleResolution: bundler`) y `tsconfig.node.json`; `vite.config.ts`; `.oxlintrc.json`; `.prettierrc.json` + `.prettierignore`; `pnpm-workspace.yaml` actualizado. Los `.jsx` siguen siendo `.jsx` en este paso.
- AC: `pnpm build` verde · `pnpm lint` ejecuta oxlint · `pnpm format --check` pasa · `.eslintrc.cjs` eliminado · `@vitejs/plugin-react-swc` y `@swc/core` fuera del árbol de dependencias.
- Validación: pegar salida de `pnpm build`, `pnpm lint`, `pnpm exec tsc --version`, y `pnpm why @swc/core` (debe no encontrarlo).

**T-06 — Migración a TS strict**
- Resultado esperado: `main.tsx`, `App.tsx`, `components/Pagination.tsx`, `types.ts`. Sin `any`. D13 (estado muerto) y D6 (`==`, ternarios redundantes) corregidos. **Comportamiento idéntico** — los bugs D1/D2/D15 siguen vivos a propósito: se arreglan en T-10, no aquí.
- AC: `pnpm typecheck` verde · `pnpm lint` sin errores · `pnpm build` verde · cero `any` · cero `.jsx` en `src/`.
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
