import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTodos } from '../lib/api';
import type { Todo } from '../types';

/**
 * Seam de datos. La UI consume siempre esta forma, tanto si detras hay un
 * unico fetch de 200 items (decision actual: paginacion en cliente) como si
 * mañana hubiera un fetch por pagina. Migrar es reescribir este archivo.
 */
export interface TodosResult {
  data: Todo[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Peticion compartida en vuelo.
 *
 * Es lo que cierra la mitad "doble peticion en dev" de D5. El patron habitual
 * de abortar en el cleanup del efecto NO sirve aqui: StrictMode ejecuta
 * efecto -> cleanup -> efecto, asi que abortar en el cleanup cancela la
 * primera peticion y dispara una segunda. Siguen siendo dos peticiones de red.
 * Compartiendo la promesa en vuelo, el segundo montaje reutiliza la primera.
 */
let inflight: { promise: Promise<Todo[]>; controller: AbortController } | null = null;

function requestTodos(): Promise<Todo[]> {
  if (inflight) return inflight.promise;

  const controller = new AbortController();
  const promise = fetchTodos(controller.signal).finally(() => {
    if (inflight?.controller === controller) inflight = null;
  });

  inflight = { promise, controller };
  return promise;
}

/** Cancela lo que haya en vuelo y olvida la peticion compartida. */
function discardInflight(): void {
  inflight?.controller.abort();
  inflight = null;
}

interface TodosState {
  data: Todo[];
  loading: boolean;
  error: Error | null;
}

const INITIAL: TodosState = { data: [], loading: true, error: null };

export function useTodos(): TodosResult {
  const [state, setState] = useState<TodosState>(INITIAL);

  // Evita actualizar estado despues de desmontar. Es la guarda correcta para
  // StrictMode; abortar aqui provocaria la segunda peticion que queremos evitar.
  const activeRef = useRef(true);

  const load = useCallback(() => {
    requestTodos().then(
      (todos) => {
        if (activeRef.current) setState({ data: todos, loading: false, error: null });
      },
      (cause: unknown) => {
        if (!activeRef.current) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      },
    );
  }, []);

  useEffect(() => {
    activeRef.current = true;
    load();
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const retry = useCallback(() => {
    discardInflight();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    load();
  }, [load]);

  return { data: state.data, loading: state.loading, error: state.error, retry };
}
