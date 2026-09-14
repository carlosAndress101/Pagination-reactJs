# AUDIT REPORT — T-14 (AUDIT MODE, verificación independiente)

Autor: PRODUCT DESIGNER, en Audit Mode. Todo lo marcado "medido" en este informe se ejecutó en esta sesión,
en esta máquina, contra el árbol real de `feat/modernize-pagination` — no se da por buena ninguna afirmación
del Engineer ni del Architect sin volver a medirla. Donde no pude medir algo (una: B4 por oído), lo digo explícitamente
en vez de fingir cobertura.

No defiendo `docs/design-spec.md`. Donde mi propio diseño falla, está abajo con la misma dureza que cualquier otro hallazgo.

---

## 0. Resumen ejecutivo

`pnpm verify` da **exit 0**, reproducido por mí de forma independiente: 122 tests unitarios, 145 de navegador,
15 saltados con motivo, lint/format/typecheck/build limpios, bundle dentro de presupuesto. Los 18 defectos
declarados (D1–D18) están corregidos y los reproduje uno a uno, no solo leí el código. El control espejo de foco
(T-02c) y el clamp de D15 los verifiqué en vivo con scripts propios de Playwright, no solo re-ejecutando el test
suite del Engineer. El modo claro (D8/D17) renderiza de verdad — lo medí yo, no confié en el comentario del CSS.

No encontré ningún **P0**. Encontré cuatro cosas que no cierran del todo limpias: una verificación de B4 que
ni yo ni nadie en este proyecto ha hecho realmente por oído, un hueco de cobertura de test justo en el rango que
DEC-14 dice haber resuelto, unas capturas de README que muestran un producto que no existe, y un riesgo de
teclado que no logré reproducir pese a intentarlo en dos modos de navegador. Ninguna es un blocker funcional.

**Veredicto: READY_WITH_CONDITIONS.** Condiciones al final (§10).

---

## 1. Producto — criterios A1–A6

| # | Criterio | Verificación | Resultado |
|---|---|---|---|
| A1 | Lista paginada de 200 ítems, tamaño seleccionable | `PaginationScreen.test.tsx`, navegador real (`states.spec.ts`), y mi propio script cruzando las 4 combinaciones de `pageSize` | ✅ |
| A2 | First/prev/next/last + ellipsis, `disabled` en límites | `pagination.test.ts` (barrido 20 100 combinaciones, 0 violaciones), y reproducción propia en navegador clicando hasta el límite en ambos sentidos | ✅ |
| A3 | Cambiar tamaño no deja página inexistente | Fórmula de anclaje DEC-07 + mi reproducción en vivo de las 12 transiciones de tamaño en la última página de cada uno (ver §2, D15) | ✅ |
| A4 | loading/error(retry)/empty reales | `states.spec.ts`, `reduced-motion.spec.ts` (altura estable), inspección visual propia | ✅ |
| A5 | `page`/`pageSize` en la URL, back/forward | `usePaginationParams.test.ts` (popstate, sin bucles de historial) + `states.spec.ts` en navegador real | ✅ |
| A6 | `page=0/999/abc`, `pageSize=7` saneados | `params.test.ts` (tabla exhaustiva: `page=0x10`, `Infinity`, `+5`→` 5`→5, `005`→5, etc.) + `PaginationScreen.test.tsx` | ✅ |

Nota sobre A6: la cobertura de `params.test.ts` va más allá de los 4 casos mínimos pedidos (notación exponencial,
enteros no seguros, `null`/`undefined` literales como texto) — es más exhaustiva de lo que exige el criterio, no menos.

---

## 2. Defectos D1–D18

Reproducidos, no solo leídos. Donde "reproduje" dice navegador real, es un script propio de Playwright contra
el build de producción servido con `vite preview`, independiente de `e2e/`.

