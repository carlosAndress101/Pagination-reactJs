# Build Pagination component from scratch in React JS

![Pagination Component](https://user-images.githubusercontent.com/63275338/235771441-705de613-40e1-4b7d-b5cf-96bb12035f8f.jpg)
![Pagination Component](https://user-images.githubusercontent.com/63275338/235772034-584fd245-3bcd-443e-a02e-61afd16a8962.png)

## Desarrollo

Gestor de paquetes: **pnpm**. No uses `npm` ni `npx` en este repositorio.

```bash
pnpm install
pnpm dev
```

## Verificación

`pnpm verify` encadena todas las comprobaciones y es lo que debe estar en verde
antes de dar nada por terminado:

| Comando               | Qué comprueba                                                                 |
| --------------------- | ----------------------------------------------------------------------------- |
| `pnpm lint`           | oxlint, incluidas las reglas de accesibilidad en JSX                          |
| `pnpm format`         | Prettier en modo `--check`                                                    |
| `pnpm typecheck`      | TypeScript strict sobre `src/` y sobre la configuración de build              |
| `pnpm test`           | Vitest: lógica pura, hooks e interacción con jsdom                            |
| `pnpm build`          | Build de producción                                                           |
| `pnpm verify:size`    | Presupuesto de bundle en bytes, gzip nivel 9                                  |
| `pnpm verify:runtime` | Playwright: layout, contraste, foco, objetivos táctiles y movimiento reducido |
| `pnpm verify`         | Todo lo anterior, en orden                                                    |

### Verificación en navegador real

Lo que jsdom no puede comprobar —no calcula layout ni aplica la cascada CSS—
vive en `e2e/` y lo ejecuta Playwright. El runner arranca y para el servidor y
el navegador por su cuenta: no hay que levantar nada a mano.

Requiere descargar Chromium **una sola vez por máquina**:

```bash
pnpm exec playwright install chromium
```

Si falta, `pnpm verify:runtime` lo dice y repite ese comando en el mensaje de
error. `pnpm build` y `pnpm test` funcionan igualmente sin él.

Dos requisitos de método al escribir specs nuevos, ambos por errores reales
cometidos midiendo a mano:

- **El foco se recorre con `keyboard.press('Tab')`, nunca con `element.focus()`.**
  Chromium no aplica `:focus-visible` al foco programático, así que un spec
  escrito con `.focus()` mide `outline: none` y da un falso negativo sobre una
  hoja de estilos correcta.
- **El estado de carga se congela reteniendo la petición** (`page.route`), no
  simulando latencia. Con latencia la carga termina antes de poder observar y
  el spec pasa sin haber comprobado nada.
