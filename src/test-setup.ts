import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Con `globals: false` en la configuracion de Vitest, Testing Library no puede
 * registrar su limpieza automatica: sin esto los renders se acumulan en el DOM
 * y cualquier consulta encuentra elementos duplicados.
 */
afterEach(() => {
  cleanup();
});
