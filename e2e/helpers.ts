import type { Locator, Page, Route } from '@playwright/test';

export const API = 'https://jsonplaceholder.typicode.com/todos';

/** Umbral del modo compacto (design-spec §5). */
export const COMPACT_MAX = 479;

export interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

export function todos(n = 200): Todo[] {
  return Array.from({ length: n }, (_unused, i) => ({
    userId: 1,
    id: i + 1,
    title: `tarea ${String(i + 1)}`,
    completed: false,
  }));
}

export function isCompact(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) <= COMPACT_MAX;
}

/** Respuesta fija: la red real haria estos specs lentos y no deterministas. */
export async function stubApi(page: Page, body: unknown = todos()): Promise<void> {
  await page.route(API, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

export async function stubApiError(page: Page): Promise<void> {
  await page.route(API, async (route: Route) => {
    await route.fulfill({ status: 500, contentType: 'text/plain', body: 'boom' });
  });
}

/**
 * Congela la peticion para poder observar el estado de carga.
 *
 * Se intercepta y se retiene; NO se simula latencia. Con latencia la carga
 * termina antes de poder medir y el skeleton no llega a existir: la medicion
 * pasaria sin haber comprobado nada (fallo real cometido midiendo a mano T-11).
 */
export async function freezeApi(page: Page): Promise<{ release: () => Promise<void> }> {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  let settled = Promise.resolve();

  await page.route(API, async (route: Route) => {
    settled = gate.then(async () => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(todos()),
      });
    });
    await settled;
  });

  return {
    release: async () => {
      open();
      await settled;
    },
  };
}

function rgbChannels(color: string): number[] {
  const parts = color.match(/[\d.]+/g);
  if (parts === null) throw new Error(`Color no parseable: ${color}`);
  return parts.slice(0, 3).map(Number);
}

function relativeLuminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((raw) => {
    const v = raw / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos colores computados (`rgb(...)`). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(rgbChannels(fg));
  const l2 = relativeLuminance(rgbChannels(bg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

/** Color de fondo efectivo: sube por los ancestros hasta encontrar uno opaco. */
export async function effectiveBackground(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    let node: Element | null = document.querySelector(sel);
    while (node !== null) {
      const color = getComputedStyle(node).backgroundColor;
      if (color !== '' && !/rgba\(0, 0, 0, 0\)|transparent/.test(color)) return color;
      node = node.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }, selector);
}

/**
 * `toBeVisible` de Playwright considera visible un nodo `sr-only`: mide 1x1 pero
 * tiene caja. Para distinguir "oculto a la vista pero presente para el lector"
 * hay que mirar el recorte y el tamano real.
 */
export async function isVisuallyHidden(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    const r = el.getBoundingClientRect();
    const recortado = cs.clipPath !== 'none' || cs.clip !== 'auto';
    return recortado || (r.width <= 1 && r.height <= 1);
  });
}
