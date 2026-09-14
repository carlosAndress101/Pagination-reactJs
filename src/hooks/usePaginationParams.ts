import { useCallback, useEffect, useState } from 'react';
import { parseParams, serializeParams } from '../lib/params';
import type { PageParams } from '../lib/params';

/**
 * `page` y `pageSize` viven en la URL (A5): el enlace es compartible y los
 * botones atras/adelante del navegador funcionan.
 *
 * El hook es un espejo de la URL y nada mas. No decide reglas de producto:
 * no recorta contra el total de paginas (eso es `clampPage`, y el total solo
 * se conoce cuando hay datos) ni reinicia la pagina al cambiar el tamano.
 * Esas decisiones son de la pantalla, en T-10.
 */
interface PaginationParamsApi extends PageParams {
  /** Actualiza uno o los dos parametros y empuja una entrada al historial. */
  setParams: (next: Partial<PageParams>) => void;
}

/** Query string actual, sin depender de que exista `window` en el primer render. */
function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

export function usePaginationParams(): PaginationParamsApi {
  const [params, setStateParams] = useState<PageParams>(() => parseParams(currentSearch()));

  // Atras/adelante del navegador: la URL cambia sin pasar por setParams.
  useEffect(() => {
    const onPopState = () => {
      setStateParams(parseParams(currentSearch()));
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const setParams = useCallback((next: Partial<PageParams>) => {
    // La URL es la fuente de verdad, asi que el merge parte de ella y no del
    // estado de React: evita divergir si algo cambio la URL por fuera.
    const merged: PageParams = { ...parseParams(currentSearch()), ...next };

    const query = serializeParams(merged);
    const currentQuery = currentSearch().replace(/^\?/, '');

    // Sin esta guarda, fijar los mismos valores apilaria entradas de historial
    // identicas y el boton atras dejaria de retroceder de verdad.
    if (query !== currentQuery) {
      const { pathname } = window.location;
      window.history.pushState(null, '', query === '' ? pathname : `${pathname}?${query}`);
    }

    // El efecto sobre el historial va fuera del updater a proposito: React
    // puede invocar un updater dos veces en StrictMode y duplicaria la entrada.
    setStateParams(merged);
  }, []);

  return { page: params.page, pageSize: params.pageSize, setParams };
}
