import { useTodos } from '../hooks/useTodos';
import { usePaginationParams } from '../hooks/usePaginationParams';
import { clampPage, getTotalPages } from '../lib/pagination';
import type { PageSize } from '../lib/params';
import { ErrorBanner } from './ErrorBanner';
import { PageSizeSelect } from './PageSizeSelect';
import { PaginationControls } from './PaginationControls';
import { Skeleton } from './Skeleton';
import { StatusMessage } from './StatusMessage';
import { TodoList } from './TodoList';

const ERROR_TEXT = 'No se pudieron cargar los resultados. Inténtalo de nuevo.';

/**
 * DEC-07: al cambiar el tamano de pagina, el usuario se queda anclado al primer
 * elemento que estaba viendo. Ni recortar a la ultima pagina valida (lo manda a
 * un sitio arbitrario) ni volver a la 1 (pierde la posicion).
 *
 * El resultado es siempre una pagina valida por construccion, porque el indice
 * del primer elemento visible es menor que el total.
 */
export function anchoredPage(currentPage: number, previousSize: number, nextSize: number): number {
  return Math.floor(((currentPage - 1) * previousSize) / nextSize) + 1;
}

export function PaginationScreen() {
  const { data, loading, error, retry } = useTodos();
  const { page, pageSize, setParams } = usePaginationParams();

  const totalItems = data.length;
  const totalPages = getTotalPages(totalItems, pageSize);

  // A6: el `page` que llega de la URL se encaja contra el total real, que solo
  // se conoce con los datos ya cargados.
  const currentPage = clampPage(page, totalPages);

  const firstIndex = (currentPage - 1) * pageSize;
  const items = data.slice(firstIndex, firstIndex + pageSize);

  const goTo = (next: number) => {
    setParams({ page: clampPage(next, totalPages) });
  };

  const changePageSize = (next: PageSize) => {
    setParams({ page: anchoredPage(currentPage, pageSize, next), pageSize: next });
  };

  const status = loading
    ? 'Cargando resultados…'
    : error
      ? ERROR_TEXT
      : totalItems === 0
        ? 'No hay resultados.'
        : `Mostrando ${String(firstIndex + 1)}–${String(firstIndex + items.length)} de ${String(totalItems)} resultados`;

  return (
    <section className="screen" aria-labelledby="screen-title">
      <h1 id="screen-title">Lista de tareas</h1>

      <div className="screen__toolbar">
        <StatusMessage>{status}</StatusMessage>
        <PageSizeSelect
          value={pageSize}
          disabled={loading || error !== null}
          onChange={changePageSize}
        />
      </div>

      <div className="screen__content">
        {loading ? (
          <Skeleton rows={pageSize} />
        ) : error ? (
          <ErrorBanner message={ERROR_TEXT} onRetry={retry} />
        ) : (
          <TodoList items={items} />
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        disabled={loading || error !== null}
        onGoTo={goTo}
      />
    </section>
  );
}
