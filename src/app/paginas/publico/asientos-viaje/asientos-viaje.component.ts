import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Venta, VentaPendiente } from '../../../core/models/venta.model';
import { MapaAsientos, Viaje } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { ToastService } from '../../../shared/services/toast.service';

/**
 * Modal de compra de boletos de un viaje.
 * - Invitado: ve el mapa de asientos, pero no puede elegir ni pagar (se le invita a entrar).
 * - Cliente con sesión: elige asientos y paga con su cartera (reserva + cobro asíncrono).
 */
@Component({
  selector: 'app-asientos-viaje',
  standalone: true,
  imports: [ModalComponent, SelectorAsientosComponent, DatePipe, CurrencyPipe],
  templateUrl: './asientos-viaje.component.html',
  styleUrl: './asientos-viaje.component.scss',
})
export class AsientosViajeComponent {
  private readonly servicio = inject(ViajesService);
  private readonly ventas = inject(VentasService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  readonly zona = ZONA_GT;
  readonly viaje = input<Viaje | null>(null);
  readonly cerrar = output<void>();

  /** Sin sesión solo se pueden ver los asientos. */
  readonly invitado = computed(() => !this.auth.autenticado());

  readonly mapa = signal<MapaAsientos | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

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
      if (v) this.cargar(v.viajeId);
      else this.reiniciar();
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
  }
}
