import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ErrorApi } from '../models/error.model';

/** Devuelve el cuerpo de error del backend, si lo hay. */
export function errorApi(error: unknown): ErrorApi | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object' && 'codigo' in error.error) {
    return error.error as ErrorApi;
  }
  return null;
}

/**
 * Mensaje entendible para el usuario. Usa el mensaje del backend (ya viene en español)
 * y nunca muestra rutas, métodos ni códigos técnicos.
 */
export function mensajeError(error: unknown, porDefecto = 'No se pudo completar la operación.'): string {
  const cuerpo = errorApi(error);
  if (cuerpo?.errores?.length) {
    return 'Revisa los datos marcados en el formulario.';
  }
  if (cuerpo?.mensaje) return cuerpo.mensaje;
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor. Intenta de nuevo en unos minutos.';
    if (error.status === 401) return 'Tu sesión terminó. Vuelve a entrar.';
    if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (error.status === 404) return 'No se encontró la información solicitada.';
    if (error.status >= 500) return 'Ocurrió un problema en el servidor. Intenta de nuevo.';
  }
  return porDefecto;
}

/**
 * Marca en el formulario los campos que el backend rechazó (errores[].campo, p. ej. "adminInicial.dpi").
 * El mensaje queda en control.errors.servidor para mostrarlo debajo del campo.
 */
export function marcarErroresServidor(form: FormGroup, error: unknown): void {
  for (const e of errorApi(error)?.errores ?? []) {
    if (!e.campo) continue;
    const control: AbstractControl | null = form.get(e.campo);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), servidor: e.mensaje });
      control.markAsTouched();
    }
  }
}
