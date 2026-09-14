import type { Todo } from '../types';

/** Error tipado de la capa de datos: la UI distingue "fallo al cargar" de cualquier otro. */
export class TodosError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TodosError';
  }
}

export const TODOS_URL = 'https://jsonplaceholder.typicode.com/todos';

function isTodo(value: unknown): value is Todo {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['userId'] === 'number' &&
    typeof candidate['id'] === 'number' &&
    typeof candidate['title'] === 'string' &&
    typeof candidate['completed'] === 'boolean'
  );
}

/**
 * Descarga la lista de tareas. Unico punto de I/O de la app.
 *
 * Valida la forma de la respuesta a mano en vez de con un validador externo:
 * son cuatro campos de un unico endpoint. Sustituye al
 * `response.json() as Promise<Todo[]>` que T-06 dejo como puente.
 *
 * `signal` permite cancelar; un abort se propaga como `AbortError`, no como
 * `TodosError`, para que quien llama pueda ignorarlo en vez de pintarlo.
 */
export async function fetchTodos(signal?: AbortSignal): Promise<Todo[]> {
  let response: Response;
  try {
    response = await fetch(TODOS_URL, signal ? { signal } : undefined);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new TodosError('No se pudo conectar con el servidor.', { cause });
  }

  if (!response.ok) {
    throw new TodosError(`El servidor respondio ${String(response.status)}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new TodosError('La respuesta del servidor no es JSON valido.', { cause });
  }

  if (!Array.isArray(payload) || !payload.every(isTodo)) {
    throw new TodosError('La respuesta del servidor no tiene el formato esperado.');
  }

  return payload;
}
