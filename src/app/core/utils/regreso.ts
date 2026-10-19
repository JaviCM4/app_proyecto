/**
 * Guarda a dónde debe volver el usuario después de entrar. Sirve para no perder el destino
 * cuando el login pasa por el código de 6 dígitos (2FA) o por Google, que son saltos fuera de Angular.
 */

const CLAVE = 'transporte.volver';

/** Deja anotado el destino. Cualquier login nuevo sobrescribe el anterior. */
export function recordarRegreso(url: string | null | undefined): void {
  try {
    sessionStorage.setItem(CLAVE, rutaSegura(url));
  } catch {
    /* sin sessionStorage (modo privado): se ignora y se usa el panel */
  }
}

/** Destino pendiente o /panel si no hay nada anotado. */
export function regresoPendiente(): string {
  try {
    return rutaSegura(sessionStorage.getItem(CLAVE));
  } catch {
    return '/panel';
  }
}

export function limpiarRegreso(): void {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
}

/** Solo rutas internas: evita que ?volver=https://otro-sitio abra un redirect. */
export function rutaSegura(url: string | null | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/panel';
  return url;
}
