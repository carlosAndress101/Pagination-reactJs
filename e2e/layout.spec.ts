import { expect, test } from '@playwright/test';
import { isCompact, isVisuallyHidden, stubApi } from './helpers';

/** C1 — sin scroll horizontal desde 320px, en cualquier esquema de color. */
test.describe('C1 — layout', () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
  });

  test('el documento no desborda horizontalmente', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => {
      const d = document.scrollingElement;
      if (d === null) throw new Error('sin scrollingElement');
      return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
    });
    expect(scrollWidth, `desborda ${String(scrollWidth - clientWidth)}px`).toBeLessThanOrEqual(
      clientWidth,
    );
  });

  test('tampoco desborda en modo oscuro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();

    const overflow = await page.evaluate(() => {
      const d = document.scrollingElement;
      if (d === null) throw new Error('sin scrollingElement');
      return d.scrollWidth - d.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('ningún elemento sobresale del ancho del viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();

    const desbordados = await page.evaluate(() => {
      const limite = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => el.getBoundingClientRect().right > limite + 0.5)
        .map((el) => `${el.tagName}.${el.className.toString()}`);
    });
    expect(desbordados).toEqual([]);
  });

  test('el modo compacto muestra lo que toca a cada ancho', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();

    const numeros = page.getByRole('button', { name: /^Página \d+$/ });
    const salto = page.getByLabel('Ir a la página');

    if (isCompact(page)) {
      // <480px: fuera los numeros, dentro el salto directo (design-spec §5).
      await expect(numeros.first()).toBeHidden();
      await expect(salto).toBeVisible();
    } else {
      await expect(numeros.first()).toBeVisible();
      await expect(salto).toBeHidden();
    }

    // Los cuatro botones de extremo existen a cualquier ancho.
    for (const nombre of [
      'Primera página',
      'Página anterior',
      'Página siguiente',
      'Última página',
    ]) {
      await expect(page.getByRole('button', { name: nombre })).toBeAttached();
    }
  });

  /**
   * D18 — WCAG 3.1.1. El unico de los 18 defectos que se cerro sin test de
   * regresion: el atributo estaba en `index.html`, pero nada impedia perderlo.
   */
  test('el documento declara su idioma', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('el resumen es visible en escritorio y sr-only en compacto', async ({ page }) => {
    await page.goto('/');
    const live = page.locator('[aria-live]');
    await expect(live).toHaveText(/Mostrando/);

    // Ojo: en compacto el nodo SIGUE en el DOM y sigue anunciando; lo que
    // cambia es que deja de verse. `toBeHidden` no sirve: un sr-only mide 1x1
    // y Playwright lo da por visible.
    expect(await isVisuallyHidden(live)).toBe(isCompact(page));
  });
});