| # | Estado | Cómo lo verifiqué |
|---|---|---|
| D1 | **CORREGIDO** | `getPageRange(current, total)` recalcula la ventana entera en cada llamada a partir de `current`/`total` reales; no hay estado derivado que desincronizar. Barrido `total=1..200 × current=1..total` en `pagination.test.ts`, 0 fallos. |
| D2 | **CORREGIDO** | El `…` es `<span aria-hidden="true">`, sin `onClick`, sin rol interactivo (`PaginationControls.tsx:131`). Confirmado en `PaginationScreen.test.tsx` y leyendo el componente. |
| D3 | **CORREGIDO** | Números son `<button type="button">` reales. Confirmado por lint (`jsx-a11y` en verde) y `PaginationScreen.test.tsx`. |
| D4 | **CORREGIDO** | `TodoList.tsx:15` usa `key={todo.id}`. |
| D5 | **CORREGIDO** | `useTodos` con `AbortController` + petición compartida en vuelo (`useTodos.ts:26-44`). Medido en vivo: **1 sola llamada** a la API al cargar (mi script, `apiRequestsTotal: 1`), y `useTodos.test.tsx` prueba el dedupe de StrictMode en dev (2 montajes → 1 fetch). |
| D6 | **CORREGIDO** | Cero `==` en el árbol (`eqeqeq` de oxlint en `error` category, 0 errores de lint). `disabled` se deriva de `currentPage<=1` / `currentPage>=totalPages`, nunca de `pages[0]` (`PaginationControls.tsx:39-40`). |
| D7 | **CORREGIDO** | No existe "Load More"; el tamaño de página se cambia con un `<select>` real (`PageSizeSelect.tsx`). |
| D8 | **CORREGIDO** (era LATENTE) | Medí el modo claro yo mismo: `body` computa `background-color: rgb(255,255,255)` y texto `rgb(31,41,55)`, contraste **14.68:1** — el tema claro renderiza de verdad, no es el mismo fondo oscuro tapándolo. |
| D9 | **CORREGIDO** | `App.css`, `style/style.css`, `react.svg`, `vite.svg` ya no existen (`git status`/`find` limpios). Cero referencias a `logo-spin`/`read-the-docs`/"Vite + React". |
| D10 | **CORREGIDO** | `.eslintrc.cjs` fuera del árbol; oxlint con reglas `jsx-a11y` explícitas (`click-events-have-key-events`, `label-has-associated-control`, `tabindex-no-positive`, etc.) + `eqeqeq`. `pnpm lint` → 0 errores. |
| D11 | **CORREGIDO** | Una sola regla `:focus-visible` global (`index.css:138-145`), nunca retirada sin reemplazo. Confirmado en navegador real (`focus.spec.ts`, todos los controles con anillo visible) y por mí mismo tabulando manualmente vía script. |
| D12 | **CORREGIDO** | Cero colores literales fuera de la definición de tokens en `:root`/`@media(dark)`; todo el resto usa `var(--color-*)`. Grep propio sobre `index.css` sin hallazgos. |
| D13 | **CORREGIDO** | No existe tal estado en el código nuevo (ya cerrado en T-06 según Master Plan, confirmado por ausencia). |
| D14 | **CORREGIDO** | `onClick={() => onGoTo(slot)}` (`PaginationControls.tsx:143-145`); cero `id` numéricos en el DOM, confirmado por test y por inspección propia del render. |
| D15 | **CORREGIDO, reproducido end-to-end** | Fórmula de anclaje DEC-07. Reproduje **las 12 transiciones** de tamaño (10↔20↔50↔100) estando en la última página de cada tamaño de origen, en navegador real contra el build de producción: las 12 aterrizan en una página con ítems y resumen coherente, cero casos rotos. Ver tabla completa en el log de la sesión; ninguna transición vacía la lista. |
| D16 | **CORREGIDO** | `layout.spec.ts` en 5 viewports (320/375/414/768/1280), 0 overflow, en ambos esquemas de color. Amplié yo mismo el barrido a 480/500/540/600/650/700/767/800/900/1024: overflow siempre 0. Ver también DEC-14 en §6 — hay un matiz que corrijo ahí. |
| D17 | **CORREGIDO** | Mismo dato que D8: medido en vivo, el modo claro pinta blanco de verdad. `color-scheme: light dark` se mantiene para controles nativos. |
| D18 | **CORREGIDO** | `index.html:2` → `<html lang="es">`. |

**D1–D18: 18/18 corregidos, con evidencia propia además de la del Engineer.**

---

## 3. Código — arquitectura, calidad, dependencias

- **Árbol vs. `docs/architecture-analysis.md` §4**: coincide. Única adición no listada en el árbol objetivo:
  `components/PageJumpSelect.tsx` — justificada, nació de T-02b/T-02c (posteriores al informe del Architect) y
  está donde el propio design-spec dice que debe estar (entre "Anterior" y "Siguiente").
- **Dependencias de producción**: `react` + `react-dom`, las mismas dos que al empezar. `pnpm audit --prod`
  (ejecutado por mí): **sin vulnerabilidades conocidas**.
