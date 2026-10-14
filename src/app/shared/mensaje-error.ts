import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje legible a partir de un error HTTP del backend (usa `mensaje` si viene). */
export function mensajeError(error: unknown, defecto: string): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as { mensaje?: string; message?: string } | string | null;
    if (typeof cuerpo === 'object' && cuerpo !== null) {
      if (cuerpo.mensaje) return cuerpo.mensaje;
      if (cuerpo.message) return cuerpo.message;
    }
    if (error.status === 0) return 'No se pudo conectar con el servidor (¿el gateway está en http://localhost:8080?).';
    if (error.status === 401) return 'Credenciales inválidas o sesión vencida.';
    if (error.status === 403) return 'No tienes permiso para esta acción.';
    if (error.status === 404) return 'Recurso no encontrado.';
    if (error.status === 409) return 'Conflicto: el recurso ya existe.';
    if (error.status === 423) return 'Cuenta bloqueada temporalmente.';
    if (error.status === 422 || error.status === 400) return 'Revisa los datos del formulario.';
  }
  return defecto;
}
