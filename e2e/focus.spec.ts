import { expect, test } from '@playwright/test';
import { isCompact, stubApi } from './helpers';

/**
 * B2/B3 — foco y pagina actual.
 *
 * REQUISITO DE METODO: se navega con `keyboard.press('Tab')`, nunca con
 * `element.focus()`. Chromium no aplica `:focus-visible` al foco programatico,
 * asi que un spec escrito con `.focus()` mediria `outline: none` y daria un
 * falso negativo sobre una hoja de estilos correcta (comprobado en T-11).
 */
test.describe('B3 — foco', () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await page.goto('/');
    await expect(page.getByText(/Mostrando/)).toBeVisible();
  });

  test('el anillo de foco es visible al tabular (D11)', async ({ page }) => {
    await page.keyboard.press('Tab');

    const anillo = await page.evaluate(() => {
      const el = document.activeElement;
      if (el === null || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        nombre: el.getAttribute('aria-label') ?? el.id,
        style: cs.outlineStyle,
        width: Number.parseFloat(cs.outlineWidth),
        color: cs.outlineColor,
        offset: Number.parseFloat(cs.outlineOffset),
      };
    });

    expect(anillo, 'el primer Tab no enfocó nada').not.toBeNull();
    expect(anillo?.style).not.toBe('none');
    expect(anillo?.width).toBeGreaterThanOrEqual(2);
    expect(anillo?.offset).toBeGreaterThanOrEqual(2);
  });

  test('todos los controles enfocables muestran anillo, ninguno lo pierde', async ({ page }) => {
    const sinAnillo: string[] = [];

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const estado = await page.evaluate(() => {
        const el = document.activeElement;
        if (el === null || el === document.body) return null;
        const cs = getComputedStyle(el);
        return {
          nombre: el.getAttribute('aria-label') ?? el.id ?? el.tagName,
          visible: cs.outlineStyle !== 'none' && Number.parseFloat(cs.outlineWidth) > 0,
        };
      });
      if (estado === null) break;
      if (!estado.visible) sinAnillo.push(estado.nombre);
    }

    expect(sinAnillo).toEqual([]);
  });

  test('el orden de tabulación sigue el DOM y no hay tabindex positivo', async ({ page }) => {
    // Se comprueba en una pagina intermedia a proposito: en la primera, Primera
    // y Anterior estan deshabilitados y por tanto fuera del orden de tabulacion,
    // asi que el recorrido no ejercitaria el orden completo.
    await page.goto('/?page=5');
    await expect(page.getByText(/Mostrando/)).toBeVisible();

    const positivos = await page.evaluate(() =>
      [...document.querySelectorAll('[tabindex]')]
        .map((el) => Number(el.getAttribute('tabindex')))
        .filter((n) => n > 0),
    );
    expect(positivos).toEqual([]);

    const recorrido: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      recorrido.push(
        await page.evaluate(
          () =>
            document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.id ?? '',
        ),
      );
    }
    const esperado = isCompact(page)
      ? ['page-size', 'Primera página', 'Página anterior', 'Ir a la página']
      : ['page-size', 'Primera página', 'Página anterior', 'Página 1'];
    expect(recorrido).toEqual(esperado);
  });

  test('el foco se queda en el botón pulsado al cambiar de página', async ({ page }) => {
    const siguiente = page.getByRole('button', { name: 'Página siguiente' });
    while (
      (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) !==
      'Página siguiente'
    ) {
      await page.keyboard.press('Tab');
    }

    await page.keyboard.press('Enter');
    await expect(page.getByText('Mostrando 11–20 de 200 resultados')).toBeVisible();
    await expect(siguiente).toBeFocused();
  });

  test('el foco no se pierde cuando el botón pulsado se queda deshabilitado', async ({ page }) => {
    // Este es el caso que jsdom no reproduce: el navegador saca el foco del
    // elemento deshabilitado y lo manda al body si nadie lo reubica.
    const ultima = page.getByRole('button', { name: 'Última página' });
    while (
      (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) !==
      'Última página'
    ) {
      await page.keyboard.press('Tab');
    }

    await page.keyboard.press('Enter');
    await expect(ultima).toBeDisabled();

    const donde = await page.evaluate(() =>
      document.activeElement === document.body
        ? 'body'
        : (document.activeElement?.getAttribute('aria-label') ?? '?'),
    );
    expect(donde, 'el foco se perdió al deshabilitarse el botón').toBe('Primera página');
  });

  test('B2 — aria-current="page" marca exactamente una página', async ({ page }) => {
    test.skip(isCompact(page), 'en compacto no se muestran los números');
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[aria-current="page"]')).toHaveText('1');

    await page.getByRole('button', { name: 'Página 3' }).click();
    await expect(page.locator('[aria-current="page"]')).toHaveText('3');
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
  });
});
