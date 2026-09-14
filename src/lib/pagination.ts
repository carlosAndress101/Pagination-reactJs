/**
 * Logica pura de paginacion. Sin React, sin DOM: se testea sola.
 *
 * El algoritmo de ventana es el de `docs/design-spec.md` §3, copiado sin
 * cambios. El Architect ya lo valido contra un barrido de total=1..200 x
 * current=1..total con cero violaciones de sus propiedades.
 */

/** Marca de hueco en la ventana de paginas. No es un numero de pagina. */
export const ELLIPSIS = 'ellipsis';

/** Una posicion de la barra: o un numero de pagina, o un hueco. */
export type PageSlot = number | typeof ELLIPSIS;

/** Paginas fijas en cada extremo de la ventana. */
const BOUNDARY_COUNT = 1;
/** Vecinos visibles a cada lado de la pagina actual. */
const SIBLING_COUNT = 1;

/**
 * Umbral por debajo del cual nunca hay elipsis: caben todas las paginas.
 * boundary*2 + sibling*2 + 3 = 7.
 */
export const MAX_SLOTS = BOUNDARY_COUNT * 2 + SIBLING_COUNT * 2 + 3;

/**
 * Numero de paginas para un total de items y un tamano de pagina.
 * Con 0 items hay 0 paginas: la UI muestra el estado vacio, no una pagina 1 vacia.
 */
export function getTotalPages(totalItems: number, pageSize: number): number {
  if (!Number.isFinite(totalItems) || !Number.isFinite(pageSize)) return 0;
  if (totalItems <= 0 || pageSize <= 0) return 0;
  return Math.ceil(totalItems / pageSize);
}

/**
 * Encaja una pagina dentro de [1, totalPages].
 *
 * Es la pieza que cierra D15/A3: al cambiar el tamano de pagina cae el total
 * de paginas y la pagina actual puede quedar fuera de rango. Sin este clamp,
 * `slice()` devuelve un array vacio y la lista desaparece.
 *
 * Con `totalPages === 0` (sin datos) devuelve 1: no existe la pagina 0.
 */
export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  const target = Math.trunc(page);
  if (totalPages <= 0) return 1;
  if (target < 1) return 1;
  if (target > totalPages) return totalPages;
  return target;
}

/**
 * Ventana de paginas a renderizar, con huecos donde corresponda.
 *
 * Invariantes (verificadas por barrido en pagination.test.ts):
 * - la pagina actual siempre esta presente, nunca queda detras de un hueco;
 * - un hueco solo aparece si oculta 2 o mas paginas;
 * - nunca hay mas de MAX_SLOTS posiciones;
 * - los numeros van en orden ascendente y sin repetir; el primero es 1 y el ultimo `total`.
 */
export function getPageRange(current: number, total: number): PageSlot[] {
  if (total <= 0) return [];

  const page = clampPage(current, total);

  if (total <= MAX_SLOTS) {
    return range(1, total);
  }

  // Cerca del inicio: el hueco izquierdo ocultaria una sola pagina, asi que no se pone.
  if (page <= 4) {
    return [...range(1, 5), ELLIPSIS, total];
  }

  // Cerca del final: espejo del caso anterior.
  if (page >= total - 3) {
    return [1, ELLIPSIS, ...range(total - 4, total)];
  }

  return [1, ELLIPSIS, page - 1, page, page + 1, ELLIPSIS, total];
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}
