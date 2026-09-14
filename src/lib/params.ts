/**
 * Saneado de los parametros de URL. Puro: recibe y devuelve datos, no toca
 * `window` ni el historial. Quien habla con la URL es `usePaginationParams` (T-08).
 *
 * Cubre A6: `page=0`, `page=999`, `page=abc`, `pageSize=7` y cualquier otra
 * entrada rara se sanean sin romper la UI.
 */

/** Tamanos de pagina ofrecidos (design-spec §3, [AJUSTABLE] confirmado por el Orchestrator). */
export const PAGE_SIZES = [10, 20, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 10;
export const DEFAULT_PAGE = 1;

export interface PageParams {
  page: number;
  pageSize: PageSize;
}

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

/**
 * Entero positivo estricto a partir de un valor de query string.
 * Rechaza vacio, no numerico, decimal, negativo, cero, notacion exponencial e infinitos.
 * Devuelve `null` cuando no hay un entero positivo utilizable.
 */
function parsePositiveInt(raw: string | null): number | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 1) return null;
  return value;
}

/**
 * Lee `page` y `pageSize` de la URL y los devuelve siempre utilizables.
 *
 * `page` se sanea estructuralmente (entero >= 1); el recorte contra el total
 * real de paginas es `clampPage`, porque aqui todavia no se sabe cuantas hay.
 * `pageSize` fuera de la lista permitida cae al valor por defecto.
 */
export function parseParams(input: URLSearchParams | string): PageParams {
  const search = typeof input === 'string' ? new URLSearchParams(input) : input;

  const page = parsePositiveInt(search.get('page')) ?? DEFAULT_PAGE;

  const rawSize = parsePositiveInt(search.get('pageSize'));
  const pageSize = rawSize !== null && isPageSize(rawSize) ? rawSize : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

/**
 * Serializa a query string. Los valores por defecto se omiten para que la vista
 * inicial tenga una URL limpia y `?page=3` sea un enlace compartible minimo.
 * `parseParams(serializeParams(p))` devuelve `p` para cualquier `p` valido.
 */
export function serializeParams(params: PageParams): string {
  const search = new URLSearchParams();
  if (params.page !== DEFAULT_PAGE) search.set('page', String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) search.set('pageSize', String(params.pageSize));
  return search.toString();
}
