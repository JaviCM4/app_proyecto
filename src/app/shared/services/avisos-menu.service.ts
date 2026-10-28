import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Avisos del menú lateral. Las pantallas que cambian los pendientes (pagar una orden, cotizar,
 * asignar o cancelar un alquiler) piden un refresco y el menú vuelve a contar al momento, sin
 * esperar al intervalo de un minuto.
 */
@Injectable({ providedIn: 'root' })
export class AvisosMenuService {
  private readonly cambios = new Subject<void>();

  /** Se emite cada vez que hay que volver a contar los avisos. */
  readonly cambios$ = this.cambios.asObservable();

  refrescar(): void {
    this.cambios.next();
  }
}
