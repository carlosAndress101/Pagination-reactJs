## Qué es esto

Modernización completa de la demo de paginación. La aplicación pasa de un único
componente de 111 líneas con estado derivado desincronizado a una pantalla
accesible, tipada en estricto, verificada en navegador real y con la URL como
fuente de verdad.

**No se añadió ninguna dependencia de producción.** Siguen siendo `react` y
`react-dom`, las mismas dos del primer día. Tailwind CSS 4, TanStack Router,
TanStack Query, Zod y oxfmt se evaluaron y se rechazaron con análisis escrito
en `docs/architecture-analysis.md`: ninguna aportaba valor suficiente para una
sola pantalla sobre un conjunto fijo de 200 elementos.

## Resultado

| | Antes | Después |
|---|---|---|
| Defectos abiertos | 18 | 0, los 18 con test de regresión |
| Tests | 0 | 122 unitarios + 156 de navegador |
| Desbordamiento horizontal a 320px | 230 px | 0 |
| Objetivo táctil mínimo | 29.1 px | 44 px |
| Elementos enfocables con anillo visible | 3 | todos |
| Regiones `aria-live` | 0 | 1 |
| Modo claro | no renderizaba | real, 8 pares medidos ≥4.5:1 |
| Lector de pantalla | sin soporte | verificado por oído con VoiceOver |
| Dependencias de producción | 2 | 2 |

## Cambios principales

- **Lógica pura separada y probada por propiedades.** `getPageRange`, `clampPage`
  y el saneado de parámetros viven en `src/lib/` y se verifican con un barrido de
  20 100 combinaciones (`total=1..200 × current=1..total`) sobre seis invariantes,
  no sobre el comportamiento actual congelado.
- **Accesibilidad como requisito, no como retoque.** `<nav aria-label>`, botones
  reales en vez de `<li onClick>`, `aria-current="page"`, una única región
  `aria-live="polite"`, `:focus-visible` global, objetivos táctiles de 44 px y
  respeto a `prefers-reduced-motion`.
- **Estado en la URL** con `URLSearchParams` y History API, sin router: `page` y
  `pageSize` son compartibles y el botón atrás del navegador funciona.
- **Una sola petición de red**, también en modo desarrollo con StrictMode, con
  `AbortController` y promesa compartida en vuelo.
- **Hoja de estilos con tokens**: un único lugar de verdad para color, espaciado,
  tipografía y radios, con tema claro y oscuro reales.
- **Verificación en navegador real** con Playwright en seis proyectos: layout,
  contraste, foco, objetivos táctiles, movimiento reducido y la banda de
  envoltura de la barra.

## Cómo verificarlo

```bash
pnpm install
pnpm exec playwright install chromium   # una sola vez por máquina
pnpm verify
```

`pnpm verify` encadena lint, formato, tipos, unitarios, build, presupuesto de
bundle y navegador. Debe terminar en verde. El presupuesto de bundle se mide en
bytes con gzip nivel 9: JS 70 415 B, CSS 1 909 B, ambos dentro de límite.

## Proceso

El trabajo se coordinó entre cuatro roles con auditoría independiente. La
trazabilidad completa está en `docs/`: definición de producto y defectos en
`00-ORCHESTRATOR.md`, análisis técnico y decisiones de dependencias en
`architecture-analysis.md`, especificación visual en `design-spec.md`, plan y
decisiones en `01-MASTER-PLAN.md`, y auditoría final en `audit-report.md`.

La auditoría cerró en READY_WITH_CONDITIONS con cero hallazgos P0 y P1. Las
cuatro condiciones están resueltas: cobertura de la banda 480–547px, capturas
regeneradas con la respuesta real de la API, riesgo del salto directo aceptado y
documentado, y B4 confirmado con un lector de pantalla real.
