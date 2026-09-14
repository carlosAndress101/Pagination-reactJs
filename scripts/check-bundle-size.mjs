#!/usr/bin/env node
/**
 * Presupuesto de bundle (DEC-08 / DEC-10).
 *
 * Tres presupuestos INDEPENDIENTES, nunca sumados: un numero combinado oculta
 * cual de los dos creció, que es justo lo que un presupuesto debe señalar.
 *
 * Mide con `zlib` nivel 9 y compara BYTES. No se lee la salida de otra
 * herramienta: Vite comprime con otro nivel y reporta en kB decimales, asi que
 * comparar su numero contra un umbral definido de otra forma da alarmas y
 * aprobados sin causa.
 */
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = join('dist', 'assets');

/** [nombre, unidad, aviso | null, limite duro] */
const PRESUPUESTOS = {
  jsGzip: { etiqueta: 'JS gzip(9)', aviso: 72_000, limite: 75_000 },
  jsRaw: { etiqueta: 'JS sin comprimir', aviso: null, limite: 235_000 },
  cssGzip: { etiqueta: 'CSS gzip(9)', aviso: null, limite: 4_000 },
};

if (!existsSync(ASSETS)) {
  console.error(`No existe ${ASSETS}. Ejecuta \`pnpm build\` antes de \`pnpm verify:size\`.`);
  process.exit(1);
}

let jsRaw = 0;
let jsGzip = 0;
let cssGzip = 0;

for (const nombre of readdirSync(ASSETS)) {
  const bytes = readFileSync(join(ASSETS, nombre));
  const comprimido = gzipSync(bytes, { level: 9 }).length;
  if (nombre.endsWith('.js')) {
    jsRaw += bytes.length;
    jsGzip += comprimido;
  } else if (nombre.endsWith('.css')) {
    cssGzip += comprimido;
  }
}

const medidas = { jsGzip, jsRaw, cssGzip };

const fallos = [];
const avisos = [];
const filas = [];

for (const [clave, { etiqueta, aviso, limite }] of Object.entries(PRESUPUESTOS)) {
  const valor = medidas[clave];
  let estado = 'ok';
  if (valor > limite) {
    estado = 'EXCEDE';
    fallos.push(`${etiqueta}: ${valor} B > ${limite} B`);
  } else if (aviso !== null && valor > aviso) {
    estado = 'AVISO';
    avisos.push(`${etiqueta}: ${valor} B > ${aviso} B`);
  }
  filas.push(
    `  ${etiqueta.padEnd(20)} ${String(valor).padStart(8)} B  ` +
      `aviso ${aviso === null ? '   —   ' : String(aviso).padStart(7)}  ` +
      `limite ${String(limite).padStart(7)}   ${estado}`,
  );
}

console.log('Presupuesto de bundle (zlib nivel 9, bytes):');
console.log(filas.join('\n'));

for (const aviso of avisos) console.warn(`AVISO  ${aviso}`);

if (fallos.length > 0) {
  console.error('\nPresupuesto excedido:');
  for (const fallo of fallos) console.error(`  ${fallo}`);
  process.exit(1);
}

console.log(avisos.length > 0 ? '\nDentro del limite, con avisos.' : '\nDentro del presupuesto.');
