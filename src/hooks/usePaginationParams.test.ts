import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePaginationParams } from './usePaginationParams';

/** Deja el historial en una sola entrada limpia antes de cada prueba. */
function resetUrl(search = '') {
  window.history.replaceState(null, '', search === '' ? '/' : `/?${search}`);
}

/** Espera a que jsdom entregue el `popstate` que dispara back()/forward(). */
function waitForPopState(action: () => void) {
  return act(
    async () =>
      await new Promise<void>((resolve) => {
        window.addEventListener(
          'popstate',
          () => {
            resolve();
          },
          { once: true },
        );
        action();
      }),
  );
}

beforeEach(() => {
  resetUrl();
});
afterEach(() => {
  resetUrl();
});

describe('usePaginationParams — lectura inicial (A5/A6)', () => {
  it('sin query string arranca en los valores por defecto', () => {
    const { result } = renderHook(() => usePaginationParams());
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it('lee page y pageSize de la URL', () => {
    resetUrl('page=4&pageSize=50');
    const { result } = renderHook(() => usePaginationParams());
    expect(result.current.page).toBe(4);
    expect(result.current.pageSize).toBe(50);
  });

  it('parametros invalidos no rompen el hook: se sanean (A6)', () => {
    resetUrl('page=abc&pageSize=7');
    const { result } = renderHook(() => usePaginationParams());
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });
});

describe('usePaginationParams — escritura en la URL', () => {
  it('cambiar de pagina escribe la URL y actualiza el estado', () => {
    const { result } = renderHook(() => usePaginationParams());
    act(() => {
      result.current.setParams({ page: 3 });
    });
    expect(window.location.search).toBe('?page=3');
    expect(result.current.page).toBe(3);
  });

  it('cambiar el tamano conserva la pagina: el hook no decide reglas de producto', () => {
    resetUrl('page=3');
    const { result } = renderHook(() => usePaginationParams());
    act(() => {
      result.current.setParams({ pageSize: 50 });
    });
    expect(window.location.search).toBe('?page=3&pageSize=50');
    expect(result.current).toMatchObject({ page: 3, pageSize: 50 });
  });

  it('volver a los valores por defecto deja la URL limpia, sin query string', () => {
    resetUrl('page=5&pageSize=20');
    const { result } = renderHook(() => usePaginationParams());
    act(() => {
      result.current.setParams({ page: 1, pageSize: 10 });
    });
    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/');
  });
});

describe('usePaginationParams — historial', () => {
  it('no apila entradas al fijar los mismos valores (sin bucles de historial)', () => {
    const { result } = renderHook(() => usePaginationParams());
    const largoInicial = window.history.length;

    act(() => {
      result.current.setParams({ page: 2 });
    });
    const largoTrasCambio = window.history.length;

    act(() => {
      result.current.setParams({ page: 2 });
    });
    act(() => {
      result.current.setParams({ page: 2 });
    });

    expect(largoTrasCambio).toBe(largoInicial + 1);
    expect(window.history.length).toBe(largoTrasCambio);
  });

  it('atras del navegador devuelve al estado anterior', async () => {
    const { result } = renderHook(() => usePaginationParams());

    act(() => {
      result.current.setParams({ page: 2 });
    });
    act(() => {
      result.current.setParams({ page: 3 });
    });
    expect(result.current.page).toBe(3);

    await waitForPopState(() => {
      window.history.back();
    });
    expect(window.location.search).toBe('?page=2');
    expect(result.current.page).toBe(2);

    await waitForPopState(() => {
      window.history.back();
    });
    expect(window.location.search).toBe('');
    expect(result.current.page).toBe(1);
  });

  it('adelante rehace el camino', async () => {
    const { result } = renderHook(() => usePaginationParams());

    act(() => {
      result.current.setParams({ page: 2, pageSize: 20 });
    });
    await waitForPopState(() => {
      window.history.back();
    });
    expect(result.current).toMatchObject({ page: 1, pageSize: 10 });

    await waitForPopState(() => {
      window.history.forward();
    });
    expect(window.location.search).toBe('?page=2&pageSize=20');
    expect(result.current).toMatchObject({ page: 2, pageSize: 20 });
  });

  it('una URL editada a mano con basura se sanea al navegar hacia ella', async () => {
    const { result } = renderHook(() => usePaginationParams());
    act(() => {
      result.current.setParams({ page: 2 });
    });

    window.history.pushState(null, '', '/?page=abc&pageSize=7');
    await waitForPopState(() => {
      window.history.back();
    });
    await waitForPopState(() => {
      window.history.forward();
    });

    expect(window.location.search).toBe('?page=abc&pageSize=7');
    expect(result.current).toMatchObject({ page: 1, pageSize: 10 });
  });

  it('deja de escuchar popstate al desmontarse', async () => {
    const { result, unmount } = renderHook(() => usePaginationParams());
    act(() => {
      result.current.setParams({ page: 2 });
    });
    unmount();
    await waitForPopState(() => {
      window.history.back();
    });
    expect(window.location.search).toBe('');
  });
});
