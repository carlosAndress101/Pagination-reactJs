import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * Comprobacion previa para quien ejecute esto en frio.
 *
 * Sin ella, un navegador ausente produce una pared de fallos identicos, uno por
 * test, y el motivo real queda enterrado. DEC-05 exige que el andamiaje sea
 * reejecutable por otro agente sin preguntar nada: eso incluye que el fallo
 * diga por si solo que hacer.
 */
export default function globalSetup(): void {
  const ejecutable = chromium.executablePath();
  if (!existsSync(ejecutable)) {
    throw new Error(
      [
        '',
        'Falta el navegador de Playwright.',
        '',
        'Ejecuta esto una vez en esta maquina y vuelve a lanzar el comando:',
        '',
        '    pnpm exec playwright install chromium',
        '',
        `(se esperaba encontrarlo en: ${ejecutable})`,
        '',
      ].join('\n'),
    );
  }
}
