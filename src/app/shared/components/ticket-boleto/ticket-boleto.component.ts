import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, input } from '@angular/core';
import type { Venta } from '../../../core/models/venta.model';
import { ZONA_GT } from '../../../core/utils/fechas';
import { ESTADO_VENTA } from '../../constants/ventas';
import { ToastService } from '../../services/toast.service';
import { descargarBoletoPdf } from '../../utils/boleto-pdf';

/**
 * Boleto imprimible de una venta. Se usa en Mis boletos, en la venta de mostrador y en el
 * detalle de Ventas para reimprimir un boleto ya emitido. El código del talón es el ventaId:
 * es único y permite localizar la venta después.
 */
@Component({
  selector: 'app-ticket-boleto',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './ticket-boleto.component.html',
  styleUrl: './ticket-boleto.component.scss',
})
export class TicketBoletoComponent {
  private readonly avisos = inject(ToastService);

  readonly venta = input.required<Venta>();
  /** Nombre de respaldo si la venta no trae cliente (por ejemplo, el perfil del cliente). */
  readonly pasajero = input<string | null>(null);
  /** Muestra los botones de descargar/imprimir dentro del componente. */
  readonly mostrarAcciones = input(true);

  readonly zona = ZONA_GT;
  readonly estadoVenta = ESTADO_VENTA;

  @ViewChild('ticket') private ticket?: ElementRef<HTMLElement>;

  asientos(): string {
    return this.venta().boletos.map((b) => b.numeroAsiento).join(', ');
  }

  /** Descarga solo este ticket, no otro que pueda estar en la página. */
  async descargarPdf(): Promise<void> {
    const elemento = this.ticket?.nativeElement;
    if (!elemento) {
      this.avisos.error('No se pudo generar el PDF. Usa Imprimir.');
      return;
    }
    try {
      await descargarBoletoPdf(this.venta(), elemento);
      this.avisos.exito('Boleto descargado en PDF.');
    } catch {
      this.avisos.error('No se pudo generar el PDF. Usa Imprimir.');
    }
  }

  /** Imprime solo el boleto: la clase en el body activa la regla @media print de styles.scss. */
  imprimir(): void {
    document.body.classList.add('imprimiendo-ticket');
    const limpiar = () => {
      document.body.classList.remove('imprimiendo-ticket');
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);
    window.print();
    // Respaldo por si el navegador no dispara afterprint.
    window.setTimeout(limpiar, 1000);
  }
}