- **TypeScript**: `grep -rn ': any\|as any' src/` vacío. `pnpm typecheck` verde en `tsconfig.json` y `tsconfig.node.json`.
- **Dead code / plantilla (E1)**: cero restos de Vite, cero `console.log`/`debugger`, cero `TODO`/`FIXME` reales
  (los dos falsos positivos son `TODOS_URL` y la palabra "METODO" sin tilde, verificado a mano).
- **Abstracciones**: no encuentro ninguna prematura. `lib/pagination.ts` y `lib/params.ts` son funciones puras
  del tamaño justo; no hay capa de estado global, ni router, ni fetch library — coherente con el scope de una
  sola pantalla.
- **D4 técnico (dependencias justificadas)**: juicio, no comando. Cada rechazo (Tailwind, TanStack Router/Query,
  Zod, oxfmt) está documentado con motivo propio en `architecture-analysis.md` §2 y ratificado en el Master Plan.
  No veo ninguna dependencia "porque es moderna". **Satisfecho.**

---

## 4. UI/UX

Jerarquía clara (título → resumen+selector → contenido → nav), estados completos y sin salto de altura entre
ellos (medido por `reduced-motion.spec.ts`: diferencia <1px entre loading y cargado para pageSize 10/20/50).
Consistencia de tokens verificada leyendo `index.css` completo: un solo lugar de verdad para color, espaciado,
tipografía y radios. La página actual usa relleno + borde de 2px (no solo relleno) precisamente para no depender
de un contraste que en modo oscuro no llega a 3:1 por sí solo — decisión correcta y ya verificada en el spec.

Un hallazgo de presentación, no de la aplicación en sí: ver **H3** en §9.

---

## 5. Accesibilidad — B1–B6

| # | Criterio | Verificación |
|---|---|---|
| B1 | `<nav aria-label>`, `<button>` reales | Confirmado por lectura + `PaginationScreen.test.tsx` + lint `jsx-a11y`. |
| B2 | `aria-current="page"` única | `focus.spec.ts` en navegador real, y test unitario tras click. |
| B3 | Teclado completo, `:focus-visible`, foco estable | Ver **H1** abajo: lo reproduje yo mismo con tres métodos distintos, los tres sin pérdida de foco. |
| B4 | Anuncio a lector de pantalla | Ver **H4** — verificación parcial, límite honesto de mi entorno. |
| B5 | Contraste AA + táctil ≥44px | `contrast.spec.ts` + `touch-targets.spec.ts`, navegador real, ambos esquemas. Sin hallazgos. |
| B6 | `prefers-reduced-motion` | `reduced-motion.spec.ts`: shimmer se apaga, transiciones de color se mantienen, cero `transform`/`translate`/`top`/`left`/`margin` en las transiciones del árbol. |

### H1 — Control espejo de foco (T-02c), verificado por mí en vivo

Escribí un script propio de Playwright (no `e2e/focus.spec.ts` del Engineer) contra el build de producción y
probé **tres métodos de interacción** distintos:

1. Clic con ratón en "Siguiente" 19 veces seguidas hasta la página 20 (límite), comprobando el foco tras
   **cada** clic, no solo el último: el foco se queda en "Siguiente" en los pasos 1–18, y en el paso 19 —cuando
   "Siguiente" se deshabilita— salta a **"Página anterior"**. Nunca cae en `body`.
2. Simétrico con "Anterior" desde la página 20 hasta la 1: salta a **"Página siguiente"** exactamente al llegar
   al límite.
3. Clic directo en "Última" (`focus → Primera`) y luego en "Primera" (`focus → Última`), sin pasar por los
   intermedios.
4. Solo teclado: `Tab` hasta "Siguiente", luego `Enter` repetido 19 veces — mismo resultado que 1, foco nunca
   perdido.

**Confirmado: el control espejo funciona en los cuatro escenarios, en un navegador real, no solo en el test que
lo afirma.** Esto cierra el conflicto 1 de T-02c con evidencia propia, no con la palabra del Engineer.

### H4 — B4, límite honesto de esta auditoría

El Architect declaró B4 "no automatizable de forma razonable" y pidió verificación manual con VoiceOver.
**No tengo forma de operar el motor de voz de VoiceOver desde este entorno** — no dispongo de una herramienta que
controle o escuche audio del sistema operativo. Sería deshonesto escribir "lo confirmé con VoiceOver" sin haberlo
hecho, así que no lo hago.

