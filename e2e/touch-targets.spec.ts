import { expect, test } from '@playwright/test';
import { isCompact, stubApi } from './helpers';

/**
 * B5 — objetivo tactil: >=44px en <480px, >=40px a partir de ahi (design-spec §5).
 * jsdom no calcula layout, asi que esto solo se puede afirmar en navegador real.
 */
test.describe('B5 — objetivos táctiles', () => {
  test('todo control visible cumple el mínimo de su breakpoint', async ({ page }) => {
    await stubApi(page);
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();

    const minimo = isCompact(page) ? 44 : 40;

    const medidas = await page.evaluate(() => {
      const seleccion = 'button:not([disabled]), select:not([disabled]), a[href]';
      return [...document.querySelectorAll<HTMLElement>(seleccion)]
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            nombre: el.getAttribute('aria-label') ?? el.id ?? el.textContent?.trim() ?? '?',
            w: Number(r.width.toFixed(1)),
            h: Number(r.height.toFixed(1)),
          };
        });
    });

    expect(medidas.length).toBeGreaterThan(0);
    const pequenos = medidas.filter((m) => m.w < minimo || m.h < minimo);
    expect(pequenos, `mínimo exigido ${String(minimo)}px`).toEqual([]);
  });
});
