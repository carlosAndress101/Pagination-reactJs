# DESIGN SPEC — Paginación (T-02)

Autor: PRODUCT DESIGNER. Basado en `docs/00-ORCHESTRATOR.md` (defectos D1–D10, criterios A/B/C/D/E) y el código real en
`src/components/Pagination.jsx`, `src/style/style.css`, `src/index.css`, `src/App.css`.

Dos decisiones de diseño quedan marcadas como **[AJUSTABLE]**: el listado de tamaños de página y la ausencia de salto
rápido. Son recomendaciones concretas, no bloqueos — el Orchestrator puede vetarlas sin que el resto del spec cambie.
No he encontrado ninguna decisión que requiera escalar (no toca backend, auth, i18n ni scope de producto).

---

## 1. Auditoría de la UI actual

| Problema | Evidencia | Detalle |
|---|---|---|
| Jerarquía inexistente | `App.jsx:6-11`, `Pagination.jsx:93-94` | Un único `<h1>` seguido inmediatamente de un `<ul>` sin estilo (`renderData`, `Pagination.jsx:4-12`). No hay separación visual entre título, lista y controles; todo comparte el mismo `text-align:center` heredado de `#root` (`App.css:1-6`). |
| D8 — contraste roto | `index.css:60-63` | En `prefers-color-scheme: light`, `color:#e6e6e6` sobre `background-color:#ffffff`. Contraste real ≈ **1.28:1** (ver cálculo en §2) — texto casi invisible. |
| D3 — `<li>` clicables | `Pagination.jsx:39-47`; refuerzo visual en `style/style.css:6-11` (`cursor:pointer`, `padding`, `border` en el `<li>`, no en un control) | El `<li>` entero parece clicable (padding + borde + cursor) pero no es focusable ni tiene rol de botón. Ratón sí, teclado y lector de pantalla no. |
| D11 — foco eliminado sin reemplazo | `style/style.css:40-42` | `.pageNumbers li button:focus{outline:none}` quita el foco nativo y no pone nada en su lugar en los dos únicos controles navegables por teclado hoy (Prev/Next). Es peor que "sin estilo": es una regresión activa de accesibilidad que viola B3/B5 directamente. Resuelto por el token de anillo de foco de §2.4. |
| D12 — blancos/negros hardcodeados fuera de `index.css` | `style/style.css:8` (borde `1px solid white`), `:20-22` (píldora `.active`: `background-color:white; color:black`), `:29` (`color:white` en botón), `:36-37` (hover `background-color:white; color:black`) | D8 solo cubre `index.css`; este es el mismo problema de contraste pero en el estado **activo** y **hover** de los botones de paginación, en un archivo distinto. En modo claro real (fondo blanco) un borde blanco y una píldora activa blanca-sobre-blanca desaparecen. Resuelto por `--color-border-default`, `--color-accent-subtle-bg`/`--color-accent-emphasis` (activo) y `--color-bg-subtle` (hover) en §2.1, todos con ratio calculado contra `#ffffff`. |
| Ausencia total de estados | `Pagination.jsx:53-57` (fetch sin loading/error), sin `:focus-visible` en ningún lado, sin estado `disabled` visual distinto al normal | No hay skeleton, no hay mensaje de error, no hay vacío. El único estado visual es `.active` (página actual, `style/style.css:20-23`), y ese mismo estado es el que rompe D12. |
| D7 — "Load More" engañoso | `Pagination.jsx:87-89,106` | El texto promete cargar más datos; en realidad solo aumenta `itemsPage` en +5, cambiando el tamaño de página, no el dataset. |
| Tipografía sin escala | `index.css:36` (`h1{font-size:3.2em}` — resto de plantilla Vite), `style/style.css:30` (`font-size:1.5rem` en botones numéricos), `index.css:44` (`font-size:1em` en botón genérico) | Tres tamaños arbitrarios sin relación entre sí ni con el resto de la UI. Ningún valor de `line-height` definido para texto de control. |
| D16 — cero responsive, `flex` sin `flex-wrap` | No existe ningún `@media` de layout en el proyecto (`index.css:59` solo cubre color-scheme) | `.pageNumbers` es `display:flex` sin `flex-wrap` (`style/style.css:1-11`). Prev + números + 2 elipsis + Next no caben en 320px (estimación previa del Architect: ~370px de ancho necesario). Este es exactamente el motivo por el que §5 fija qué controles se ocultan a `<480px` en vez de dejar que el flex desborde — ver la verificación numérica a 320px en esa sección. |

