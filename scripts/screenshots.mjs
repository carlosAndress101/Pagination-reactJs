#!/usr/bin/env node
/**
 * Genera las capturas del README con el mismo navegador que usa la
 * verificacion en runtime.
 *
 * No forma parte de `pnpm verify`: se ejecuta a mano cuando la UI cambia, con
 * `pnpm screenshots`. Sirve el build de produccion y devuelve siempre la misma
 * respuesta de datos, asi que dos ejecuciones producen la misma imagen.
 *
 * Esa respuesta es una copia literal de la que devuelve JSONPlaceholder
 * (`scripts/fixtures/todos.json`), no datos inventados: la portada tiene que
 * ensenar lo que la aplicacion ensena de verdad. Se fija en vez de ir a la red
 * para que las capturas sigan siendo reproducibles sin conexion.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;
const API = 'https://jsonplaceholder.typicode.com/todos';
const SALIDA = 'screenshots';

const TODOS = JSON.parse(readFileSync(new URL('./fixtures/todos.json', import.meta.url), 'utf8'));

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
    // `fullPage`: con los titulos reales, mas largos que los de antes, la lista
    // de 10 filas ya no cabe en el alto del viewport en compacto y la barra de
    // paginacion quedaba cortada por la mitad en la captura.
    await pagina.screenshot({ path: `${SALIDA}/${toma.nombre}.png`, fullPage: true });
    await contexto.close();
    console.log(`  ${SALIDA}/${toma.nombre}.png`);
  }

  await navegador.close();
  console.log('Capturas generadas.');
} finally {
  servidor.kill();
}
