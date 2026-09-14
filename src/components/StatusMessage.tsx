/**
 * Unica region `aria-live` de la pantalla (design-spec §6). Un solo nodo
 * reutilizado para los cuatro estados: si hubiera dos regiones, dos lectores
 * de pantalla hablarian encima.
 *
 * El texto es el mismo en cualquier ancho; en compacto se oculta visualmente
 * (`sr-only`) pero sigue existiendo y anunciando.
 */
export interface StatusMessageProps {
  /** Texto ya compuesto por la pantalla. */
  children: string;
  /** En <480px el resumen deja de ser visible; su sitio lo ocupa el salto directo. */
  visuallyHidden?: boolean;
}

export function StatusMessage({ children, visuallyHidden = false }: StatusMessageProps) {
  return (
    <p
      className={visuallyHidden ? 'status-message sr-only' : 'status-message'}
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </p>
  );
}
