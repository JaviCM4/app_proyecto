import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlquilerHistorial, Historial, Venta, VentaHistorial } from '../../../core/models/venta.model';
import { OrdenesAlquilerService } from '../../../core/services/ordenes-alquiler.service';
import { VentasService } from '../../../core/services/ventas.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { CANAL_VENTA, ESTADO_ORDEN_ALQUILER, ESTADO_VENTA, textoViaje } from '../../../shared/constants/ventas';
import { ToastService } from '../../../shared/services/toast.service';
import { descargarBoletoPdf } from '../../../shared/utils/boleto-pdf';
import { paginar } from '../../../shared/utils/paginacion';

/** Clave de un viaje en el historial (el historial no trae el id del viaje). */
function claveViaje(v: VentaHistorial): string {
  return `${v.origenNombre ?? ''}|${v.destinoNombre ?? ''}|${v.fechaSalida ?? ''}`;
}

/** Historial de compras del cliente en pestañas: boletos (con filtro por viaje) y alquileres, con pago de alquileres pendientes. */
@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [FormsModule, PaginadorComponent, ModalComponent, DatePipe, CurrencyPipe],
  templateUrl: './mis-compras.component.html',
  styleUrl: './mis-compras.component.scss',
})
export class MisComprasComponent implements OnInit {
  private readonly ventas = inject(VentasService);
  private readonly ordenes = inject(OrdenesAlquilerService);
  private readonly avisos = inject(ToastService);

  readonly zona = ZONA_GT;
  readonly historial = signal<Historial | null>(null);
  readonly cargando = signal(true);
  readonly pagandoId = signal<string | null>(null);

  /** Boleto abierto como ticket (detalle completo). */
  readonly ticket = signal<Venta | null>(null);
  readonly cargandoTicket = signal(false);

  readonly estadoVenta = ESTADO_VENTA;
  readonly canalVenta = CANAL_VENTA;
  readonly estadoOrden = ESTADO_ORDEN_ALQUILER;

  readonly pestana = signal<'boletos' | 'alquileres'>('boletos');
  readonly viaje = signal('');

  /** Un viaje por cada uno con boletos, del más reciente al más antiguo. */
  readonly opcionesViaje = computed(() => {
    const vistos = new Map<string, VentaHistorial>();
    for (const v of this.historial()?.ventas ?? []) {
      if (!vistos.has(claveViaje(v))) vistos.set(claveViaje(v), v);
    }
    return [...vistos.entries()]
      .sort(([, a], [, b]) => (b.fechaSalida ?? '').localeCompare(a.fechaSalida ?? ''))
      .map(([clave, v]) => ({ clave, texto: textoViaje(v.origenNombre, v.destinoNombre, v.fechaSalida) }));
  });

  readonly boletos = computed(() => {
    const viaje = this.viaje();
    return (this.historial()?.ventas ?? []).filter((v) => !viaje || claveViaje(v) === viaje);
  });

  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly boletosPagina = computed(() => paginar(this.boletos(), this.pagina(), this.tamano()));

  filtrarViaje(clave: string): void {
    this.viaje.set(clave);
    this.pagina.set(1);
  }

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

  pagarAlquiler(orden: AlquilerHistorial): void {    if (this.pagandoId()) return;
    this.pagandoId.set(orden.ordenId);
    this.ordenes.pagarCartera(orden.ordenId, hoyGt()).subscribe({
      next: () => {
        this.avisos.info('Pago en proceso, confirmando el cobro a tu cartera…');
        this.seguirHastaFin(orden.ordenId);
      },
      error: (e) => {
        this.pagandoId.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo iniciar el pago.'));
      },
    });
  }

  private seguirHastaFin(ordenId: string): void {
    this.ordenes.seguirHastaFin(ordenId).subscribe({
      next: (o) => {
        if (o.estado === 'PENDIENTE_PAGO') return;
        this.pagandoId.set(null);
        if (o.estado === 'PAGADA') {
          this.avisos.exito('Alquiler pagado con tu cartera.');
        } else {
          this.avisos.error(o.motivoRechazo ?? 'El pago fue rechazado.');
        }
        this.cargar();
      },
      error: (e) => {
        this.pagandoId.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo confirmar el pago.'));
        this.cargar();
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
