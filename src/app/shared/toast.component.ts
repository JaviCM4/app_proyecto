import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2" role="status" aria-live="polite">
      @for (t of toast.toasts$ | async; track t.id) {
        <div class="pointer-events-auto flex items-start gap-3 rounded-xl border-l-8 bg-white p-3 shadow-xl" [class]="borde(t)">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-azul-oscuro">{{ t.summary }}</p>
            <p class="break-words text-sm text-cafe">{{ t.detail }}</p>
          </div>
          <button type="button" (click)="toast.cerrar(t.id)" class="rounded-lg px-2 py-0.5 text-lg leading-none text-cafe hover:bg-crema" aria-label="Cerrar aviso">×</button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly toast = inject(ToastService);

  borde(t: Toast): string {
    switch (t.severity) {
      case 'success': return 'border-menta-oscuro';
      case 'error': return 'border-red-700';
      default: return 'border-azul';
    }
  }
}
