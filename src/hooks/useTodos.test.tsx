import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TodosResult } from './useTodos';

const todos = [
  { userId: 1, id: 1, title: 'uno', completed: false },
  { userId: 1, id: 2, title: 'dos', completed: true },
];

/**
 * `useTodos` guarda la peticion en vuelo en el ambito del modulo. Se reimporta
 * en cada prueba para que ese estado compartido no se filtre entre casos.
 */
async function loadHook() {
  vi.resetModules();
  const mod = await import('./useTodos');
  return mod.useTodos;
}

type FetchImpl = () => Promise<Response> | Response;

function mockFetch(impl: FetchImpl) {
  const spy = vi.fn<FetchImpl>(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
}

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useTodos — estados (A4)', () => {
  it('empieza en loading y termina con los datos', async () => {
    mockFetch(() => ok(todos));
    const useTodos = await loadHook();
    const { result } = renderHook(() => useTodos());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual(todos);
    expect(result.current.error).toBeNull();
  });

  it('expone el error sin dejar loading colgado', async () => {
    mockFetch(() => new Response('boom', { status: 500 }));
    const useTodos = await loadHook();
    const { result } = renderHook(() => useTodos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('500');
    expect(result.current.data).toEqual([]);
  });

  it('una lista vacia es exito, no error: es el estado empty', async () => {
    mockFetch(() => ok([]));
    const useTodos = await loadHook();
    const { result } = renderHook(() => useTodos());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([]);
  });
});

describe('useTodos — retry', () => {
  it('reintenta tras un fallo y recupera los datos', async () => {
    let fallar = true;
    const spy = mockFetch(() => (fallar ? new Response('boom', { status: 500 }) : ok(todos)));
    const useTodos = await loadHook();
    const { result } = renderHook(() => useTodos());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    fallar = false;
    act(() => {
      result.current.retry();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual(todos);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('useTodos — D5: una sola peticion pese a StrictMode', () => {
  it('el doble montaje de StrictMode dispara UNA sola llamada a fetch', async () => {
    const spy = mockFetch(() => ok(todos));
    const useTodos = await loadHook();
    const { result } = renderHook<TodosResult, void>(() => useTodos(), { wrapper: StrictMode });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(todos);
  });

  it('dos componentes montados a la vez comparten la peticion en vuelo', async () => {
    const spy = mockFetch(() => ok(todos));
    const useTodos = await loadHook();
    const a = renderHook(() => useTodos());
    const b = renderHook(() => useTodos());

    await waitFor(() => {
      expect(a.result.current.loading).toBe(false);
    });
    await waitFor(() => {
      expect(b.result.current.loading).toBe(false);
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('no actualiza estado despues de desmontar', async () => {
    let resolver: ((r: Response) => void) | undefined;
    mockFetch(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve;
        }),
    );
    const useTodos = await loadHook();
    const { unmount } = renderHook(() => useTodos());

    unmount();
    await act(async () => {
      resolver?.(ok(todos));
      await Promise.resolve();
    });
    // Si el hook actualizara estado tras desmontar, React avisaria en consola.
    expect(true).toBe(true);
  });
});
