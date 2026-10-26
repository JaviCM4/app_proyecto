import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Venta, VentaPendiente } from '../../../core/models/venta.model';
import { MapaAsientos, Ruta, Viaje } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { Coordenadas, MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { ESTADO_VENTA, textoMotivo } from '../../../shared/constants/ventas';
import { ToastService } from '../../../shared/services/toast.service';

/**
 * Modal de compra de boletos de un viaje.
 * - Invitado: ve el mapa de asientos, pero no puede elegir ni pagar (se le invita a entrar).
 * - Cliente con sesión: elige asientos y paga con su cartera (reserva + cobro asíncrono).
 */
@Component({
  selector: 'app-asientos-viaje',
  standalone: true,
  imports: [ModalComponent, SelectorAsientosComponent, MapaRecorridoComponent, DatePipe, CurrencyPipe, LowerCasePipe],
  templateUrl: './asientos-viaje.component.html',
  styleUrl: './asientos-viaje.component.scss',
})
export class AsientosViajeComponent {
  private readonly servicio = inject(ViajesService);
  private readonly ventas = inject(VentasService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);
  private readonly sucursalesServicio = inject(SucursalesService);

  readonly zona = ZONA_GT;
  readonly estadoVenta = ESTADO_VENTA;
  /** Los motivos del backend son códigos de la saga de pago: aquí se muestran en palabras. */
  readonly motivo = textoMotivo;
  readonly viaje = input<Viaje | null>(null);
  readonly cerrar = output<void>();

  /** Sin sesión solo se pueden ver los asientos. */
  readonly invitado = computed(() => !this.auth.autenticado());

  readonly mapa = signal<MapaAsientos | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  /** Origen y destino del viaje en el mapa (se resuelven con la ruta y las sucursales). */
  readonly origenRecorrido = signal<Coordenadas | null>(null);
  readonly destinoRecorrido = signal<Coordenadas | null>(null);
  readonly recorrido = computed(() => {
    const origen = this.origenRecorrido();
    const destino = this.destinoRecorrido();
    return origen && destino ? { origen, destino } : null;
  });

  private rutas: Ruta[] | null = null;
  private sucursales: Sucursal[] | null = null;
  private cargandoRecorrido = false;

  readonly elegidos = signal<number[]>([]);
  readonly comprando = signal(false);
  readonly cobrando = signal(false);
  readonly pendiente = signal<VentaPendiente | null>(null);
  readonly ventaFinal = signal<Venta | null>(null);
  readonly fallo = signal<string | null>(null);

  constructor() {
    // Cada vez que se abre con un viaje, reinicia y carga su mapa de asientos.
    effect(() => {
      const v = this.viaje();
      if (v) {
        this.cargar(v.viajeId);
        this.cargarRecorrido(v);
      } else {
        this.reiniciar();
      }
    });
  }

  alElegir(asientos: number[]): void {
    this.elegidos.set(asientos);
  }

  /** Invitado: lo manda al login y al volver se reabre este viaje para que pague. */
  irALogin(): void {
    const viaje = this.viaje();
    this.avisos.info('Entra a tu cuenta para pagar tus boletos.');
    const base = this.router.url.split('?')[0];
    const volver = viaje ? `${base}?abrirViaje=${viaje.viajeId}` : base;
    this.router.navigate(['/login'], { queryParams: { volver } });
  }

  comprar(): void {
    const viaje = this.viaje();
    const asientos = this.elegidos();
    if (!viaje || asientos.length === 0 || this.comprando() || this.cobrando()) return;
    if (this.invitado()) {
      this.irALogin();
      return;
    }
    this.comprando.set(true);
    this.fallo.set(null);
    this.ventaFinal.set(null);
    this.ventas.venderEnLinea({ viajeId: viaje.viajeId, asientos, fechaPago: hoyGt() }).subscribe({
      next: (pendiente) => {
        this.comprando.set(false);
        this.pendiente.set(pendiente);
        this.avisos.info('Boletos reservados, cobrando a tu cartera…');
        this.seguirHastaFin(pendiente.ventaId);
      },
      error: (e) => {
        this.comprando.set(false);
        this.fallo.set(mensajeError(e, 'No se pudo crear la compra.'));
        this.avisos.error(mensajeError(e, 'No se pudo crear la compra.'));
      },
    });
  }

  /** Reintenta el paso que falló: el cobro si ya hay reserva, o la compra. */
  reintentar(): void {
    if (this.cobrando() || this.comprando()) return;
    const pendiente = this.pendiente();
    const final = this.ventaFinal();
    if (pendiente && (!final || final.estado === 'PENDIENTE_PAGO')) {
      this.fallo.set(null);
      this.seguirHastaFin(pendiente.ventaId);
    } else {
      this.comprar();
    }
  }

  cerrarModal(): void {
    if (this.comprando() || this.cobrando()) return;
    this.cerrar.emit();
  }

  private seguirHastaFin(ventaId: string): void {
    this.cobrando.set(true);
    this.ventas.seguirHastaFin(ventaId).subscribe({
      next: (v) => {
        if (v.estado === 'PENDIENTE_PAGO') return;
        this.cobrando.set(false);
        this.ventaFinal.set(v);
        if (v.estado === 'CONFIRMADA') {
          this.avisos.exito(`Compra confirmada: ${v.boletos.length} boleto(s) por Q${v.montoTotal}.`);
        } else {
          this.avisos.error(v.motivoRechazo ?? 'La compra fue rechazada.');
        }
      },
      error: (e) => {
        this.cobrando.set(false);
        this.fallo.set(mensajeError(e, 'No se pudo confirmar el cobro. Puedes reintentar.'));
        this.avisos.error(mensajeError(e, 'No se pudo confirmar el cobro. Puedes reintentar.'));
      },
    });
  }

  private cargar(viajeId: string): void {
    this.reiniciar();
    this.cargando.set(true);
    this.servicio.asientos(viajeId).subscribe({
      next: (m) => {
        this.mapa.set(m);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los asientos.'));
        this.cargando.set(false);
      },
    });
  }

  private reiniciar(): void {
    this.mapa.set(null);
    this.error.set('');
    this.cargando.set(false);
    this.elegidos.set([]);
    this.comprando.set(false);
    this.cobrando.set(false);
    this.pendiente.set(null);
    this.ventaFinal.set(null);
    this.fallo.set(null);
    this.origenRecorrido.set(null);
    this.destinoRecorrido.set(null);
  }

  /**
   * Resuelve el origen y el destino del viaje para dibujar la ruta antes de pagar.
   * El viaje solo trae `rutaId`; las coordenadas salen de la ruta y de sus sucursales
   * (ambas consultas son públicas, así que también funciona para invitados).
   */
  private cargarRecorrido(v: Viaje): void {
    this.origenRecorrido.set(null);
    this.destinoRecorrido.set(null);
    if (!v.rutaId) return; // Viaje privado: su mapa se ve en la pantalla del alquiler.
    if (this.rutas && this.sucursales) {
      this.aplicarRecorrido(v.rutaId);
      return;
    }
    if (this.cargandoRecorrido) return;

    this.cargandoRecorrido = true;
    forkJoin({
      activas: this.servicio.rutas(true),
      inactivas: this.servicio.rutas(false),
      sucursales: this.sucursalesServicio.listar(),
    }).subscribe({
      next: ({ activas, inactivas, sucursales }) => {
        this.rutas = [...activas, ...inactivas];
        this.sucursales = sucursales;
        this.cargandoRecorrido = false;
        const actual = this.viaje();
        if (actual?.rutaId) this.aplicarRecorrido(actual.rutaId);
      },
      error: () => {
        this.cargandoRecorrido = false;
      },
    });
  }

  private aplicarRecorrido(rutaId: string): void {
    const ruta = this.rutas?.find((r) => r.rutaId === rutaId);
    if (!ruta) return;
    const origen = this.sucursales?.find((s) => s.sucursalId === ruta.sucursalOrigenId);
    const destino = this.sucursales?.find((s) => s.sucursalId === ruta.sucursalDestinoId);
    if (!origen || !destino) return;
    this.origenRecorrido.set({ latitud: origen.latitud, longitud: origen.longitud });
    this.destinoRecorrido.set({ latitud: destino.latitud, longitud: destino.longitud });
  }
}
