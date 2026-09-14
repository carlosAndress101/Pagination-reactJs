import { expect, test } from '@playwright/test';
import { contrastRatio, effectiveBackground, isCompact, stubApi } from './helpers';

/**
 * B5 — contraste AA medido sobre el color computado, en los dos esquemas.
 * jsdom no aplica cascada, asi que estos ratios solo existen en navegador real.
 */
const AA_TEXTO = 4.5;
const AA_UI = 3;

interface Par {
  nombre: string;
  selector: string;
  propiedad: 'color' | 'borderTopColor';
  /** Cuando el fondo relevante no es el del propio elemento. */
  fondoDe?: string;
  minimo: number;
}

const PARES: Par[] = [
  { nombre: 'ítem de lista', selector: '.todo-list__item', propiedad: 'color', minimo: AA_TEXTO },
  { nombre: 'título', selector: 'h1', propiedad: 'color', minimo: AA_TEXTO },
  {
    nombre: 'botón de extremo (texto)',
    selector: 'button[aria-label="Página siguiente"]',
    propiedad: 'color',
    minimo: AA_TEXTO,
  },
  {
    nombre: 'botón de extremo (borde)',
    selector: 'button[aria-label="Página siguiente"]',
    propiedad: 'borderTopColor',
    fondoDe: 'body',
    minimo: AA_UI,
  },
  {
    nombre: 'select de tamaño (borde)',
    selector: '#page-size',
    propiedad: 'borderTopColor',
    fondoDe: 'body',
    minimo: AA_UI,
  },
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`contraste — ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test('los pares de texto y UI cumplen AA', async ({ page }) => {
      await stubApi(page);
      await page.goto('/');
      await expect(page.getByText(/Mostrando/)).toBeVisible();

      for (const par of PARES) {
        const fg = await page.evaluate(
          ([sel, prop]) => {
            const el = document.querySelector(sel as string);
            if (el === null) throw new Error(`No existe ${sel as string}`);
            return getComputedStyle(el)[prop as 'color'];
          },
          [par.selector, par.propiedad],
        );
        const bg = await effectiveBackground(page, par.fondoDe ?? par.selector);
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `${par.nombre}: ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(par.minimo);
      }
    });

    test('el resumen cumple AA cuando es visible', async ({ page }) => {
      test.skip(isCompact(page), 'en compacto el resumen es sr-only');
      await stubApi(page);
      await page.goto('/');
      await expect(page.getByText(/Mostrando/)).toBeVisible();

      const fg = await page.locator('.status-message').evaluate((el) => getComputedStyle(el).color);
      const bg = await effectiveBackground(page, '.status-message');
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXTO);
    });

    test('la página actual: texto sobre su relleno, y borde contra la página', async ({ page }) => {
      test.skip(isCompact(page), 'en compacto no se muestran los números');
      await stubApi(page);
      await page.goto('/');
      await expect(page.getByText(/Mostrando/)).toBeVisible();

      const actual = page.locator('[aria-current="page"]');
      const estilo = await actual.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.color, fondo: cs.backgroundColor, borde: cs.borderTopColor };
      });
      const fondoPagina = await effectiveBackground(page, 'body');

      expect(
        contrastRatio(estilo.color, estilo.fondo),
        'texto de la página actual sobre su relleno',
      ).toBeGreaterThanOrEqual(AA_TEXTO);

      // El relleno por si solo no basta como indicador; el borde de 2px es el
      // que tiene que sostener el limite (design-spec §2.2).
      expect(
        contrastRatio(estilo.borde, fondoPagina),
        'borde de la página actual contra el fondo',
      ).toBeGreaterThanOrEqual(AA_UI);
    });

    test('el mensaje de error cumple AA', async ({ page }) => {
      await page.route('https://jsonplaceholder.typicode.com/todos', async (route) => {
        await route.fulfill({ status: 500, contentType: 'text/plain', body: 'boom' });
      });
      await page.goto('/');

      const mensaje = page.locator('.error-banner__message');
      await expect(mensaje).toBeVisible();

      const fg = await mensaje.evaluate((el) => getComputedStyle(el).color);
      const bg = await effectiveBackground(page, '.error-banner');
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXTO);
    });
  });
}