---

## 2. Tokens de diseño

Formato de variables CSS, pensado para mapear 1:1 a `@theme` de Tailwind 4 (`--color-*` → `theme(colors.*)`, etc.).
Fuente tipográfica: **sin dependencia nueva** — pila de sistema (justificación: D10/D4 piden no añadir dependencias sin
motivo; una web font no aporta valor sobre la fuente nativa del SO en esta pantalla).

### 2.1 Color — modo claro

| Token | Valor | Uso | Contraste calculado |
|---|---|---|---|
| `--color-bg` | `#ffffff` | Fondo de página | — |
| `--color-bg-subtle` | `#f3f4f6` | Base de skeleton, fondos sutiles | decorativo, sin requisito |
| `--color-bg-subtle-2` | `#e5e7eb` | Segundo tono del shimmer del skeleton | decorativo, sin requisito |
| `--color-surface` | `#ffffff` | Contenedor de lista / banner de error | — |
| `--color-border-subtle` | `#e5e7eb` | Separadores decorativos (no llevan significado) | exento (no comunica estado) |
| `--color-border-default` | `#6b7280` | Borde de botones de paginación y del `<select>` | **4.83:1** sobre `#ffffff` ✅ (≥3:1 UI) |
| `--color-text-primary` | `#1f2937` | Texto de lista, título, mensajes | **14.68:1** sobre `#ffffff` ✅ |
| `--color-text-secondary` | `#4b5563` | Resumen "Mostrando…", labels | **7.56:1** sobre `#ffffff` ✅ |
| `--color-text-disabled` | `#9ca3af` | Texto/ícono de botones `disabled` | ≈2.54:1 — **exento** (WCAG exime controles inactivos) |
| `--color-accent` | `#2563eb` | Fondo de botones primarios (ninguno crítico en este componente salvo "Reintentar" si se decide sólido) | boundary vs `#ffffff` **5.17:1** ✅ |
| `--color-on-accent` | `#ffffff` | Texto sobre `--color-accent` | **5.17:1** ✅ |
| `--color-accent-emphasis` | `#1d4ed8` | Texto de enlace/página-actual, borde de foco, borde del pill de página actual | **6.70:1** sobre `#ffffff` ✅ |
| `--color-accent-subtle-bg` | `#dbeafe` | Fondo del pill de página actual | texto `--color-accent-emphasis` sobre este fondo: **5.49:1** ✅ |
| `--color-danger` | `#dc2626` | Texto/ícono de error | **4.83:1** sobre `#ffffff` ✅ |