Lo que sí hice, como evidencia sustitutiva (no equivalente, sustitutiva): inspeccioné el árbol de accesibilidad
real de Chromium vía CDP (`Accessibility.getPartialAXTree`) sobre el nodo `[aria-live]`, antes y después de un
cambio de página. En ambos momentos el nodo expone correctamente:
```
role: paragraph
properties: live=polite, atomic=true, relevant="additions text"
```
Esto confirma que el motor de accesibilidad del navegador — la capa de la que VoiceOver lee — recibe la señal
correcta. Es la evidencia automatizable más fuerte disponible, pero **no es lo mismo que confirmar que VoiceOver
lo pronuncia**; esa última milla depende del motor de voz del sistema operativo, fuera del alcance de mis
herramientas. Lo dejo como condición en §10, no como un ✅.

---

## 6. Hallazgos — DEC-14 (flex-wrap 480–767px), ratificado con corrección de cifras

Medí el punto de ruptura real con un script propio (ancho de `.pagination__list` necesario vs. disponible,
número de filas por posición `top` de cada control visible), en vez de fiarme de la aritmética de DEC-14:

| Ancho viewport | Filas | Ancho necesario (una fila) | Ancho disponible |
|---|---|---|---|
| 480px | **2** | 507px | 448px |
| 500px | **2** | 507px | 468px |
| **540px** | **1** | 507px | 508px |
| 600–1024px | 1 | 507px | 568–720px |

**Ratifico la solución** (envolver en vez de desbordar): visualmente limpia, sin overlap, centrada, cero scroll
horizontal en ningún ancho probado (480 a 1024px). Pero corrijo dos cifras de DEC-14:

1. El ancho realmente necesario es **507px**, no los 520px estimados (11×40 + 10×8) — diferencia menor, sin
   consecuencia práctica.
2. **El rango real donde se envuelve es 480–539px, no "480–767px"** como enmarca la decisión. A partir de 540px
   ya cabe todo en una fila. Esto no es un defecto de la solución — envolver sigue siendo correcto en ese rango
   angosto — pero la decisión tal como está redactada exagera el alcance del problema que resuelve.
3. **Hueco de cobertura real, este sí importa**: los proyectos de `playwright.config.ts` son
   `320/375/414/768/1280` — **ninguno cae dentro de 480–539px**, que es el único rango donde el wrap ocurre de
   verdad. `layout.spec.ts` nunca ha ejercitado el escenario que DEC-14 dice resolver. Lo verifiqué yo ahora
   porque nadie más lo había hecho con una medición, ni el Engineer ni el Architect: es exactamente el patrón que
   DEC-04 ("medir, no estimar") pide evitar, y se repitió una vez más.

Ver **H2** en severidad.

---

## 7. Otro hallazgo pedido — riesgo del `<select>` de salto directo con flechas

Intenté reproducir el riesgo que dejé anotado en T-02b: que recorrer el `<select>` de salto directo con flechas
del teclado dispare un `change` (y por tanto una navegación) por cada opción, en una ventana de escritorio
angosta (el modo compacto se activa por ancho de viewport, no por tipo de dispositivo).

Probé en esta máquina (macOS, Chromium 1.63.0 vía Playwright) con **dos métodos**:
1. `ArrowDown` × 5 con el `<select>` enfocado y el desplegable cerrado.
2. `Space` (abrir desplegable) → `ArrowDown` × 3 → `Enter`.

**En ambos casos, 0 eventos `change`, en modo headless y en modo con ventana real (`headless: false`).** El valor
del `<select>` no cambió ni una vez; la URL y el resumen se mantuvieron en la página 1 durante todo el intento.

No puedo cerrar esto como "no es un problema": el comportamiento de `<select>` con teclado es conocido por variar
entre Windows/Linux y macOS en Chrome (en Windows, un `<select>` enfocado con el desplegable cerrado sí suele
cambiar de valor y disparar `change` por cada pulsación de flecha, sin necesidad de abrir el desplegable — es un
patrón documentado ampliamente fuera de este proyecto). En macOS no lo reproduje pese a intentarlo de dos formas
distintas. **Queda como riesgo no confirmado ni descartado**, dependiente de plataforma — ver condición en §10.

---

## 8. Screenshots del README — dato inventado, no el dato real

