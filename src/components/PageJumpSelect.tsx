/**
 * Salto directo del modo compacto (design-spec §5, T-02b). Vive siempre en el
 * DOM entre "Anterior" y "Siguiente"; en >=480px lo oculta el CSS (T-11).
 *
 * No lleva `aria-live` propio: al cambiar dispara el mismo cambio de pagina que
 * un boton de numero, y quien anuncia es la region unica de StatusMessage.
 */
export interface PageJumpSelectProps {
  currentPage: number;
  totalPages: number;
  disabled: boolean;
  onJump: (page: number) => void;
}

export function PageJumpSelect({ currentPage, totalPages, disabled, onJump }: PageJumpSelectProps) {
  return (
    <select
      className="page-jump-select"
      aria-label="Ir a la página"
      value={totalPages === 0 ? '' : currentPage}
      disabled={disabled || totalPages === 0}
      onChange={(event) => {
        onJump(Number(event.currentTarget.value));
      }}
    >
      {Array.from({ length: totalPages }, (_unused, index) => index + 1).map((page) => (
        <option key={page} value={page}>
          Página {page} de {totalPages}
        </option>
      ))}
    </select>
  );
}
