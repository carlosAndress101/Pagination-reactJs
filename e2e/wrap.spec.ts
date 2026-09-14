import { expect, test } from '@playwright/test';
import { stubApi } from './helpers';

/**
 * H2 — la banda donde la barra envuelve de verdad.
 *
 * Los cinco proyectos de `playwright.config.ts` saltan de 414px a 768px, asi que
 * el `flex-wrap` de DEC-14 nunca se habia ejercitado: se decidio dos veces sobre
 * una estimacion y ninguna medicion lo tocaba. Este spec corre en su propio
 * proyecto (`banda`), no en los cinco, para no multiplicar coste por un rango
 * que solo importa aqui.
 *
 * Medido en navegador contra el build de produccion, no estimado:
 *
 *   pagina      ancho que pide la barra    envuelve hasta    una sola fila desde
 *   1-4         507px                      539px             540px
 *   5-16        491-498px                  523-531px         524-532px
 *   17-20       515px                      547px             548px
 *
 * De ahi los dos anchos de abajo: 480px es el primer ancho no compacto y 547px
 * el ultimo en que la barra sigue necesitando dos filas. Se prueba en la ultima
 * pagina porque es donde la barra es mas ancha ("1 … 16 17 18 19 20"): medir en
 * la pagina 1, que es lo que invita a hacer la URL por defecto, da 507px y deja
 * fuera los 8px que separan 539 de 547.
 */
const BANDA = [480, 547] as const;

/** Ultima pagina con el tamano por defecto: la ventana mas ancha de las 20. */
const PAGINA_MAS_ANCHA = '/?page=19';

interface Barra {
  filas: number;
  fueraDeLaBarra: string[];
  solapes: string[];
  desbordeDocumento: number;
}

for (const width of BANDA) {
  test.describe(`H2 — barra de paginación a ${String(width)}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    let barra: Barra;

    test.beforeEach(async ({ page }) => {
      await stubApi(page);
      await page.goto(PAGINA_MAS_ANCHA);
      await expect(page.getByText(/Mostrando/)).toBeVisible();

      barra = await page.evaluate(() => {
        const lista = document.querySelector('.pagination__list');
        if (lista === null) throw new Error('no hay barra de paginación');

        const controles = [...lista.querySelectorAll<HTMLElement>(':scope > li')]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({
            nombre: el.textContent?.trim() ?? '?',
            caja: el.getBoundingClientRect(),
          }));
        const dentro = lista.getBoundingClientRect();

        const solapes: string[] = [];
        for (let i = 0; i < controles.length; i++) {
          for (let j = i + 1; j < controles.length; j++) {
            const a = controles[i];
            const b = controles[j];
            if (a === undefined || b === undefined) continue;
            // Solo cuenta dentro de una misma fila: dos filas distintas comparten
            // rango de X por definicion y eso no es solaparse.
            if (Math.round(a.caja.top) !== Math.round(b.caja.top)) continue;
            if (a.caja.right > b.caja.left + 0.5 && b.caja.right > a.caja.left + 0.5) {
              solapes.push(`${a.nombre} / ${b.nombre}`);
            }
          }
        }

        const documento = document.scrollingElement;
        if (documento === null) throw new Error('sin scrollingElement');

        return {
          filas: new Set(controles.map((c) => Math.round(c.caja.top))).size,
          fueraDeLaBarra: controles
            .filter((c) => c.caja.left < dentro.left - 0.5 || c.caja.right > dentro.right + 0.5)
            .map((c) => c.nombre),
          solapes,
          desbordeDocumento: documento.scrollWidth - documento.clientWidth,
        };
      });
    });

    test('la barra envuelve en vez de salirse', () => {
      // El aserto que caza de verdad quitar el `flex-wrap`. El de desbordamiento
      // del documento NO basta: sin envolver, la fila mide 515px y se sale de la
      // barra en toda la banda, pero como va centrada solo llega al borde del
      // viewport por debajo de ~487px. A 547px el documento no desborda y aun
      // asi la barra esta rota.
      expect(barra.fueraDeLaBarra, 'controles fuera de la caja de la barra').toEqual([]);

      // Premisa del spec: si la barra deja de necesitar dos filas a estos anchos
      // es que cambio su contenido, y esta banda hay que volver a medirla en vez
      // de seguir dandola por buena.
      expect(
        barra.filas,
        `a ${String(width)}px la barra deberia ocupar 2 filas; vuelve a medir la banda`,
      ).toBeGreaterThan(1);
    });

    test('el documento no desborda horizontalmente', () => {
      expect(barra.desbordeDocumento, 'scroll horizontal en la banda').toBeLessThanOrEqual(0);
    });

    test('ningún control se solapa con otro de su fila', () => {
      expect(barra.solapes).toEqual([]);
    });
  });
}
