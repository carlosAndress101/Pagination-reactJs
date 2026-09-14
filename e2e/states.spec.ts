import { expect, test } from '@playwright/test';
import { isCompact, isVisuallyHidden, stubApi, stubApiError, todos } from './helpers';

test.describe('A4 — estados en navegador real', () => {
  test('error: una sola copia visible del mensaje, y sigue anunciándose (T-02c)', async ({
    page,
  }) => {
    await stubApiError(page);
    await page.goto('/');

    const texto = 'No se pudieron cargar los resultados. Inténtalo de nuevo.';
    await expect(page.locator('.error-banner__message')).toHaveText(texto);

    const live = page.locator('[aria-live]');
    await expect(live).toHaveText(texto);
    expect(await isVisuallyHidden(live), 'el resumen debe quedar sr-only en error').toBe(true);
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

    const visibles = await page.evaluate((esperado) => {
      return [...document.querySelectorAll('*')].filter((n) => {
        if (n.children.length > 0 || n.textContent?.trim() !== esperado) return false;
        const r = n.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      }).length;
    }, texto);
    expect(visibles).toBe(1);
  });

  test('vacío: mensaje de estado vacío, sin banner de error', async ({ page }) => {
    await stubApi(page, []);
    await page.goto('/');

    await expect(page.getByText('No hay resultados que mostrar.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  });

  test('reintentar vuelve a pedir los datos y recupera la lista', async ({ page }) => {
    let fallar = true;
    await page.route('https://jsonplaceholder.typicode.com/todos', async (route) => {
      if (fallar) {
        await route.fulfill({ status: 500, contentType: 'text/plain', body: 'boom' });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(todos()),
        });
      }
    });
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    fallar = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.getByText('Mostrando 1–10 de 200 resultados')).toBeVisible();
  });

  test('A5 — la URL refleja la página y el back del navegador funciona', async ({ page }) => {
    await stubApi(page);
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();

    // En compacto se navega con el salto directo; en escritorio, con el numero.
    if (isCompact(page)) {
      await page.getByLabel('Ir a la página').selectOption('4');
    } else {
      await page.getByRole('button', { name: 'Página 4' }).click();
    }
    await expect(page.getByText('Mostrando 31–40 de 200 resultados')).toBeVisible();
    expect(new URL(page.url()).search).toBe('?page=4');

    await page.goBack();
    await expect(page.getByText('Mostrando 1–10 de 200 resultados')).toBeVisible();
  });

  /**
   * Ojo con el alcance: esto corre contra el build de produccion, donde
   * StrictMode NO duplica efectos. Afirma que la pantalla pide los datos una
   * sola vez, no que el dedupe de StrictMode funcione; eso lo cubre
   * `useTodos.test.tsx`, que si corre en modo desarrollo.
   */
  test('la pantalla pide los datos una sola vez al cargar', async ({ page }) => {
    let llamadas = 0;
    await page.route('https://jsonplaceholder.typicode.com/todos', async (route) => {
      llamadas += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(todos()),
      });
    });
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();
    expect(llamadas).toBe(1);
  });
});
