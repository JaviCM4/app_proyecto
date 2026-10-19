import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Historial, Venta } from '../../../core/models/venta.model';
import { VentasService } from '../../../core/services/ventas.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { descargarBoletoPdf } from '../../../shared/utils/boleto-pdf';
import { paginar } from '../../../shared/utils/paginacion';

/** Historial de boletos del cliente. Los alquileres tienen su propia página (Mis alquileres). */
@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [PaginadorComponent, ModalComponent, DatePipe],
  templateUrl: './mis-compras.component.html',
  styleUrl: './mis-compras.component.scss',
})
export class MisComprasComponent implements OnInit {
  private readonly ventas = inject(VentasService);
  private readonly avisos = inject(ToastService);

  readonly zona = ZONA_GT;
  readonly historial = signal<Historial | null>(null);
  readonly cargando = signal(true);

  /** Boleto abierto como ticket (detalle completo). */
  readonly ticket = signal<Venta | null>(null);
  readonly cargandoTicket = signal(false);

  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly boletosPagina = computed(() => paginar(this.historial()?.ventas ?? [], this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.ventas.miHistorial().subscribe({
      next: (h) => {
        this.historial.set(h);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar tu historial.'));
      },
    });
  }

  /** Abre el boleto como ticket con todos sus datos. */
  verTicket(ventaId: string): void {    this.ticket.set(null);
    this.cargandoTicket.set(true);
    this.ventas.detalle(ventaId).subscribe({
      next: (v) => {
        this.ticket.set(v);
        this.cargandoTicket.set(false);
      },
      error: (e) => {
        this.cargandoTicket.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo abrir el boleto.'));
      },
    });
  }

  /** Imprime el ticket (el diálogo permite guardarlo como PDF). */
  imprimir(): void {
    window.print();
  }

  /** Descarga el boleto en PDF con la misma imagen del ticket. */
  async descargarPdf(): Promise<void> {
    const t = this.ticket();
    if (!t) return;
    try {
      await descargarBoletoPdf(t);
      this.avisos.exito('Boleto descargado en PDF.');
    } catch {
      this.avisos.error('No se pudo generar el PDF. Usa Imprimir.');
    }
  }

  asientosTicket(t: Venta): string {
    return t.boletos.map((b) => b.numeroAsiento).join(', ');
  }
}
