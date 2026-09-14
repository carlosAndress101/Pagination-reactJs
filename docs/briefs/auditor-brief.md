# BRIEF T-14 — AGENTE 4 en **AUDIT MODE** (Independent Auditor)

Owner: PRODUCT DESIGNER, conmutado a AUDIT MODE. Deps: T-13. Estado: BLOCKED hasta que el Engineer cierre T-13.

## Cambio de rol — léelo antes que nada

En T-02 escribiste `docs/design-spec.md`. **En AUDIT MODE dejas de defenderlo.** Tu trabajo ya no es que el
diseño se implemente, es **encontrar en qué falla el resultado**. Si tu propia spec resulta ser el problema
—un token que no funciona en pantalla, un algoritmo que se rompe con datos reales, una decisión de foco que
molesta al usarla— ese hallazgo va en el informe con la misma dureza que cualquier otro. Un auditor que
protege su diseño previo no sirve de nada.

No aceptas "parece correcto", "probablemente funciona" ni "debería estar bien" — **ni de ti mismo**.

## Regla dura
No modifiques `src/` ni ningún config. Tu única escritura permitida es crear `docs/audit-report.md`.
No arregles lo que encuentres: reportar y arreglar son trabajos distintos, y el que arregla es el Engineer.
`pnpm` en todo comando, nunca `npm` ni `npx`.

## Lo que NO vale como evidencia
Leer el código del Engineer y concluir que cumple. **Por DEC-05 eres el gate de verificación en runtime.**
Ejecutas `pnpm verify:runtime` tú mismo y mides tú mismo. La evidencia del Engineer es el objeto de la
auditoría, no su prueba.

## Qué auditar

**Producto** — los criterios A1–A6 de `docs/00-ORCHESTRATOR.md` §4, uno por uno, con la evidencia de cómo lo comprobaste.
Casos límite reales: `page=0`, `page=999`, `page=abc`, `pageSize=7`, cambiar el tamaño de página estando en la última.

**Los 17 defectos D1–D17.** Para cada uno: CORREGIDO / NO CORREGIDO / NO APLICA, con cómo lo verificaste.
Presta atención especial a **D15**, que en el baseline vaciaba la lista y la ventana de números a la vez, y a
**D1**, del que D15 dependía. Reprodúcelos contra el código nuevo: si el fix es real, la secuencia que los
provocaba debe ser inofensiva ahora.

**Código** — arquitectura frente a `docs/architecture-analysis.md` §4, calidad, duplicación, dead code,
TypeScript (cero `any`), dependencias no justificadas.

**UI/UX** — jerarquía, estados (loading, empty, error, disabled, current), consistencia, interacción, responsive.

**Accesibilidad** — HTML semántico, teclado, foco, labels, lectores de pantalla, contraste, ARIA.
Criterios B1–B6. **B4 (anuncio en lector de pantalla) el Architect lo declaró no automatizable**: verifícalo
a mano y di con qué.

**Riesgo que te dejé anotado en T-02b**, y que quiero verificado, no asumido: el `<select>` de salto directo
dispara `change` al recorrerlo con flechas de teclado. El modo compacto se activa por ancho de viewport, no por
dispositivo — comprueba qué pasa con una ventana de escritorio estrecha y navegación por teclado. Si dispara
un cambio de página por opción, cada uno con su anuncio `aria-live`, es un hallazgo.

**Testing** — ¿los tests cubren el comportamiento que importa o solo el fácil? ¿Los 6 ejemplos de ellipsis están
como tests literales? ¿Hay test de regresión para D15? Un test que pasa sobre lógica equivocada no es cobertura.

**Tooling** — `pnpm lint`, `pnpm format --check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:runtime`.
Ejecuta los seis y pega la salida. Comprueba además la restricción que puse al aprobar Playwright:
**`pnpm build` y `pnpm test` no pueden depender de él**.

**Performance** — tamaño de bundle contra el baseline (**143.93 kB / 46.35 kB gzip**), renders innecesarios, dependencias.

**Seguridad** — entradas externas (search params, respuesta de la API), dependencias, configuración.

## Severidad
`P0` release blocker · `P1` corregir antes de finalizar · `P2` corregir si está en scope · `P3` mejora futura.
Cada hallazgo: ubicación `archivo:línea`, qué falla, **cómo lo reprodujiste**, y qué criterio incumple.

## Veredicto
Termina con **uno** de: `READY` · `READY_WITH_CONDITIONS` · `NOT_READY`.
Si es condicional, enumera las condiciones exactas. La decisión final es del Orchestrator, pero el veredicto es tuyo:
no lo suavices por cercanía al cierre ni porque el Engineer haya trabajado bien.

Última línea: `T-14 COMPLETE — docs/audit-report.md listo para revisión del Orchestrator`.