Nota sobre D8: el fix es reemplazar el par roto `#e6e6e6`/`#ffffff` (≈1.28:1, calculado con la fórmula WCAG de
luminancia relativa: L(#e6e6e6)≈0.775, L(#fff)=1 → (1+0.05)/(0.775+0.05)=1.27:1) por `--color-text-primary` (14.68:1).

### 2.2 Color — modo oscuro

| Token | Valor | Uso | Contraste calculado |
|---|---|---|---|
| `--color-bg` | `#18181b` | Fondo de página | — |
| `--color-bg-subtle` | `#27272a` | Base de skeleton | decorativo |
| `--color-bg-subtle-2` | `#3f3f46` | Shimmer del skeleton | decorativo |
| `--color-surface` | `#18181b` | Diseño plano, sin card elevada | — |
| `--color-border-subtle` | `#3f3f46` | Separadores decorativos | exento |
| `--color-border-default` | `#a1a1aa` | Borde de botones / select | **6.92:1** sobre `#18181b` ✅ |
| `--color-text-primary` | `#f4f4f5` | Texto de lista, título | **16.12:1** sobre `#18181b` ✅ |
| `--color-text-secondary` | `#a1a1aa` | Resumen, labels | **6.92:1** sobre `#18181b` ✅ |
| `--color-text-disabled` | `#52525b` | Texto/ícono disabled | exento (intencional) |
| `--color-accent` | `#2563eb` | Fondo de botón primario | boundary vs `#18181b` **3.43:1** ✅ (≥3:1) |
| `--color-on-accent` | `#ffffff` | Texto sobre accent | **5.17:1** ✅ (independiente del fondo de página) |
| `--color-accent-emphasis` | `#60a5fa` | Texto de énfasis, borde de foco, borde del pill actual | **6.97:1** sobre `#18181b` ✅ |
| `--color-accent-subtle-bg` | `#1e3a8a` | Fondo del pill de página actual | texto `#bfdbfe` sobre este fondo: **7.29:1** ✅ |
| `--color-danger` | `#f87171` | Texto/ícono de error | **6.41:1** sobre `#18181b` ✅ |

Todos los cálculos usan la fórmula WCAG estándar (luminancia relativa por canal linealizado, `(L1+0.05)/(L2+0.05)`).
Ningún par de texto queda por debajo de 4.5:1 ni ningún par de UI significativo por debajo de 3:1. El pill de página
actual usa además un borde de 2px en `--color-accent-emphasis` (no solo el relleno) precisamente porque el relleno
`--color-accent-subtle-bg` por sí solo, contra el fondo de página en modo oscuro, da 1.71:1 — insuficiente como único
indicador de límite. El borde resuelve esto de forma independiente del relleno.

### 2.3 Tipografía

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

--text-xs-size: 0.75rem;  --text-xs-lh: 1rem;     /* 12/16 — micro-labels si hicieran falta */
--text-sm-size: 0.875rem; --text-sm-lh: 1.25rem;  /* 14/20 — botones, resumen, select */
--text-base-size: 1rem;   --text-base-lh: 1.5rem; /* 16/24 — ítems de la lista */
--text-lg-size: 1.125rem; --text-lg-lh: 1.75rem;  /* 18/28 — no usado en v1, reservado */
--text-xl-size: 1.5rem;   --text-xl-lh: 2rem;     /* 24/32 — no usado en v1, reservado */
--text-2xl-size: 1.875rem;--text-2xl-lh: 2.25rem; /* 30/36 — título "Todo List" */

--font-normal: 400; --font-medium: 500; --font-semibold: 600;
```

Mapeo: `h1` → `text-2xl` / `font-semibold` (reemplaza el `3.2em` heredado de la plantilla Vite). Ítems de lista →
`text-base` / `font-normal`. Resumen de resultados, botones de paginación, label+select → `text-sm` / `font-medium`
en los botones, `font-normal` en el label.

### 2.4 Espaciado, radios, sombra, foco

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;

--radius-sm: 6px;   /* botones */
--radius-md: 10px;  /* contenedor de la lista */

--shadow-xs: 0 1px 2px rgba(0,0,0,0.06);        /* modo claro, uso mínimo, opcional */
--shadow-xs-dark: 0 1px 2px rgba(0,0,0,0.45);   /* modo oscuro */

--focus-ring-width: 2px;
--focus-ring-offset: 2px;
/* color: --color-accent-emphasis de cada tema */
```

Implementación del foco (única regla, sin duplicar por componente):

```css
:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-accent-emphasis);
  outline-offset: var(--focus-ring-offset);
}
:focus:not(:focus-visible) { outline: none; }
```

Esto sustituye directamente el `outline:none` sin reemplazo de `style/style.css:40-42`.

---

## 3. Anatomía del componente de paginación

Orden de controles, izquierda a derecha (desktop, ≥768px), todos dentro de un contenedor `<footer>` o `<div>` de
paginación que envuelve dos filas lógicas:

**Fila 1 — información:**
1. Resumen de resultados: texto visible **y** región `aria-live` a la vez (ver §6). Ejemplo literal: `Mostrando 11–20 de 200 resultados`.
2. Selector de tamaño de página: `<label>Filas por página</label>` + `<select>`.

**Fila 2 — navegación** (`<nav aria-label="Paginación">` → `<ul>` → `<li><button>`):
`« Primera` — `‹ Anterior` — `[1] […] [n-1] [n] [n+1] […] [N]` — `Siguiente ›` — `Última »`

- Etiqueta visible de First/Prev/Next/Last: solo el glosario `«` `‹` `›` `»` (íconos), sin texto, para no competir en
  ancho con los números. Etiqueta accesible completa vía `aria-label` (ver §6).
- Los números son `<button>` reales, nunca `<li onClick>` (fix directo de D3).
- El `…` **no es un botón**: es texto decorativo (`<span aria-hidden="true">…</span>`), no focusable, no clicable.
  Esto es un cambio deliberado respecto al código actual y resuelve D2 de raíz: en vez de reimplementar un salto por
  bloque (que necesitaría una etiqueta accesible poco estándar tipo "saltar 5 páginas" y añade superficie de error),
  se elimina la affordance engañosa. `«`/`»` (primera/última) ya cubren el caso de salto largo.

**[AJUSTABLE] Tamaños de página**: `10, 20, 50, 100` (por defecto `10`). Con 200 ítems fijos esto da 20/10/4/2 páginas
respectivamente. Es una recomendación de UI, no un valor bloqueante — el Orchestrator puede cambiar la lista.

**[AJUSTABLE] Salto rápido ("ir a página X") — en `≥480px`**: **no lo incluyo**. Con los números visibles y
`pageSize` mínimo 10, el máximo son 20 páginas, alcanzables en ≤3 clics combinando números + primera/última. Un input
de texto añade validación (rango, no-numérico) sin beneficio proporcional a esa escala.

En `<480px` esta misma justificación **no se sostiene**, porque ahí los números están ocultos y quedar solo con
Primera/Última deja páginas intermedias a 11 toques de distancia (hallazgo T-02b del Orchestrator). Por eso el modo
compacto sí lleva un mecanismo de salto directo — un `<select>` con una opción por página, no un input de texto — ver
el detalle y la justificación completa en §5, subsección "Salto directo en modo compacto (T-02b)".

### Algoritmo de ellipsis

Constantes: `boundaryCount = 1` (páginas fijas en cada extremo), `siblingCount = 1` (vecinos a cada lado de la actual).

```
function getPageRange(current, total):
  if total <= 7:                      # boundary*2 + sibling*2 + 3 = 7
    return [1..total]                 # nunca hay "…" por debajo de este umbral

  # umbrales derivados de boundaryCount=1, siblingCount=1:
  if current <= 4:                                    # cerca del inicio
    return [1,2,3,4,5, ELLIPSIS, total]
  if current >= total - 3:                             # cerca del final
    return [1, ELLIPSIS, total-4,total-3,total-2,total-1,total]
  else:                                                 # en medio
    return [1, ELLIPSIS, current-1,current,current+1, ELLIPSIS, total]
```

Regla de fondo: el `…` solo aparece cuando oculta **2 o más** páginas; si solo oculta una, se muestra el número en su
lugar (por eso el umbral es `current <= 4` y no `current <= 3`: en `current=4` la alternativa sería ocultar una sola
página, y eso nunca debe ser un `…`). Consecuencia importante para el foco (ver §6): la página actual **siempre**
está en el conjunto renderizado, nunca queda oculta detrás de un `…`.

**4 ejemplos literales** (para convertir en tests):

1. **`total=1, current=1`** → `[1]`. Prev/Primera y Next/Última deshabilitados. Sin `…`.
2. **`total=3, current=2`** → `[1, 2, 3]`. Sin `…` (por debajo del umbral de 7).
3. **`total=7, current=4`** → `[1, 2, 3, 4, 5, 6, 7]`. Caso límite exacto: con 7 páginas **nunca** hay `…`, incluso
   con la actual en el medio — vale la pena un test específico para este borde (`total=7` es el máximo sin elipsis).
4. **`total=20`**, tres posiciones de la misma prueba:
   - `current=1` → `[1, 2, 3, 4, 5, …, 20]` (caso "cerca del inicio", solo `…` derecho).
   - `current=10` → `[1, …, 9, 10, 11, …, 20]` (caso "en medio", `…` a ambos lados).
   - `current=20` → `[1, …, 16, 17, 18, 19, 20]` (caso "cerca del final", solo `…` izquierdo).

---

## 4. Estados

### Botones de paginación (números, first/prev/next/last)

| Estado | Estilo |
|---|---|
| Default | Fondo `--color-surface`, borde 1px `--color-border-default`, texto `--color-text-primary`, `--text-sm` / `font-medium`. |
| Hover | Fondo `--color-bg-subtle`. Transición `background-color 120ms ease-out`. |
| Focus-visible | Regla global de §2.4 (`outline` 2px `--color-accent-emphasis`, offset 2px). Nunca se retira sin reemplazo. |
| Active (pressed) | Fondo un tono más oscuro que hover (`--color-border-subtle` invertido: usar `--color-bg-subtle-2`), sin transición (feedback inmediato). |
| Disabled (`Primera`/`Anterior` en pág. 1, `Siguiente`/`Última` en la última) | `color: --color-text-disabled`, `border-color: --color-text-disabled`, `cursor: not-allowed`, sin hover/active. Atributo `disabled` real, no solo visual (fix de D6: nunca depender de comparar contra `pages[0]` con datos vacíos — debe derivarse de `currentPage === 1` / `currentPage === totalPages` con `totalPages` ya conocido). |
| Current (página actual) | Fondo `--color-accent-subtle-bg`, texto `--color-accent-emphasis`, borde 2px `--color-accent-emphasis`, `font-semibold`, `aria-current="page"`. Sigue siendo focusable y clicable (click es no-op), nunca `disabled`. |

### Pantalla completa

- **Loading**: se reemplaza la lista por `pageSize` filas de skeleton (mismo número que el tamaño de página activo,
  para que la altura del contenedor **no cambie** al llegar los datos reales — esto es lo que no debe pasar). Cada
  fila: rectángulo `height: 1.5rem` (= `--text-base-lh`), `border-radius: --radius-sm`, ancho variable entre 55% y
  90% (alternando determinísticamente por índice, no aleatorio, para que sea estable en tests). Color `--color-bg-subtle`
  con barrido de `--color-bg-subtle-2` (ver microinteracciones). La barra de paginación permanece visible pero con
  todos los controles `disabled` durante la carga inicial (no hay página "actual" todavía).
- **Empty**: mensaje centrado `text-base` en `--color-text-secondary`, sin botón de acción (no hay filtro que limpiar
  en este producto). Contenedor con el mismo `min-height` que el skeleton para no saltar.
- **Error**: banner con borde izquierdo 4px `--color-danger`, fondo `--color-surface` (no un fondo teñido — evita el
  problema de contraste de fondos rojos claros, ver §2), texto del mensaje en `--color-danger`, y un botón
  "Reintentar" con estilo *outline* (borde `--color-border-default`, texto `--color-text-primary`, hover
  `--color-bg-subtle`). Mismo `min-height` que loading/loaded. **Este banner es la única copia visible del mensaje**
  (corregido en T-02c — ver la nota de visibilidad en §6: la región `aria-live` compartida lleva el mismo texto pero
  queda oculta durante este estado, para no duplicarlo en pantalla en `≥480px`).
- Lo que **no** debe pasar: (1) que el alto del contenedor cambie entre loading→loaded→error/empty; (2) que dos
  regiones `aria-live` anuncien a la vez (ver §6, es una sola región reutilizada); (3) animación de entrada/salida
  entre páginas — el contenido se reemplaza al instante (ver §7).

---

## 5. Responsive

Un único breakpoint de layout es suficiente para este componente; el algoritmo de ellipsis no cambia con el
viewport, solo la densidad visual.

| Breakpoint | Qué cambia |
|---|---|
| `≥768px` (desktop) | Fila 1 (resumen + selector) y fila 2 (nav) en una sola fila horizontal si el ancho lo permite; si no, dos filas. Todos los números visibles según el algoritmo de §3. |
| `480–767px` (tablet/móvil grande) | Fila 1 y fila 2 apiladas verticalmente. Números de página con el mismo algoritmo (hasta 7 slots), sin cambios. |
| `<480px` (compacto, mínimo 320px) | **Se ocultan los botones numéricos.** Quedan `« Primera`, `‹ Anterior`, `Siguiente ›`, `Última »` como 4 botones ícono, más un `<select>` de salto directo (ver subsección siguiente) en vez de un texto plano. El selector de tamaño de página baja a su propia fila, ancho completo. |

### Salto directo en modo compacto (T-02b)

**Problema detectado por el Orchestrator, correcto:** ocultar los números y descartar el salto rápido eran dos
decisiones defendibles por separado, pero juntas dejan en móvil solo dos destinos directos (`Primera`/`Última`). Con
`pageSize=10` (20 páginas), llegar a la página 12 costaba 11 toques en "Siguiente". El razonamiento de "solo son 20
páginas" en §3 asumía los números visibles; en la variante sin ellos, no se sostiene.

**Fix:** en `<480px`, el texto plano `"Página X de Y"` se sustituye por un **`<select>` nativo de salto directo**,
con una opción por página (`value={n}`, texto `"Página {n} de {N}"`), valor seleccionado = página actual:

```html
<select aria-label="Ir a la página" class="page-jump-select">
  <option value="1">Página 1 de 20</option>
  <option value="2">Página 2 de 20</option>
  <!-- ... -->
  <option value="20" selected>Página 20 de 20</option>
</select>
```

Por qué esta opción y no las otras dos que planteaba el reto:

- **Frente a un set numérico reducido de 3 slots**: sigue sin dar acceso directo a páginas lejanas (misma familia de
  problema que intentaba resolver, a menor escala). El `<select>` da acceso a **cualquier** página en como máximo 2
  toques, sin importar `N`.
- **Frente a un input de texto libre**: un `<select>` con opciones fijas no introduce validación nueva (rango,
  no-numérico, `page=abc`) — los valores ya están acotados a páginas reales, coherente con cómo se trata `pageSize`
  en el resto del spec. Un input añadiría una superficie de error que el propio criterio A6 ya resuelve a nivel de
  URL, sin necesidad de duplicarlo en la UI.
- **Frente a bajar el breakpoint de 480px**: no resuelve nada, solo desplaza a qué ancho ocurre el mismo problema.

Efecto secundario positivo: el `<select>` en un móvil real abre el picker nativo del sistema operativo, que ya
soporta scroll y búsqueda por teclado en listas largas — no hay que construir ni testear un componente de lista
propio para esto.

**Ancho:** `width: min(100%, 220px)`, centrado en su propia fila, `min-height: 44px` (mismo objetivo táctil que el
resto de controles en `<480px`, ver más abajo). No compite en ancho con la fila de los 4 botones ícono — sigue en una
fila separada, así que el cálculo de 320px de más abajo no cambia.

**Consecuencia en accesibilidad (toca §6):** el `<select>` deja de poder ser a la vez "resumen visible" y región
`aria-live`, porque su contenido no es texto de lectura libre sino una lista de opciones. Se separan ambos roles: el
`<select>` es la única superficie visible de navegación directa en compacto, y el anuncio de cambio de página pasa a
vivir en un nodo `aria-live` visualmente oculto (`sr-only`) que existe en todos los anchos con el mismo texto largo
(`"Mostrando 11–20 de 200 resultados"`) — ver el mapa ARIA actualizado en §6. Esto además simplifica esa sección: ya
no hace falta un "modo corto" del texto anunciado solo para compacto.

**Sobre `pageSize=100` (2 páginas):** no lo elimino de la lista — sigue siendo una opción válida para quien quiera
ver el caso de pocas páginas — pero mantengo el **valor por defecto en 10** (20 páginas) precisamente porque es el
que se usa al entrar por primera vez, y es el que de verdad ejercita la paginación (incluido este mismo fix de salto
directo) en la demo.

**Verificación explícita a 320px** (evita volver a violar C1): 4 botones ícono de `44×44px` + 3 gaps de `8px` entre
ellos = `4×44 + 3×8 = 200px`. Ancho disponible a 320px con `padding` lateral de `16px` a cada lado (`--space-4`) =
`320 − 32 = 288px`. `200px ≤ 288px` → sin scroll horizontal, con margen de sobra para el texto "Página X de Y" que
va en su propia fila debajo, con `white-space: normal` (nunca `nowrap`) por si el número de página es de 2 dígitos.

**Objetivo táctil**: en `<480px`, todo control interactivo (botones ícono, `<select>` de tamaño de página, `<select>`
de salto directo) tiene `min-width: 44px; min-height: 44px`. En `≥480px` se permite `40×40px` (uso con
ratón/trackpad), manteniendo el mismo padding interno relativo (`--space-2` `--space-3`).

---

## 6. Accesibilidad

### Mapa ARIA por elemento

| Elemento | Rol / atributos |
|---|---|
| Contenedor de navegación | `<nav aria-label="Paginación">` |
| Lista de controles | `<ul>` nativo dentro del `<nav>`, sin ARIA extra (semántica de lista ya es correcta) |
| Botón "Primera" | `<button type="button" aria-label="Primera página">«</button>` |
| Botón "Anterior" | `<button type="button" aria-label="Página anterior">‹</button>` |
| Botón de número `n` | `<button type="button" aria-label="Página {n}" aria-current={n === current ? "page" : undefined}>{n}</button>` |
| Elipsis | `<span aria-hidden="true">…</span>` dentro de un `<li>`, nunca un `<button>` |
| Botón "Siguiente" | `<button type="button" aria-label="Página siguiente">›</button>` |
| Botón "Última" | `<button type="button" aria-label="Última página">»</button>` |
| Resumen/anuncio | Un único `<p aria-live="polite" aria-atomic="true">`, siempre presente (ver siguiente punto). En `≥480px` es visible; en `<480px` es visualmente oculto (`sr-only`), ya que en compacto la superficie visible de navegación pasa a ser el `<select>` de salto directo. |
| `<select>` de salto directo (solo `<480px`, ver §5 T-02b) | `<select aria-label="Ir a la página">`, una `<option value="{n}">Página {n} de {N}</option>` por página, `selected` en la actual. No lleva `aria-live` propio: al cambiar, dispara el mismo cambio de página que un botón de número, y es el `<p>` oculto el que anuncia el resultado. |
| Label + select de tamaño | `<label for="page-size">Filas por página</label>` + `<select id="page-size">` |
| Botón "Reintentar" | `<button type="button">Reintentar</button>`, fuera de la región `aria-live` (para no repetirse en cada anuncio) |

### Una sola región `aria-live`, tres contenidos posibles

Para evitar que dos regiones anuncien a la vez (dos lectores de pantalla hablando encima), el mismo nodo
`aria-live="polite" aria-atomic="true"` se reutiliza según el estado, **con el mismo texto en cualquier ancho de
pantalla** (a partir de T-02b ya no hay una versión corta solo para compacto — ver §5):

- Cargando: `"Cargando resultados…"`
- Cargado: `"Mostrando 11–20 de 200 resultados"` (texto literal exacto; en `≥480px` es además el resumen visible)
- Error: `"No se pudieron cargar los resultados. Inténtalo de nuevo."`

**Visibilidad — corregida en T-02c.** En `<480px` este nodo existe siempre con el mismo texto, solo que oculto
visualmente (`sr-only`), porque su lugar en pantalla lo ocupa el `<select>` de salto directo (en loading/cargado) o
el banner de error (en error). En `≥480px` la visibilidad ya no depende solo del breakpoint, sino también del
estado: en loading y cargado es visible (es el resumen de resultados en pantalla), pero **en error queda `sr-only`
también en `≥480px`** — el texto ya se muestra una vez en el banner de §4, y mostrarlo también aquí lo duplicaba en
pantalla. El nodo sigue existiendo y sigue disparando el anuncio para lectores de pantalla en los tres estados; lo
único que cambia es que, durante el error, su copia visible se cede al banner.

### Orden de tabulación

`(resumen, no focusable) → selector de tamaño → Primera → Anterior → [números en orden] → Siguiente → Última`.
Orden natural del DOM, sin `tabindex` positivo en ningún punto. En `<480px`, `[números en orden]` se sustituye por
el `<select>` de salto directo de T-02b, en la misma posición relativa (entre `Anterior` y `Siguiente`).

### Foco tras cambiar de página (corregido en T-02c)

**Regla general: el foco se queda en el botón que el usuario activó.** No se mueve a la lista, ni al resumen, ni al
primer ítem — eso rompería el flujo de quien pagina rápido con teclado repitiendo `Enter`/`Space`. Esta regla se
concreta de dos formas distintas según el control, porque "seguir en el DOM" no es lo mismo que "poder conservar el
foco": la primera versión de esta sección asumía que sí lo eran, y no se sostiene para los cuatro botones de extremo.

- **Botones de número**: la regla general se cumple sin excepción. El botón de la página actual nunca es `disabled`
  (§4) y el algoritmo de §3 garantiza que esa página **siempre** forma parte del rango visible — el foco nunca se
  pierde.
- **Primera / Anterior / Siguiente / Última**: cuando activar uno de estos deja al usuario en el extremo
  correspondiente, ese mismo botón pasa a `disabled` — y un elemento que pasa a `disabled` **pierde el foco aunque
  siga en el DOM**; el navegador lo manda al `body`, no se queda "cerca" de donde estaba. (jsdom no reproduce este
  comportamiento — hay que verificarlo en navegador real, un test en verde sobre jsdom no lo confirma.) Cuando esto
  ocurre — y solo cuando el foco se ha perdido de verdad tras el re-render, no de forma preventiva — se reubica en su
  **control espejo**: `Siguiente → Anterior`, `Anterior → Siguiente`, `Última → Primera`, `Primera → Última`. El
  espejo está garantizado habilitado en ese momento (acabas de alejarte de su extremo), así que nunca es en sí mismo
  otro callejón sin salida. Se elige el espejo y no, por ejemplo, el `<select>` de tamaño de página, porque mantiene
  el foco dentro del mismo clúster funcional y en la dirección semánticamente opuesta a la que el usuario acaba de
  agotar.
- Excepción ya existente, sin cambios: si el usuario cambia el `<select>` de tamaño de página, el foco permanece en
  el propio `<select>` — ese control no se deshabilita nunca, así que el mecanismo de espejo no aplica ahí.

### `prefers-reduced-motion`

- El shimmer del skeleton (única animación continua del componente) se desactiva: con `prefers-reduced-motion: reduce`
  pasa a un color plano `--color-bg-subtle`, sin barrido.
- Las transiciones de `background-color` en hover/active (120ms) se mantienen — no son movimiento, son cambio de
  color, y WCAG 2.3.3 / la guía de reduced-motion apunta a movimiento/parallax, no a esto.
- No existe animación de entrada/salida entre páginas en ningún modo (ver §7): esto no es una rama condicional de
  reduced-motion, es una decisión de base.

---

## 7. Microinteracciones

Solo tres, cada una justificada; deliberadamente no hay más.

1. **Hover/active en botones** — `background-color 120ms ease-out`. Justificación: feedback barato de "esto es
   clicable", refuerza el fix de D3 (ya no son `<li>` con apariencia ambigua). Sin retraso en el foco (el
   `:focus-visible` no tiene transición, aparece instantáneo).
2. **Shimmer del skeleton** — gradiente `--color-bg-subtle` → `--color-bg-subtle-2` → `--color-bg-subtle`,
   `1.4s linear infinite`. Justificación: comunica "esto está cargando, no está roto" sin texto adicional. Se anula
   bajo `prefers-reduced-motion` (ver §6).
3. **Ninguna animación entre páginas** (decisión explícita, no una omisión): el contenido de la lista se reemplaza al
   instante al cambiar de página. Justificación: con `page`/`pageSize` en la URL (A5) y back/forward funcionando, un
   fade o slide entrenaría al usuario a esperar una transición que no coincide con la navegación nativa del
   navegador (que es instantánea); además evita duplicar lógica de reduced-motion para un efecto puramente decorativo.

---

T-02 COMPLETE — docs/design-spec.md listo para revisión del Orchestrator
