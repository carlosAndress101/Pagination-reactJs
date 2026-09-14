import { PAGE_SIZES } from '../lib/params';
import type { PageSize } from '../lib/params';

interface PageSizeSelectProps {
  value: PageSize;
  disabled: boolean;
  onChange: (next: PageSize) => void;
}

export function PageSizeSelect({ value, disabled, onChange }: PageSizeSelectProps) {
  return (
    <div className="page-size">
      <label htmlFor="page-size">Filas por página</label>
      <select
        id="page-size"
        className="page-size__select"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          // El valor viene de nuestras propias <option>, pero se comprueba
          // igualmente para no ensanchar el tipo con una asercion.
          const match = PAGE_SIZES.find((size) => size === next);
          if (match !== undefined) onChange(match);
        }}
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
