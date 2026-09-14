# ORCHESTRATOR — Contexto compartido

Runtime: Nodeterm. Agentes: ORCHESTRATOR (PO + Tech Lead + Quality Gate), ARCHITECT, ENGINEER, PRODUCT DESIGNER / AUDITOR.
Rama de trabajo: `feat/modernize-pagination`. Un solo checkout compartido: **no cambies de rama**.

Fase actual: **TECHNICAL ANALYSIS** (T-01, T-02 en paralelo).

---

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
| D8 | `index.css:73-84` | En `prefers-color-scheme: light` pone `color: #e6e6e6` sobre fondo `#ffffff` → texto prácticamente invisible. Fallo de contraste grave. |
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

## 2.1 DECISIONES CERRADAS POR EL ORCHESTRATOR

- **DEC-01 — Gestor de paquetes: pnpm.** `pnpm-lock.yaml` ya existe y pnpm 12.3.4 está instalado localmente (`/opt/homebrew/bin/pnpm`). Mantenerlo evita churn de lockfile y una migración sin valor. No se usa npm ni yarn en este proyecto.
- **DEC-02 — Cobertura de a11y en lint: obligatoria.** Cualquier stack de lint propuesto debe cubrir las reglas de accesibilidad en JSX. Si la herramienta elegida no las cubre, no es candidata válida.

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

## 5. Reglas para todos los agentes

1. Inspecciona antes de modificar. El repositorio es la fuente de verdad.
2. No amplíes el scope por iniciativa propia: si detectas algo fuera de tu tarea, repórtalo, no lo implementes.
3. No declares "done" sin evidencia ejecutada y pegada (comando + salida).
4. Si necesitas una decisión de producto o arquitectura, **detente** y repórtalo al Orchestrator.
5. Conventional Commits. No hagas `git push`, ni tags, ni releases, ni rebase/reset destructivo.
6. Solo ENGINEER escribe en `src/`. ARCHITECT y DESIGNER escriben únicamente en `docs/`.
