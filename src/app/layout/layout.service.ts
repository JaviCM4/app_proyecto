import { Injectable, signal } from '@angular/core';

const CLAVE = 'menuPlegado';

/** Estado del menú lateral: plegado (solo íconos) en escritorio y abierto/cerrado en celular. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly plegado = signal(this.leer());
  readonly abiertoMovil = signal(false);

  alternar(): void {
    if (window.matchMedia('(max-width: 900px)').matches) {
      this.abiertoMovil.update((v) => !v);
      return;
    }
    this.plegado.update((v) => !v);
    try {
      localStorage.setItem(CLAVE, String(this.plegado()));
    } catch {
      /* sin almacenamiento: solo dura la sesión */
    }
  }

  cerrarMovil(): void {
    this.abiertoMovil.set(false);
  }

  private leer(): boolean {
    try {
      return localStorage.getItem(CLAVE) === 'true';
    } catch {
      return false;
    }
  }
}