`scripts/screenshots.mjs:19-46` define 20 títulos de tarea en español profesional ("Cerrar las incidencias
duplicadas", "Auditar las dependencias del proyecto"...) y los usa para generar las 4 capturas de `screenshots/`.
La aplicación real consume `jsonplaceholder.typicode.com/todos`, que devuelve textos en pseudo-latín
("delectus aut autem", etc.) — nunca esas frases.

El motivo técnico (datos fijos para capturas deterministas, en vez de la red real) es correcto y lo comparto:
depender de la red real haría las capturas no reproducibles. Pero **la solución no tenía que inventar contenido**:
la respuesta real de JSONPlaceholder para `/todos` es en sí misma estática — el propio Engineer podría haber
fijado (`route.fulfill`) una copia real de esa respuesta y conseguir exactamente la misma determinismo sin mostrar
un producto ficticio. Tal como está, quien abra el README ve una pantalla que la aplicación desplegada nunca
va a mostrar. Para una "demo profesional" cuyo objeto es parecer real (§3 de `00-ORCHESTRATOR.md`), esto pesa.

Visualmente la captura en sí es correcta y representativa del diseño (tipografía, espaciado, foco, página
actual) — el problema es solo el contenido de los datos, no el layout ni el estilo.

---

## 9. Testing — ¿cubre lo que importa?

- Los **6 ejemplos literales** del design-spec §3 están como tests exactos, más 2 casos de borde del umbral
  (`total=8`) y un barrido de **20 100 combinaciones** (`total=1..200 × current=1..total`) verificando 6
  invariantes (actual siempre presente, ≤7 slots, ningún hueco de una sola página, orden, extremos correctos,
  nunca dos huecos seguidos). Esto no es "el caso fácil": es más cobertura de la que pedí en el spec.
- **Regresión de D15**: existe como test dedicado (`PaginationScreen.test.tsx:280-297`) y la reproduje yo mismo
  en vivo contra las 12 transiciones posibles, no solo las que el test cubre.
- **B3 (foco)**: cubierto en jsdom (`user-event`, con el matiz correcto de que jsdom no reproduce la pérdida de
  foco por `disabled`) y en Playwright (navegador real, que sí la reproduce). Los dos niveles están donde deben
  estar según §7.2 del Architect.
- Un test que pasa sobre lógica equivocada: no encontré ninguno. Los tests de propiedades (`pagination.test.ts`)
  afirman sobre invariantes matemáticas del algoritmo, no sobre implementación — son del tipo que sí detectaría
  una regresión futura, no solo el comportamiento actual congelado.
- **Hueco real**: ninguna prueba automática cubre el rango 480–539px (ver §6). Es el único hueco de cobertura
  que encontré que no esté ya declarado como tal por el Architect.

---

## 10. Tooling — evidencia ejecutada

Todo lo siguiente lo ejecuté yo, en esta sesión, contra el árbol actual:

```
$ pnpm lint          → 0 errores (oxlint)
$ pnpm format        → "All matched files use Prettier code style!"
$ pnpm typecheck     → limpio (tsconfig.json + tsconfig.node.json)
$ pnpm test          → 6 test files, 122 tests, todos en verde
$ pnpm build         → dist/assets/index-*.js 227.34 kB / gzip 71.34 kB (cifra de Vite, no la del presupuesto)
$ pnpm verify:size   → JS gzip(9) 70415 B (aviso 72000, límite 75000) — ok
                       JS sin comprimir 227348 B (límite 235000) — ok
                       CSS gzip(9) 1909 B (límite 4000) — ok
$ pnpm verify:runtime → 160 tests declarados, 145 pasados, 15 saltados, 0 fallos
$ pnpm audit --prod  → "No known vulnerabilities found"
```

`pnpm verify` completo: **exit 0**, reproducido de punta a punta. Las cifras de bundle coinciden byte a byte
con las que reportó el Orchestrator en GATE 2 (70 415 B / 1 909 B) — no hay divergencia entre lo que él vio y lo
que yo veo ahora.

Restricción de DEC-anterior verificada: `pnpm build` y `pnpm test` no invocan Playwright en ningún punto de su
cadena de scripts (`package.json`) — confirmado leyendo `package.json`, no solo por el enunciado.

---

## 11. Performance

Bundle dentro de presupuesto (§10). Sin renders innecesarios evidentes: `PaginationScreen` no memoiza nada
porque no lo necesita — no hay listas gigantes recalculándose por render aparte del `slice()` de 10–100 ítems,
trivial. `getPageRange` es `O(1)` en el peor caso relevante (≤7 slots), se llama en cada render pero es barato.
Sin dependencias nuevas que pesen: la única librería runtime sigue siendo React.

---

## 12. Seguridad

- Entradas externas: `page`/`pageSize` de la URL pasan por `parseParams` (saneado estricto, whitelist de
  tamaños) antes de usarse — no hay inyección posible vía query string.
- Respuesta de la API: `isTodo()` valida forma exacta antes de aceptar el payload (`api.ts:13-22`); una
  respuesta con forma inesperada se rechaza como `TodosError`, no se renderiza a ciegas.
- Cero `dangerouslySetInnerHTML`, `eval`, `new Function` en el árbol (grep propio, sin resultados) — el título
  de cada tarea se renderiza como texto JSX, escapado por React por defecto. Sin superficie de XSS.
- `pnpm audit --prod`: sin vulnerabilidades conocidas en las dependencias de producción.

---

## 13. Hallazgos — severidad

| # | Severidad | Resumen | Ubicación | Repro |
|---|---|---|---|---|
| H1 | — (confirma, no es hallazgo) | Control espejo de foco funciona en navegador real, 4 métodos de interacción | `PaginationControls.tsx:73-85` | §5 H1 |
| H2 | **P2** | El rango 480–539px donde ocurre el `flex-wrap` de DEC-14 no tiene ninguna cobertura de `e2e/`: los 5 proyectos de Playwright saltan de 414 a 768px. Nadie había medido el punto de ruptura real (507px necesarios) hasta esta auditoría. | `playwright.config.ts:43-49`, `e2e/layout.spec.ts` | Script propio, ver §6 |
| H3 | **P2** | Las 4 capturas de `screenshots/` (y por tanto el README) muestran 20 títulos de tarea inventados en español profesional; la aplicación real, contra JSONPlaceholder, nunca muestra ese texto. Presenta un producto que no existe. | `scripts/screenshots.mjs:19-46` | Lectura directa + captura adjunta en §8 |
| H4 | **P2 (condición)** | B4 no tiene ninguna confirmación audible real — ni del Architect, ni del Engineer, ni de esta auditoría. La causa es una limitación de herramientas (ningún agente de este proyecto puede operar VoiceOver), no un defecto conocido. La evidencia de árbol de accesibilidad (CDP) es fuerte pero no equivalente. | — | §5 H4 |
| H5 | **P3** | El `<select>` de salto directo, recorrido con flechas de teclado en una ventana de escritorio angosta, es un riesgo teóricamente real (comportamiento documentado de Chrome en Windows/Linux) que no logré reproducir en macOS/Chromium, en modo headless ni con ventana real. Sin verificar en la plataforma donde sí es conocido. | `PageJumpSelect.tsx` | §7 |
| H6 | **P3** | DEC-14 documenta el ancho necesario como "520px" y el rango afectado como "480–767px"; medido: 507px y 480–539px respectivamente. Sin efecto práctico, es una corrección de cifra en la documentación. | `docs/01-MASTER-PLAN.md` (DEC-14) | §6 |

**P0: 0. P1: 0.**

---

## 14. Veredicto

## READY_WITH_CONDITIONS

La implementación es sólida: 18/18 defectos corregidos y reproducidos por mí de forma independiente, `pnpm verify`
en verde reproducido byte a byte, cero `P0`/`P1`, arquitectura fiel al informe del Architect, seguridad limpia,
testing que cubre invariantes reales y no solo el camino fácil. El control espejo de foco de T-02c —que yo mismo
había dejado sin resolver en el design-spec original— funciona en navegador real bajo cuatro formas distintas de
interacción.

Condiciones, ninguna bloqueante para el producto pero todas exigibles antes de cerrar el proyecto por completo:

1. **B4 (H4)**: que alguien con acceso real a un lector de pantalla (VoiceOver u otro) confirme por oído que el
   cambio de página se anuncia, con el texto literal que escucha. Es la única condición atada directamente a un
   criterio de aceptación (B4) que sigue sin una confirmación humana real en todo el proyecto.
2. **H2**: añadir cobertura de `e2e/` en el rango 480–539px, o documentar explícitamente que se acepta el hueco.
   DEC-04 pide medir, no estimar, y este rango se estimó dos veces sin medirse hasta hoy.
3. **H3**: regenerar `screenshots/` con una respuesta real (fija) de JSONPlaceholder en vez de títulos
   inventados, o rotular las capturas como ilustrativas si se prefiere mantener el contenido actual.
4. **H5**: verificar el riesgo del `<select>` de salto directo en Chrome sobre Windows o Linux antes de darlo
   por descartado; en macOS no se reprodujo pese a dos intentos.

H6 no es una condición, es una corrección de cifra para quien lea DEC-14 en el futuro.

T-14 COMPLETE — docs/audit-report.md listo para revisión del Orchestrator
