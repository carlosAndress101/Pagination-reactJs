/**
 * Banner de error con reintento (design-spec §4).
 *
 * El boton queda fuera de la region `aria-live`: si estuviera dentro, su
 * etiqueta se releeria en cada anuncio. El banner tampoco lleva `role="alert"`
 * ni `role="group"`: alert crearia una segunda region viva —lo que el spec
 * prohibe expresamente— y group no aporta nada sobre un `<div>`.
 */
interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <p className="error-banner__message">{message}</p>
      <button type="button" className="button button--outline" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}
