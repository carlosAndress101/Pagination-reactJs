import { defineConfig } from '@playwright/test';

/**
 * Andamiaje de verificacion en runtime (DEC-05).
 *
 * El runner arranca y para el servidor y el navegador por si mismo: quien
 * audite solo necesita `pnpm verify:runtime`, sin preguntar nada a nadie ni
 * levantar procesos a mano.
 *
 * Solo Chromium, y `pnpm build` / `pnpm test` no dependen de este archivo:
 * si falta el binario del navegador, esos dos siguen funcionando.
 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${String(PORT)}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : [['list']],

  webServer: {
    // `--host 127.0.0.1` es deliberado: por defecto Vite escucha en `localhost`,
    // que en esta maquina resuelve solo a ::1, y la comprobacion de arranque
    // contra 127.0.0.1 se quedaba colgada hasta agotar el timeout.
    command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${String(PORT)} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },

  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
  },

  // Los proyectos solo varian el viewport. El esquema de color y
  // `prefers-reduced-motion` se fijan por bloque con `test.use`, para que cada
  // spec declare la condicion que necesita en vez de depender del proyecto.
  projects: [
    { name: 'w320', use: { viewport: { width: 320, height: 720 } } },
    { name: 'w375', use: { viewport: { width: 375, height: 720 } } },
    { name: 'w414', use: { viewport: { width: 414, height: 720 } } },
    { name: 'w768', use: { viewport: { width: 768, height: 900 } } },
    { name: 'w1280', use: { viewport: { width: 1280, height: 900 } } },
  ],
});
