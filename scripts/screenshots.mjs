#!/usr/bin/env node
/**
 * Genera las capturas del README con el mismo navegador que usa la
 * verificacion en runtime.
 *
 * No forma parte de `pnpm verify`: se ejecuta a mano cuando la UI cambia, con
 * `pnpm screenshots`. Sirve el build de produccion y devuelve siempre la misma
 * respuesta de datos, asi que dos ejecuciones producen la misma imagen.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;
const API = 'https://jsonplaceholder.typicode.com/todos';
const SALIDA = 'screenshots';

const TITULOS = [
  'Revisar el informe trimestral',
  'Preparar la demo para el equipo',
  'Actualizar la documentacion de la API',
  'Responder a los comentarios del PR',
  'Planificar la retrospectiva del sprint',
  'Migrar el servicio de notificaciones',
  'Reducir el tiempo de arranque del build',
  'Auditar las dependencias del proyecto',
  'Escribir la guia de contribucion',
  'Revisar los permisos del bucket de backups',
  'Cerrar las incidencias duplicadas',
  'Anadir metricas al panel de latencia',
  'Repasar el plan de recuperacion ante fallos',
  'Documentar el proceso de despliegue',
  'Limpiar las ramas ya fusionadas',
  'Actualizar las capturas del manual',
  'Revisar la accesibilidad del formulario',
  'Configurar la rotacion de claves',
  'Ajustar los limites de la cola de trabajos',
  'Preparar el informe de incidencias del mes',
];

const TODOS = Array.from({ length: 200 }, (_unused, i) => ({
  userId: 1,
  id: i + 1,
  title: TITULOS[i % TITULOS.length],
  completed: i % 3 === 0,
}));

const TOMAS = [
  {
    nombre: 'escritorio-claro',
    viewport: { width: 1200, height: 760 },
    colorScheme: 'light',
    url: '/?page=4',
  },
  {
    nombre: 'escritorio-oscuro',
    viewport: { width: 1200, height: 760 },
    colorScheme: 'dark',
    url: '/?page=4',
  },
  {
    nombre: 'compacto-claro',
    viewport: { width: 320, height: 720 },
    colorScheme: 'light',
    url: '/?page=4',
  },
  {
    nombre: 'compacto-oscuro',
    viewport: { width: 320, height: 720 },
    colorScheme: 'dark',
    url: '/?page=4',
  },
];

function esperarServidor(url, intentos = 60) {
  return new Promise((resolve, reject) => {
    const probar = async (quedan) => {
      try {
        await fetch(url);
        resolve();
      } catch {
        if (quedan === 0) reject(new Error(`El servidor no respondio en ${url}`));
        else setTimeout(() => void probar(quedan - 1), 500);
      }
    };
    void probar(intentos);
  });
}

mkdirSync(SALIDA, { recursive: true });

const servidor = spawn(
  'pnpm',
  ['preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore' },
);

try {
  await esperarServidor(BASE);
  const navegador = await chromium.launch();

  for (const toma of TOMAS) {
    const contexto = await navegador.newContext({
      viewport: toma.viewport,
      colorScheme: toma.colorScheme,
      deviceScaleFactor: 2,
    });
    const pagina = await contexto.newPage();
    await pagina.route(API, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TODOS),
      }),
    );
    await pagina.goto(`${BASE}${toma.url}`);
    await pagina
      .getByText(/Mostrando|resultados/)
      .first()
      .waitFor();
    await pagina.screenshot({ path: `${SALIDA}/${toma.nombre}.png` });
    await contexto.close();
    console.log(`  ${SALIDA}/${toma.nombre}.png`);
  }

  await navegador.close();
  console.log('Capturas generadas.');
} finally {
  servidor.kill();
}
