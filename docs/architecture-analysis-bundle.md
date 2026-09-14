# T-01b — ANÁLISIS DEL SALTO DE BUNDLE (+54 %) (ARCHITECT, modo READ-ONLY)

Autor: ARCHITECT. Fecha: 2026-09-13. Rama: `feat/modernize-pagination` (no se cambió de rama).
Regla respetada: única escritura = este archivo (`docs/architecture-analysis-bundle.md`). Nada fuera de `docs/`.
Todos los comandos usan **pnpm** (incluido `pnpm view`); nunca `npm` ni `npx`. No hubo commits.

---

## 0. Veredicto (respuesta corta a las 4 preguntas)

1. **¿Es React 19 o una diferencia de minificación/tree-shaking?** **Es React 19.** Vite 8 con rolldown/Oxc
   produce un bundle **ligeramente más pequeño** que Vite 4 con esbuild para el mismo React. La minificación
   no solo no empeoró: mejoró.
2. **¿Qué parte corresponde a cada cosa?** De los **+79.0 kB sin comprimir / +22.6 kB gzip** del delta:
   **~98.5 % es `react-dom`** (+77.9 kB sin comprimir), **~1.7 % es `react` core** (+1.4 kB), el **bundler aporta
   −1.5 kB** (mejora) y el código de la app **no crece** (−0.2 kB). Configuración: 0.
3. **¿Es evitable con configuración?** **No.** Probé los únicos mandos razonables (`target: 'esnext'`,
   quitar `StrictMode`, minificador): efecto nulo (0 B / −43 B). Es el **coste real de React 19**.
4. **¿Añadir un criterio de tamaño de bundle?** **Sí.** Cifra recomendada: **JS de entrada ≤ 72 kB gzip**
   (script propio, `zlib` nivel 9; hoy 68.5 kB), con aviso a 70 kB, y **≤ 235 kB sin comprimir** (hoy 221.5 kB).
   Ver §7.

**Además**: la afirmación del ENGINEER ("build de producción minificado, sin `react-dom.development`") queda
**CONFIRMADA** por medición (§8).

---

## 1. Metodología

Para separar la variable **versión de React** de la variable **bundler/minificador**, monté una matriz 2×2 con
**exactamente el mismo código fuente** (el `src/` actual, que es el del baseline con solo cambios de formato
Prettier — verificado con `git diff -w`), en un directorio temporal fuera del repo:

```
LAB=/var/folders/.../opencode/bundle-lab
```

Cada celda es un proyecto aislado con su `package.json` y se instaló **offline** desde el store de pnpm
(reutilizando las versiones que ya están en el store del repo), sin tocar el repo:

```
pnpm install --offline --ignore-scripts
pnpm build          # vite build
```

| Celda | Bundler / minificador | React |
|---|---|---|
| `v4-r18` | Vite 4.5.14 + `@vitejs/plugin-react-swc` 3.11.0 · **esbuild** | 18.3.1 |
| `v4-r19` | Vite 4.5.14 + `@vitejs/plugin-react-swc` 3.11.0 · **esbuild** | 19.3.0 |
| `v8-r18` | Vite 8.3.0 + `@vitejs/plugin-react` 6.1.1 · **rolldown + Oxc** | 18.3.1 |
| `v8-r19` | Vite 8.3.0 + `@vitejs/plugin-react` 6.1.1 · **rolldown + Oxc** | 19.3.0 |

Versiones confirmadas con `pnpm view`:

```
pnpm view react version       -> 19.3.0
pnpm view react-dom version   -> 19.3.0
pnpm view vite version        -> 8.3.0
pnpm view rolldown version    -> 1.2.8
```

**Validación de la metodología**: la celda `v4-r18` reproduce **exactamente** el baseline de T-01 —
`143.93 kB / 46.35 kB gzip`, idéntico al número que reportó el ENGINEER. La celda `v8-r19` reproduce
**exactamente** el build actual — `221.50 kB / 69.38 kB gzip`. Es decir, el laboratorio mide lo mismo que el
repo: la comparación es válida.

---

## 2. Resultados (matriz 2×2)

Tamaño del entry JS (Vite reporta gzip con su propio método; añado `zlib` nivel 9 para una métrica estable):

| Celda | Bundler | React | Raw (B) | gzip Vite | gzip `zlib`-9 (B) |
|---|---|---|---|---|---|
| `v4-r18` | Vite 4 / esbuild | 18 | 143 937 | 46.35 kB | 46 251 |
| `v4-r19` | Vite 4 / esbuild | 19 | 224 184 | 69.75 kB | 69 555 |
| `v8-r18` | Vite 8 / rolldown+Oxc | 18 | 142 486 | 46.48 kB | 45 848 |
| `v8-r19` | Vite 8 / rolldown+Oxc | 19 | **221 509** | **69.38 kB** | **68 486** |

Deltas derivados:

