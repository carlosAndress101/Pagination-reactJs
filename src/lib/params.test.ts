import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  parseParams,
  serializeParams,
} from './params';
import { clampPage, getTotalPages } from './pagination';

describe('parseParams — casos A6 exigidos por el Master Plan', () => {
  it('page=0 -> 1', () => {
    expect(parseParams('page=0').page).toBe(1);
  });

  it('page=999 se acepta aqui: el recorte contra el total real lo hace clampPage', () => {
    expect(parseParams('page=999').page).toBe(999);
    expect(clampPage(parseParams('page=999').page, getTotalPages(200, 10))).toBe(20);
  });

  it('page=abc -> 1', () => {
    expect(parseParams('page=abc').page).toBe(1);
  });

  it('pageSize=7 no esta en la lista permitida -> por defecto', () => {
    expect(parseParams('pageSize=7').pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('page mayor que el total de paginas queda encajado por clampPage', () => {
    const { page, pageSize } = parseParams('page=45&pageSize=50');
    expect(clampPage(page, getTotalPages(200, pageSize))).toBe(4);
  });
});

describe('parseParams — entradas ausentes o degeneradas', () => {
  it('sin parametros devuelve los valores por defecto', () => {
    expect(parseParams('')).toEqual({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE });
  });

  it.each([
    ['page=-4', 1],
    ['page=1.5', 1],
    ['page=', 1],
    ['page=%20', 1],
    ['page=1e3', 1],
    ['page=Infinity', 1],
    ['page=0x10', 1],
    ['page=null', 1],
    ['page=undefined', 1],
    ['page=9007199254740993', 1],
    ['page=+5', 5], // '+' en query string decodifica a espacio: ' 5' -> 5
    ['page=005', 5],
    ['page=  7  ', 7],
  ])('%s -> page %i', (query, esperado) => {
    expect(parseParams(query).page).toBe(esperado);
  });

  it.each([
    ['pageSize=0', DEFAULT_PAGE_SIZE],
    ['pageSize=-10', DEFAULT_PAGE_SIZE],
    ['pageSize=abc', DEFAULT_PAGE_SIZE],
    ['pageSize=25', DEFAULT_PAGE_SIZE],
    ['pageSize=1000', DEFAULT_PAGE_SIZE],
    ['pageSize=10.0', DEFAULT_PAGE_SIZE],
    ['pageSize=20', 20],
    ['pageSize=100', 100],
  ])('%s -> pageSize %i', (query, esperado) => {
    expect(parseParams(query).pageSize).toBe(esperado);
  });

  it('acepta tambien un URLSearchParams, no solo una cadena', () => {
    expect(parseParams(new URLSearchParams({ page: '3', pageSize: '50' }))).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('parametros ajenos se ignoran sin romper nada', () => {
    expect(parseParams('utm_source=x&page=2&foo=bar')).toEqual({ page: 2, pageSize: 10 });
  });

  it('todos los tamanos ofrecidos sobreviven al parseo', () => {
    for (const size of PAGE_SIZES) {
      expect(parseParams(`pageSize=${String(size)}`).pageSize).toBe(size);
    }
  });
});

describe('serializeParams', () => {
  it('omite los valores por defecto para dejar la URL inicial limpia', () => {
    expect(serializeParams({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE })).toBe('');
  });

  it('emite solo lo que se aparta del valor por defecto', () => {
    expect(serializeParams({ page: 3, pageSize: DEFAULT_PAGE_SIZE })).toBe('page=3');
    expect(serializeParams({ page: DEFAULT_PAGE, pageSize: 50 })).toBe('pageSize=50');
    expect(serializeParams({ page: 3, pageSize: 50 })).toBe('page=3&pageSize=50');
  });

  it('ida y vuelta: parse(serialize(p)) === p para toda combinacion valida', () => {
    for (const pageSize of PAGE_SIZES) {
      for (const page of [1, 2, 7, 20, 199, 1000]) {
        const original = { page, pageSize };
        expect(parseParams(serializeParams(original))).toEqual(original);
      }
    }
  });
});
