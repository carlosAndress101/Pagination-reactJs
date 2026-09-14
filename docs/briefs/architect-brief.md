# BRIEF T-01 — ARCHITECT (modo READ-ONLY)

Owner: ARCHITECT. Asignado por: ORCHESTRATOR. Estado: IN_PROGRESS. Dependencias: ninguna.

## Regla dura
NO modifiques ningún archivo dentro de `src/`, `package.json`, `vite.config.js`, `index.html` ni ningún
config. Tu ÚNICA escritura permitida es crear `docs/architecture-analysis.md`.
No instales dependencias. No ejecutes `npm install` / `pnpm install`. No hagas commits.
Puedes leer archivos y consultar versiones publicadas en el registry (`ppnpm view <pkg> version`).

## Contexto previo
Lee primero `docs/00-ORCHESTRATOR.md`. Ya contiene el inventario del repo y 10 defectos confirmados (D1–D10).
No repitas ese inventario: constrúyelo encima.

## Lo que debes entregar en `docs/architecture-analysis.md`

### 1. Matriz de versiones objetivo
Para cada uno: versión estable actual **verificada con `ppnpm view <pkg> version`** (no de memoria), y compatibilidad entre sí.
react, react-dom, typescript, vite, @vitejs/plugin-react-swc, tailwindcss (+ @tailwindcss/vite), vitest,
@testing-library/react, jsdom o happy-dom, oxlint, oxfmt.
Señala explícitamente cualquier incompatibilidad o riesgo (p. ej. Tailwind 4 requiere navegadores/PostCSS concretos,
oxlint/oxfmt madurez y qué reglas pierde frente a ESLint, si oxfmt está listo para producción o conviene Prettier).

### 2. Decisión tecnológica, una por una — con veredicto ADOPT / REJECT y motivo
Para CADA punto responde con evidencia del código real, no con teoría:
- **TypeScript strict**: ADOPT/REJECT. ¿Migración completa de golpe o `allowJs` progresivo? Con 4 archivos fuente, justifica.
- **Tailwind 4**: ADOPT/REJECT frente a CSS Modules o CSS plano. La app tiene 3 hojas de estilo con solapamiento.
- **Vitest**: ADOPT/REJECT. Qué entorno (jsdom vs happy-dom) y por qué.
- **oxlint + oxfmt**: ADOPT/REJECT frente a mantener ESLint 9 flat config + Prettier. Sé honesto sobre la cobertura de reglas de React Hooks.
- **TanStack Router**: ADOPT/REJECT. La app es UNA sola pantalla. ¿El estado de URL (`page`, `pageSize`) justifica un router completo, o basta `URLSearchParams` + History API, o `nuqs`? Cuantifica el coste en KB y en complejidad.
- **TanStack Query**: ADOPT/REJECT. Hay UN solo GET estático de 200 ítems, sin mutaciones, sin refetch, sin caché entre vistas. Justifica.
- **Zod**: ADOPT/REJECT. Hay dos entradas externas: la respuesta de JSONPlaceholder y los search params. ¿Zod aporta frente a un type guard escrito a mano de ~10 líneas? Cuantifica.
Un REJECT bien argumentado vale tanto como un ADOPT. Aplica YAGNI.

### 3. Decisión de producto que debes ESCALAR, no resolver
La paginación actual es **cliente**: descarga los 200 ítems y corta con `slice`.
Alternativa: paginación **servidor** usando `?_start=&_limit=` de JSONPlaceholder (devuelve `x-total-count`).
Expón pros y contras de cada una (realismo de producto, estados loading por página, complejidad, si justifica TanStack Query)
y da tu **recomendación**, pero marca la decisión como `ESCALADA AL ORCHESTRATOR`. No la des por cerrada.

### 4. Arquitectura objetivo
Árbol de archivos propuesto, con la responsabilidad de cada uno en una línea.
Dónde vive la lógica de paginación (hook puro vs componente), dónde el fetch, dónde los tipos.
Máximo la estructura que estos requisitos necesitan — sin capas especulativas, sin carpetas vacías, sin barrel files.

### 5. Orden de implementación
Lista de pasos numerados y secuenciales, cada uno dejando el repo en verde (`build` funcionando).
Indica en cada paso qué se puede romper y cómo se detecta.

### 6. Riesgos
Tabla: riesgo | probabilidad | impacto | mitigación. Incluye al menos: migración JS→TS, Tailwind 4 sobre CSS existente,
oxlint/oxfmt inmaduros, StrictMode y doble fetch, `node_modules` ausente.

### 7. Estrategia de validación
Qué comando prueba qué criterio de aceptación de `docs/00-ORCHESTRATOR.md` §4. Señala qué criterios NO quedan cubiertos
por ningún comando automático y necesitan verificación manual.

**RESTRICCIÓN DURA (DEC-05) — el andamiaje de verificación vive en el repo y es reejecutable por otro agente.**
La verificación en runtime de B5 (objetivos táctiles ≥44px), C1 (sin scroll horizontal a 320px) y contraste la escribe
el ENGINEER y la reejecuta el DESIGNER en Audit Mode **sin preguntarle nada al Engineer**. Por tanto tu método debe ser
un script de `package.json` que gestione por sí mismo el arranque del servidor y del navegador. Queda descartado de
entrada lo que se usó en el baseline T-04: scripts sueltos en un scratchpad de sesión, un puerto elegido a mano y un
navegador headless levantado a mano. Eso no es verificación reejecutable, es una anécdota irrepetible.

Di explícitamente qué parte de B5/C1/contraste es comprobable en jsdom o happy-dom y qué parte exige un navegador real
con layout de verdad — y si exige navegador real, qué dependencia concreta lo aporta y cuánto pesa. Si tu conclusión es
que alguno de esos criterios no se puede automatizar de forma razonable, dilo y propón el procedimiento manual;
es una respuesta válida, pero tiene que ser explícita.

## Criterios de aceptación de TU tarea
- `docs/architecture-analysis.md` existe y cubre las 7 secciones.
- Cada versión que cites viene de `pnpm view`, con el comando visible.
- Cada tecnología tiene veredicto explícito ADOPT o REJECT con razón anclada en este código.
- La decisión cliente-vs-servidor queda marcada como escalada, no resuelta.
- `git status` muestra que no tocaste nada fuera de `docs/`.

Cuando termines, escribe una última línea: `T-01 COMPLETE — docs/architecture-analysis.md listo para revisión del Orchestrator`.
