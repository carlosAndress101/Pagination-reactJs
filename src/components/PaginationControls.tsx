import { useEffect, useRef } from 'react';
import { ELLIPSIS, getPageRange } from '../lib/pagination';
import { PageJumpSelect } from './PageJumpSelect';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  /** Durante la carga inicial no hay pagina actual: todos los controles se apagan. */
  disabled: boolean;
  onGoTo: (page: number) => void;
}

/** Acciones de extremo, en el orden de tabulacion del design-spec §6. */
type EdgeAction = 'first' | 'prev' | 'next' | 'last';

const EDGE_LABELS: Record<EdgeAction, { glyph: string; label: string }> = {
  first: { glyph: '«', label: 'Primera página' },
  prev: { glyph: '‹', label: 'Página anterior' },
  next: { glyph: '›', label: 'Página siguiente' },
  last: { glyph: '»', label: 'Última página' },
};

/** A donde mover el foco si el boton pulsado se queda deshabilitado. */
const FOCUS_FALLBACK: Record<EdgeAction, EdgeAction> = {
  first: 'last',
  prev: 'next',
  next: 'prev',
  last: 'first',
};

export function PaginationControls({
  currentPage,
  totalPages,
  disabled,
  onGoTo,
}: PaginationControlsProps) {
  const slots = getPageRange(currentPage, totalPages);

  const atFirst = disabled || totalPages === 0 || currentPage <= 1;
  const atLast = disabled || totalPages === 0 || currentPage >= totalPages;

  const isEdgeDisabled: Record<EdgeAction, boolean> = {
    first: atFirst,
    prev: atFirst,
    next: atLast,
    last: atLast,
  };

  const targetOf: Record<EdgeAction, number> = {
    first: 1,
    prev: currentPage - 1,
    next: currentPage + 1,
    last: totalPages,
  };

  const edgeRefs = useRef<Partial<Record<EdgeAction, HTMLButtonElement | null>>>({});
  const lastPressed = useRef<EdgeAction | null>(null);

  /**
   * B3: el foco no debe perderse al cambiar de pagina.
   *
   * El design-spec §6 razona que el boton pulsado nunca desaparece del DOM, y
   * es cierto, pero no cubre este caso: pulsar "Siguiente" hasta la ultima
   * pagina lo deja `disabled`, y el navegador saca el foco del elemento
   * deshabilitado y lo manda al body. El spec exige `disabled` real, no
   * `aria-disabled`, asi que la unica salida es reubicar el foco.
   *
   * Solo actua si el foco sigue en el boton que acaba de apagarse o ya se ha
   * ido al body, para no robarselo a nadie. Hacen falta las dos condiciones
   * porque los navegadores mandan el foco al body al deshabilitar el elemento
   * enfocado y jsdom no: lo deja donde estaba.
   */
  useEffect(() => {
    const pressed = lastPressed.current;
    lastPressed.current = null;
    if (pressed === null) return;
    if (!isEdgeDisabled[pressed]) return;

    const active = document.activeElement;
    const seLoLlevoElNavegador = active === document.body || active === null;
    const seQuedoEnElBotonApagado = active === edgeRefs.current[pressed];
    if (!seLoLlevoElNavegador && !seQuedoEnElBotonApagado) return;

    edgeRefs.current[FOCUS_FALLBACK[pressed]]?.focus();
  });

  const renderEdge = (action: EdgeAction) => {
    const { glyph, label } = EDGE_LABELS[action];
    return (
      <li key={action} className="pagination__item">
        <button
          type="button"
          className="pagination__button pagination__button--edge"
          aria-label={label}
          disabled={isEdgeDisabled[action]}
          ref={(node) => {
            edgeRefs.current[action] = node;
          }}
          onClick={() => {
            lastPressed.current = action;
            onGoTo(targetOf[action]);
          }}
        >
          <span aria-hidden="true">{glyph}</span>
        </button>
      </li>
    );
  };

  return (
    <nav className="pagination" aria-label="Paginación">
      <ul className="pagination__list">
        {renderEdge('first')}
        {renderEdge('prev')}

        <li className="pagination__item pagination__item--jump">
          <PageJumpSelect
            currentPage={currentPage}
            totalPages={totalPages}
            disabled={disabled}
            onJump={onGoTo}
          />
        </li>

        {slots.map((slot, index) =>
          slot === ELLIPSIS ? (
            <li
              key={`ellipsis-${String(index)}`}
              className="pagination__item pagination__item--page"
            >
              <span className="pagination__ellipsis" aria-hidden="true">
                …
              </span>
            </li>
          ) : (
            <li key={`page-${String(slot)}`} className="pagination__item pagination__item--page">
              <button
                type="button"
                className="pagination__button pagination__button--page"
                aria-label={`Página ${String(slot)}`}
                aria-current={slot === currentPage ? 'page' : undefined}
                disabled={disabled}
                onClick={() => {
                  onGoTo(slot);
                }}
              >
                {slot}
              </button>
            </li>
          ),
        )}

        {renderEdge('next')}
        {renderEdge('last')}
      </ul>
    </nav>
  );
}
