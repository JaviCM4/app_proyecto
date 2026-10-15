import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'exito' | 'error' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

let secuencia = 0;

/** Avisos breves en la esquina (operación exitosa, error, información). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly lista = signal<Aviso[]>([]);
  readonly avisos = this.lista.asReadonly();

  exito(texto: string): void { this.agregar('exito', texto, 4000); }
  error(texto: string): void { this.agregar('error', texto, 6000); }
  info(texto: string): void { this.agregar('info', texto, 4000); }

  cerrar(id: number): void {
    this.lista.update((avisos) => avisos.filter((a) => a.id !== id));
  }

  private agregar(tipo: TipoAviso, texto: string, duracion: number): void {
    const aviso: Aviso = { id: ++secuencia, tipo, texto };
    this.lista.update((avisos) => [...avisos, aviso]);
    setTimeout(() => this.cerrar(aviso.id), duracion);
  }
}
