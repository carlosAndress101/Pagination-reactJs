import { expect, test } from '@playwright/test';
import { freezeApi, stubApi } from './helpers';

/**
 * B6 — `prefers-reduced-motion`, y estabilidad de altura entre estados (§4).
 *
 * REQUISITO DE METODO: el estado de carga se congela interceptando y reteniendo
 * la peticion, NO simulando latencia. Con latencia la carga termina antes de
 * poder observar y el skeleton no llega a existir: el spec pasaria sin haber
 * comprobado nada (fallo real cometido midiendo a mano en T-11).
 */
test.describe('B6 — movimiento reducido', () => {
  test.describe('con reduce', () => {
    test.use({ reducedMotion: 'reduce' });

    test('el shimmer del esqueleto se apaga y queda color plano', async ({ page }) => {
      const { release } = await freezeApi(page);
      await page.goto('/');

      const barra = page.locator('.skeleton-bar').first();
      await expect(barra).toBeAttached();

      const estilo = await barra.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          animationName: cs.animationName,
          backgroundImage: cs.backgroundImage,
          backgroundColor: cs.backgroundColor,
        };
      });
      expect(estilo.animationName).toBe('none');
      expect(estilo.backgroundImage).toBe('none');
      expect(estilo.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

      await release();
    });
  });

  test.describe('sin preferencia', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('el shimmer sí corre', async ({ page }) => {
      const { release } = await freezeApi(page);
      await page.goto('/');

      const barra = page.locator('.skeleton-bar').first();
      await expect(barra).toBeAttached();

      const estilo = await barra.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { animationName: cs.animationName, animationDuration: cs.animationDuration };
      });
      expect(estilo.animationName).toBe('skeleton-shimmer');
      expect(estilo.animationDuration).toBe('1.4s');

      await release();
    });

    test('no hay transiciones de movimiento entre páginas, solo de color', async ({ page }) => {
      await stubApi(page);
      await page.goto('/');
      await expect(page.getByText(/Mostrando/)).toBeVisible();

      const propiedades = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('body *')]
          .map((el) => getComputedStyle(el).transitionProperty)
          .filter((p) => p !== 'none' && p !== 'all'),
      );
      const conMovimiento = propiedades.filter((p) =>
        /transform|translate|top|left|margin/.test(p),
      );
      expect(conMovimiento).toEqual([]);
    });
  });
});

test.describe('§4 — el contenedor no salta entre estados', () => {
  for (const pageSize of [10, 20, 50]) {
    test(`misma altura en carga y cargado con pageSize=${String(pageSize)}`, async ({ page }) => {
      const { release } = await freezeApi(page);
      await page.goto(`/?pageSize=${String(pageSize)}`);

      const contenedor = page.locator('.screen__content');
      await expect(page.locator('.skeleton-row').first()).toBeAttached();
      await expect(page.locator('.skeleton-row')).toHaveCount(pageSize);
      const cargando = (await contenedor.boundingBox())?.height ?? 0;

      await release();
      await expect(page.getByText(/Mostrando/)).toHaveText(/Mostrando/);
      await expect(page.locator('.todo-list__item').first()).toBeVisible();
      const cargado = (await contenedor.boundingBox())?.height ?? 0;

      expect(Math.abs(cargado - cargando), `salto de altura`).toBeLessThan(1);
    });
  }

  test('durante la carga todos los controles están apagados', async ({ page }) => {
    const { release } = await freezeApi(page);
    await page.goto('/');

    await expect(page.locator('.skeleton-row').first()).toBeAttached();
    const habilitados = await page.evaluate(
      () =>
        [...document.querySelectorAll('nav button, nav select')].filter(
          (el) => !(el as HTMLButtonElement).disabled,
        ).length,
    );
    expect(habilitados).toBe(0);
    await expect(page.locator('[aria-live]')).toHaveText('Cargando resultados…');

    await release();
  });
});
