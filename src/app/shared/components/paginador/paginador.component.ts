import { Component, computed, input, output } from '@angular/core';

/** Barra de paginación: "Mostrando 1–10 de 42" + anterior / páginas / siguiente + tamaño. */
@Component({
  selector: 'app-paginador',
  standalone: true,
  templateUrl: './paginador.component.html',
  styleUrl: './paginador.component.scss',
})
export class PaginadorComponent {
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly total = input.required<number>();
  readonly tamanos = input<number[]>([10, 20, 50]);

  readonly cambioPagina = output<number>();
  readonly cambioTamano = output<number>();

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  readonly desde = computed(() => (this.total() === 0 ? 0 : (this.pagina() - 1) * this.tamano() + 1));
  readonly hasta = computed(() => Math.min(this.pagina() * this.tamano(), this.total()));

  /** Hasta 5 números de página alrededor de la actual. */
  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const inicio = Math.max(1, Math.min(this.pagina() - 2, total - 4));
    const fin = Math.min(total, inicio + 4);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  });

  ir(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas() && pagina !== this.pagina()) this.cambioPagina.emit(pagina);
  }

  alCambiarTamano(evento: Event): void {
    this.cambioTamano.emit(Number((evento.target as HTMLSelectElement).value));
  }
}