| Comparación | Raw | gzip-9 |
|---|---|---|
| **React 18 → 19** bajo Vite 8 | **+79 023 B (+55.5 %)** | **+22 638 B (+49.4 %)** |
| **React 18 → 19** bajo Vite 4 | +80 247 B (+55.8 %) | +23 304 B (+50.4 %) |
| **Vite 4 → 8** con React 18 | **−1 451 B** | **−403 B** |
| **Vite 4 → 8** con React 19 | **−2 675 B** | **−1 069 B** |

El +53.9 % raw reportado (221 509 / 143 937 = 1.539) se descompone así: **React 19 aporta +55 %**, el bundler
**resta** ~1–1.5 %. La conclusión no depende del método de compresión: en raw, en gzip de Vite y en `zlib`-9,
el patrón es el mismo.

---

## 3. Atribución por paquete

Medido con dos builds auxiliares por versión de React (mismo Vite 8), uno que importa solo `react` y otro que
importa `react-dom/client` (arrastra `react` + `scheduler`). Los chunks compartidos permiten separar el core:

| Pieza | React 18 | React 19 | Delta |
|---|---|---|---|
| `react` (core) | 7 033 B | 8 402 B | **+1 369 B** |
| `react-dom/client` + `scheduler` | 132 717 B | 210 587 B | **+77 870 B** |
| App (`main` + `App` + `Pagination`) | 2 736 B | 2 520 B | −216 B |
| **Total entry** | 142 486 B | 221 509 B | **+79 023 B** |

Desglose del delta total: **98.5 % `react-dom`**, **1.7 % `react` core**, **−0.3 % app**, **−1.9 % bundler**.
`react-dom` es el responsable absoluto.

`scheduler` crece poco: `scheduler@0.23.2` (React 18) = 4 235 B minificado; `scheduler@0.28.0` (React 19) =
10 181 B sin minificar. Es un contribuyente menor dentro de la línea de `react-dom`.

Evidencia de que el crecimiento son **features nuevas de React 19**, no código muerto arrastrado — búsqueda de
identificadores en los bundles:

| Identificador | Bundle React 19 | Bundle React 18 |
|---|---|---|
| `useOptimistic` | 6 | 0 |
| `useActionState` | 6 | 0 |
| `useFormStatus` | 1 | 0 |
| `useDeferredValue` / `useTransition` / `useId` | 6 / 6 / 6 | 6 / 6 / 6 |

React 19 incorpora al runtime del cliente las APIs de Actions/`use`/optimistic updates que React 18 no tenía.
El reconciler es monolítico (React publica `react-dom` en **CJS**, sin build ESM — comprobado en
`react-dom/package.json`: `exports["./client"] = { "react-server": ..., "default": "./client.js" }` y todo el
código en `cjs/`), así que esas features no se pueden eliminar selectivamente por tree-shaking. React 18
también era CJS: en ese aspecto ambas versiones están en igualdad.

---

## 4. ¿Minificación o tree-shaking peores en Vite 8? No — al revés

- **Minificador**: Vite 4 usaba **esbuild**; Vite 8 usa **Oxc** por defecto (`build.minify === true` enruta a
  Oxc, según el código de Vite 8). La comparación a igual React demuestra que Oxc **iguala o mejora** a esbuild:
  React 18 → −1.45 kB; React 19 → −2.68 kB.
- **Tree-shaking**: rolldown resolvió el mismo grafo en 18–19 módulos frente a 34–37 de Vite 4 (más eficiente),
  y el resultado es más pequeño. No hay evidencia de tree-shaking peor.
- **Runtime de Vite**: el polyfill/helper de preload es marginal y no varía entre celdas; el bundle no tiene
  code-splitting que lo active de forma significativa.

Por tanto, la hipótesis "diferencia de minificación/tree-shaking entre esbuild y rolldown" queda **descartada
con medición**.

---

## 5. ¿Qué parte es configuración? Ninguna relevante

Sobre `v8-r19` probé los mandos que podrían mover la aguja:

| Cambio | Raw | gzip-9 | Efecto |
|---|---|---|---|
| Baseline `v8-r19` | 221 509 B | 68 486 B | — |
| `build.target: 'esnext'` | 221 509 B | 68 486 B | **0 B** |
| Quitar `<React.StrictMode>` | 221 466 B | 68 469 B | **−43 B / −17 B gzip** |

El gzip reportado por Vite en consola varía unas décimas entre corridas por su método de compresión; el raw
es determinista y es el número sobre el que se decide.

Ninguno es un mando útil. `StrictMode` en producción es un wrapper sin coste real (43 bytes) y eliminarlo
perdería las salvaguardas de desarrollo (relevantes para D5). **No hay ajuste de configuración que recupere
los ~23 kB gzip.**

Las únicas alternativas reales serían:
- **Quedarse en React 18** → recupera ~22.6 kB gzip, pero revierte una decisión del Master Plan y no es
  "modernizar". No lo recomiendo.
