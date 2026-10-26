import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Boleto, Historial, Venta, VentaHistorial } from '../../../core/models/venta.model';
import { MapaAsientos } from '../../../core/models/viaje.model';
import { VentasService } from '../../../core/services/ventas.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { TicketBoletoComponent } from '../../../shared/components/ticket-boleto/ticket-boleto.component';
import { CANAL_VENTA, ESTADO_VENTA, textoViaje } from '../../../shared/constants/ventas';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

/** Clave de un viaje en el historial (el historial no trae el id del viaje). */
function claveViaje(v: VentaHistorial): string {
  return `${v.origenNombre ?? ''}|${v.destinoNombre ?? ''}|${v.fechaSalida ?? ''}`;
}

/** Historial de boletos del cliente con filtro por viaje. Los alquileres tienen su propia página (Mis alquileres). */
@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [
    FormsModule,
    PaginadorComponent,
    ModalComponent,
    TicketBoletoComponent,
    SelectorAsientosComponent,
    DatePipe,
    CurrencyPipe,
  ],
  templateUrl: './mis-compras.component.html',
  styleUrl: './mis-compras.component.scss',
})
export class MisComprasComponent implements OnInit {
  private readonly ventas = inject(VentasService);
  private readonly viajes = inject(ViajesService);
  private readonly avisos = inject(ToastService);

  readonly zona = ZONA_GT;
  readonly historial = signal<Historial | null>(null);
  readonly cargando = signal(true);

  /** Boleto abierto como ticket (detalle completo). */
  readonly ticket = signal<Venta | null>(null);
  readonly cargandoTicket = signal(false);
  @ViewChild(TicketBoletoComponent) private ticketComp?: TicketBoletoComponent;

  readonly estadoVenta = ESTADO_VENTA;
  readonly canalVenta = CANAL_VENTA;

  /** Pestaña abierta del boleto: el ticket para imprimir o dónde queda su asiento en el bus. */
  readonly pestanaBoleto = signal<'boleto' | 'asientos'>('boleto');
  readonly mapaAsientos = signal<MapaAsientos | null>(null);
  readonly cargandoAsientos = signal(false);
  readonly sinAsientos = signal('');

  /** Asientos de este boleto: son los que se pintan en verde dentro del bus. */
  readonly misAsientos = computed(() => (this.ticket()?.boletos ?? []).map((b) => b.numeroAsiento));

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

  /**
   * Abre el boleto como ticket con todos sus datos.
   *
   * El historial ya trae lo necesario para mostrarlo, así que se pinta de inmediato. Luego se
   * intenta completar con el detalle de la venta (bus y precio por boleto). Si el backend no
   * permite verlo (por ejemplo, una venta de mostrador anterior a que el cliente tuviera cuenta),
   * se conserva el ticket del historial en lugar de dejar el modal vacío.
   */
  verTicket(ventaId: string): void {
    this.pestanaBoleto.set('boleto');
    this.mapaAsientos.set(null);
    this.sinAsientos.set('');
    const resumen = this.boletos().find((v) => v.ventaId === ventaId);
    if (resumen) {
      this.ticket.set(this.ventaDesdeHistorial(resumen));
      this.cargandoTicket.set(false);
      this.ventas.detalle(ventaId).subscribe({
        next: (v) => {
          if (this.ticket()?.ventaId !== ventaId) return;
          this.ticket.set(v);
          this.cargarAsientos(v.viajeId);
        },
        error: () => {
          // El historial no trae la placa del bus ni el viaje: se mantiene el ticket básico.
          this.sinAsientos.set('No se pudo cargar el mapa del bus de este viaje.');
        },
      });
      return;
    }

    this.ticket.set(null);
    this.cargandoTicket.set(true);
    this.ventas.detalle(ventaId).subscribe({
      next: (v) => {
        this.ticket.set(v);
        this.cargandoTicket.set(false);
        this.cargarAsientos(v.viajeId);
      },
      error: (e) => {
        this.cargandoTicket.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo abrir el boleto.'));
      },
    });
  }

  cerrarTicket(): void {
    this.ticket.set(null);
    this.mapaAsientos.set(null);
    this.sinAsientos.set('');
  }

  /**
   * Mapa de asientos del viaje (consulta pública de Sales), solo para ubicarse dentro del bus.
   * Un viaje eliminado ya no lo tiene: la pestaña lo dice en lugar de quedarse vacía.
   */
  private cargarAsientos(viajeId: string): void {
    if (!viajeId) {
      this.sinAsientos.set('Este boleto ya no tiene datos del viaje.');
      return;
    }
    this.cargandoAsientos.set(true);
    this.viajes.asientos(viajeId).subscribe({
      next: (mapa) => {
        this.cargandoAsientos.set(false);
        this.mapaAsientos.set(mapa);
      },
      error: () => {
        this.cargandoAsientos.set(false);
        this.sinAsientos.set('El mapa del bus ya no está disponible para este viaje.');
      },
    });
  }

  /** Convierte una fila del historial en una venta mínima para el ticket compartido. */
  private ventaDesdeHistorial(v: VentaHistorial): Venta {
    const precio = v.asientos.length ? v.montoTotal / v.asientos.length : v.montoTotal;
    const boletos: Boleto[] = v.asientos.map((numeroAsiento, indice) => ({
      boletoId: `${v.ventaId}-${indice}`,
      numeroAsiento,
      precio,
      estado: 'EMITIDO',
    }));
    return {
      ventaId: v.ventaId,
      viajeId: '',
      canal: v.canal,
      clienteNit: this.historial()?.nit ?? null,
      clienteNombre: this.historial()?.nombre ?? null,
      clienteCorreo: null,
      sucursalId: '',
      metodoPago: null,
      montoTotal: v.montoTotal,
      fechaPago: v.fechaPago,
      fechaRegistro: null,
      estado: v.estado,
      motivoRechazo: null,
      motivoCancelacion: null,
      fechaCancelacion: null,
      boletos,
      viaje: {
        origenNombre: v.origenNombre ?? '',
        destinoNombre: v.destinoNombre ?? '',
        fechaSalida: v.fechaSalida ?? '',
        busPlaca: null,
        precioBoleto: precio,
      },
      version: 0,
    };
  }

  /** Imprime el ticket (el diálogo permite guardarlo como PDF). */
  imprimir(): void {
    this.ticketComp?.imprimir();
  }

  /** Descarga el boleto en PDF con la misma imagen del ticket. */
  async descargarPdf(): Promise<void> {
    await this.ticketComp?.descargarPdf();
  }
}
