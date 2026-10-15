/**
 * Genera src/environments/environment.ts a partir del archivo .env.
 * Se ejecuta solo antes de "npm start" y "npm run build" (scripts prestart y prebuild).
 *
 * Prioridad: variable de entorno del sistema (Docker / CI) > archivo .env > valor por defecto.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'src/environments/environment.ts');

function leerEnv(ruta) {
  if (!existsSync(ruta)) return {};
  const valores = {};
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#') || !limpia.includes('=')) continue;
    const i = limpia.indexOf('=');
    const clave = limpia.slice(0, i).trim();
    let valor = limpia.slice(i + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    valores[clave] = valor;
  }
  return valores;
}

const archivo = leerEnv(resolve(raiz, '.env'));
const valor = (clave, defecto) => process.env[clave] ?? archivo[clave] ?? defecto;

const config = {
  production: process.env.npm_lifecycle_event === 'prebuild',
  apiUrl: valor('API_GATEWAY_URL', 'http://localhost:8080').replace(/\/+$/, ''),
  appNombre: valor('APP_NOMBRE', 'Transporte Extraurbano'),
};

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(
  destino,
  `// Archivo GENERADO por scripts/generar-env.mjs a partir de .env. No editar a mano.\n` +
    `export const environment = ${JSON.stringify(config, null, 2)};\n`,
);
console.log(`[env] API Gateway: ${config.apiUrl}`);