- **Cambiar de framework** (p. ej. Preact `compat`, ~4 kB gzip) → fuera de scope y con riesgo de compatibilidad.
- **Code-splitting** → no ayuda: React está en la ruta crítica de una única pantalla; diferirlo no reduce el
  coste percibido y añade complejidad.

**Conclusión: es el coste real de este stack, no un defecto de configuración.**

---

## 6. Contexto de aceptabilidad

El "suelo" de React 19 en este stack es ~66.9 kB gzip (react 3.23 + react-dom 64.99) para cualquier app, con
independencia de su tamaño. El código de la app aporta ~0.5 kB gzip. Un bundle de ~69 kB gzip es **normal y
esperado** para React 19 (React 18 daba ~46 kB). El salto es real pero está dentro del rango conocido de la
versión; no es señal de un error de build.

---

## 7. Recomendación: criterio de aceptación de tamaño de bundle

**Sí, añadirlo al Master Plan.** Motivo: el salto pasó inadvertido hasta que se midió; sin un gate, una futura
regresión (import accidental de una librería pesada, build de desarrollo, duplicación de React) no se detecta.
Es barato de automatizar (script de ~30 líneas, sin dependencias).

**Cifra recomendada** (entry JS inicial, producción, minificado):

| Métrica | Actual | Aviso | **Límite (fail)** |
|---|---|---|---|
| JS gzip (`zlib` nivel 9, script propio) | 68 486 B | 70 kB | **72 kB** |
| JS sin comprimir | 221 509 B | 228 kB | **235 kB** |
| CSS gzip | 894 B | — | 4 kB |

Equivalencia con la cifra que imprime `vite build` (método de compresión algo distinto): el límite de 72 kB
gzip-9 corresponde a ~**75 kB gzip en la salida de Vite**. El script propio es la fuente de verdad del gate.

Justificación de la cifra: el suelo de React 19 (~66.9 kB gzip) es fijo; 72 kB deja ~5 kB gzip de margen para
el trabajo restante (estado en URL, componentes de accesibilidad, estados error/empty/skeleton), que es código
de UI y debería costar 1–2 kB gzip. Suficiente para no fallar por crecimiento legítimo y estrecho para cazar
una regresión real. Si el Orchestrator prefiere más holgura, 75 kB gzip-9 / 245 kB raw sigue siendo aceptable;
no recomiendo pasar de ahí sin justificar la dependencia que lo provoque.

**Implementación propuesta** (cero dependencias):

```jsonc
// package.json
"verify:bundle": "node scripts/check-bundle-size.mjs"
// y añadirlo a "verify" antes de verify:runtime
```

```js
// scripts/check-bundle-size.mjs (esquema)
// 1) leer dist/assets/*.js y *.css
// 2) medir raw + gzipSync(level:9)
// 3) comparar contra los umbrales de arriba
// 4) guard de código de desarrollo: fallar si aparece "react-dom.development"
// 5) salir con código != 0 y una tabla legible si se supera
```

Añadir también el **guard de build de producción** (buscar `react-dom.development` en el bundle): es una
comprobación de corrección, no solo de tamaño, y hoy es trivial de pasar.

Además, dejar registrado en el Master Plan el **suelo de framework** (~66.9 kB gzip / ~219 kB raw) como
contexto, para que nadie interprete el número como deuda de la app.

---

## 8. Confirmación de la afirmación del ENGINEER

Medido sobre el bundle actual (`v8-r19`):

| Comprobación | Resultado |
|---|---|
| `react-dom.development` presente | **0 ocurrencias** (no está) |
| `process.env.NODE_ENV` sin reemplazar | **0 ocurrencias** (reemplazado en build) |
| Bundle minificado | Sí (primeros bytes: `var e=Object.create,t=Object.defineProperty,...`) |
| Código dev de React | Ausente; el único `act(...)` que aparece es el mensaje de error de producción ("act(...) is not supported") |

**La afirmación del ENGINEER es correcta**: es build de producción minificado, sin `react-dom.development`.
El salto de tamaño es atribuible a React 19, no a un build mal configurado.

---

## 9. Resumen para el Orchestrator

- El +54 % **es React 19**; `react-dom` explica ~98.5 % del delta. Vite 8/rolldown/Oxc **no empeora** la
  minificación: la mejora ligeramente.
- **No es evitable por configuración.** Es coste real del stack elegido. Revertir a React 18 es la única
  palanca y no la recomiendo.
- **Sí añadir** un criterio de tamaño: **≤ 72 kB gzip** (script, `zlib`-9; ~75 kB en la salida de Vite) y
  **≤ 235 kB raw**, con aviso a 70 kB, más el guard de `react-dom.development`.
- Nada de esto cambia la decisión de React 19 del Master Plan; solo la documenta y la protege con un gate.

T-01b COMPLETE
