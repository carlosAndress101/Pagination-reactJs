import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTodos, TODOS_URL, TodosError } from './api';

const todo = { userId: 1, id: 1, title: 'algo', completed: false };

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response> | Response;

function mockFetch(impl: FetchImpl) {
  const spy = vi.fn<FetchImpl>(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchTodos', () => {
  it('devuelve la lista cuando la respuesta es valida', async () => {
    const spy = mockFetch(() => json([todo]));
    await expect(fetchTodos()).resolves.toEqual([todo]);
    expect(spy).toHaveBeenCalledWith(TODOS_URL, undefined);
  });

  it('acepta una lista vacia', async () => {
    mockFetch(() => json([]));
    await expect(fetchTodos()).resolves.toEqual([]);
  });

  it('lanza TodosError si el servidor responde con error HTTP', async () => {
    mockFetch(() => json({}, 500));
    await expect(fetchTodos()).rejects.toThrow(TodosError);
    await expect(fetchTodos()).rejects.toThrow('500');
  });

  it('lanza TodosError si la red falla', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(fetchTodos()).rejects.toThrow(TodosError);
  });

  it('lanza TodosError si el cuerpo no es JSON', async () => {
    mockFetch(() => new Response('<html>nope</html>', { status: 200 }));
    await expect(fetchTodos()).rejects.toThrow(TodosError);
  });

  it.each([
    ['un objeto en vez de un array', { todos: [] }],
    ['un elemento sin id', [{ userId: 1, title: 'x', completed: false }]],
    ['un id que no es numero', [{ ...todo, id: '1' }]],
    ['un completed que no es booleano', [{ ...todo, completed: 'no' }]],
    ['un null dentro del array', [todo, null]],
  ])('rechaza una respuesta con %s', async (_caso, body) => {
    mockFetch(() => json(body));
    await expect(fetchTodos()).rejects.toThrow(TodosError);
  });

  it('propaga el AbortError sin envolverlo, para poder ignorarlo', async () => {
    const controller = new AbortController();
    mockFetch((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    const pending = fetchTodos(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(pending).rejects.not.toBeInstanceOf(TodosError);
  });

  it('pasa la señal a fetch cuando se le da una', async () => {
    const controller = new AbortController();
    const spy = mockFetch(() => json([todo]));
    await fetchTodos(controller.signal);
    expect(spy).toHaveBeenCalledWith(TODOS_URL, { signal: controller.signal });
  });
});
