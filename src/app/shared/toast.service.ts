import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SeveridadToast = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  severity: SeveridadToast;
  summary: string;
  detail: string;
  life: number;
}

let secuencia = 0;

/** Equivalente liviano al MessageService + p-toast de PrimeNG del proyecto de referencia. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  success(detail: string, summary = 'Éxito', life = 4000): void {
    this.add({ severity: 'success', summary, detail, life });
  }

  error(detail: string, summary = 'Error', life = 5000): void {
    this.add({ severity: 'error', summary, detail, life });
  }

  info(detail: string, summary = 'Info', life = 3500): void {
    this.add({ severity: 'info', summary, detail, life });
  }

  cerrar(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
  }

  private add(base: Omit<Toast, 'id'>): void {
    const toast: Toast = { ...base, id: ++secuencia };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.cerrar(toast.id), toast.life);
  }
}
