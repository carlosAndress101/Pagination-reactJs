/**
 * Filas de carga. Se pintan tantas como el tamano de pagina activo para que la
 * altura del contenedor no cambie al llegar los datos (design-spec §4).
 *
 * Los anchos varian de forma determinista por indice, no aleatoria: asi la
 * captura es estable entre ejecuciones y se puede afirmar sobre ella en tests.
 */
export interface SkeletonProps {
  rows: number;
}

/** Serie deterministica en el rango 55%..90% que exige el spec. */
function widthFor(index: number): string {
  return `${String(55 + ((index * 37) % 36))}%`;
}

export function Skeleton({ rows }: SkeletonProps) {
  return (
    <ul className="todo-list todo-list--skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_unused, index) => (
        <li key={index} className="skeleton-row">
          <span className="skeleton-bar" style={{ width: widthFor(index) }} />
        </li>
      ))}
    </ul>
  );
}
