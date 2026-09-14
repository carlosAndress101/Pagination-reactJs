# BRIEF T-02 — PRODUCT DESIGNER (modo DESIGN)

Owner: PRODUCT DESIGNER. Asignado por: ORCHESTRATOR. Estado: IN_PROGRESS. Dependencias: ninguna.
Corre EN PARALELO con T-01 (Architect). No dependes de él.

## Regla dura
NO modifiques `src/` ni ningún config. Tu ÚNICA escritura permitida es crear `docs/design-spec.md`.
No instales dependencias. No hagas commits.

## Contexto previo
Lee primero `docs/00-ORCHESTRATOR.md` (inventario real + defectos D1–D10 + criterios de aceptación).
Lee el código actual: `src/components/Pagination.jsx`, `src/style/style.css`, `src/index.css`, `src/App.css`.
El estado visual actual es la plantilla por defecto de Vite con una lista `<ul>` sin estilo y una fila de `<li>` con borde.

## Lo que debes entregar en `docs/design-spec.md`

### 1. Auditoría de la UI actual
Lista concreta de problemas con referencia a archivo:línea. Al menos: jerarquía inexistente, el fallo de contraste D8,
los `<li>` clicables D3, ausencia total de estados, el botón "Load More" engañoso D7, tipografía sin escala, cero responsive.

### 2. Tokens de diseño — valores concretos, no adjetivos
Entrega valores reales listos para copiar, en formato de variables CSS (`--color-...`, `--space-...`), pensados para
mapearse a `@theme` de Tailwind 4:
- Paleta completa en **modo claro y oscuro**, con el ratio de contraste calculado de cada par texto/fondo que uses.
  Ningún par por debajo de 4.5:1 en texto ni 3:1 en UI. Escribe el ratio al lado de cada par.
- Escala tipográfica (tamaño / line-height / peso) y familia con fallback real.
- Escala de espaciado, radios, sombras y el estilo exacto del anillo de foco.

### 3. Anatomía del componente de paginación
Descripción precisa de la barra: qué controles, en qué orden, con qué etiqueta visible y qué etiqueta accesible.
Incluye el resumen de resultados ("Mostrando 11–20 de 200"), el selector de tamaño de página y el salto rápido si lo consideras necesario.
Define el **algoritmo de ellipsis** que quieres: cuántos números fijos en los extremos, cuántos alrededor de la actual,
y qué se muestra exactamente para totales de 1, 3, 7 y 20 páginas. Escribe esos 4 ejemplos literalmente — el Engineer los convertirá en tests.

### 4. Estados
Para cada uno: default, hover, focus-visible, active, disabled, current. Y a nivel pantalla: loading (¿skeleton de qué forma
y cuántas filas?), empty, error con reintento. Di qué NO debe pasar (p. ej. que la altura salte entre loading y carga).

### 5. Responsive
Breakpoints concretos y qué cambia en cada uno. Describe explícitamente la variante móvil a 320px: qué controles sobreviven,
cuáles se colapsan, y cómo se garantiza ≥44px de área táctil.

### 6. Accesibilidad
Mapa de roles y atributos ARIA exactos por elemento. Orden de tabulación. Dónde va el foco tras cambiar de página
(y por qué ahí). Texto literal del anuncio `aria-live`. Comportamiento con `prefers-reduced-motion`.

### 7. Microinteracciones
Solo las que aporten valor, cada una justificada en una línea. Con duración y easing concretos. Si crees que no hace falta ninguna, dilo.

## Restricciones
- Producto real, no plantilla. Nada de gradientes decorativos, glassmorphism, sombras exageradas ni animaciones de adorno.
- La solución debe ser implementable con Tailwind 4 o CSS plano — no propongas librerías de componentes ni dependencias de UI.
- Cada recomendación debe ser lo bastante concreta para que el Engineer la implemente sin volver a preguntarte.

## Criterios de aceptación de TU tarea
- `docs/design-spec.md` cubre las 7 secciones.
- Todos los tokens son valores literales, con ratios de contraste calculados.
- Los 4 ejemplos de ellipsis están escritos literalmente.
- `git status` muestra que no tocaste nada fuera de `docs/`.

Cuando termines, escribe una última línea: `T-02 COMPLETE — docs/design-spec.md listo para revisión del Orchestrator`.
