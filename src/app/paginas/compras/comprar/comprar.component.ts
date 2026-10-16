import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Venta, VentaPendiente } from '../../../core/models/venta.model';
import { MapaAsientos, Viaje } from '../../../core/models/viaje.model';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';
import { AuthService } from '../../../core/services/auth.service';
/** Compra de boletos en línea: busca viajes, elige asientos y paga con la cartera. */
@Component({
  selector: 'app-comprar',
  standalone: true,
  imports: [FormsModule, PaginadorComponent, ModalComponent, SelectorAsientosComponent, DatePipe, CurrencyPipe],
  templateUrl: './comprar.component.html',
  styleUrl: './comprar.component.scss',
})
export class ComprarComponent implements OnInit {
  private readonly viajesServicio = inject(ViajesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly ventas = inject(VentasService);
  private readonly avisos = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly zona = ZONA_GT;
  /** Sin sesión se puede ver y elegir todo; al pagar se pide entrar. */
  readonly invitado = computed(() => !this.auth.autenticado());

  readonly sucursales = signal<Sucursal[]>([]);
  readonly origenId = signal('');
  readonly destinoId = signal('');
  readonly desde = signal(hoyGt());
  readonly hasta = signal(hoyGt(30));

  private readonly viajes = signal<Viaje[]>([]);
  readonly buscando = signal(false);
  readonly buscoAlgunaVez = signal(false);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly paginaActual = computed(() => paginar(this.viajes(), this.pagina(), this.tamano()));

  readonly viajeElegido = signal<Viaje | null>(null);
  readonly mapa = signal<MapaAsientos | null>(null);
  readonly cargandoMapa = signal(false);
  readonly elegidos = signal<number[]>([]);

  readonly comprando = signal(false);
  readonly cobrando = signal(false);
  readonly pendiente = signal<VentaPendiente | null>(null);
  readonly ventaFinal = signal<Venta | null>(null);
  readonly fallo = signal<string | null>(null);

  ngOnInit(): void {
    this.sucursalesServicio.listar(true).subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.buscar();
  }

  buscar(): void {
    this.buscando.set(true);
    this.buscoAlgunaVez.set(true);
    this.pagina.set(1);
    const origen = this.origenId() || null;
    this.viajesServicio
      .buscar({ sucursalId: origen, desde: this.desde() || null, hasta: this.hasta() || null })
      .subscribe({
        next: (lista) => {
          const ahora = Date.now();
          const destino = this.destinoId()
            ? this.sucursales().find((s) => s.sucursalId === this.destinoId())
            : undefined;
          this.viajes.set(
            lista.filter((v) => {
              if (v.estado !== 'PROGRAMADO') return false;
              if (Number.isNaN(Date.parse(v.fechaSalidaProgramada))) return false;
              if (Date.parse(v.fechaSalidaProgramada) <= ahora) return false;
              if (destino && normalizar(v.destinoNombre) !== normalizar(destino.nombre)) return false;
              return true;
            }),
          );
          this.buscando.set(false);
        },
        error: (e) => {
          this.buscando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron buscar los viajes.'));
        },
      });
  }

  /** Duración estimada del viaje para la tarjeta. */
  duracion(v: Viaje): string {
    const minutos = Math.round((Date.parse(v.fechaLlegadaEstimada) - Date.parse(v.fechaSalidaProgramada)) / 60000);
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  }

  abrirCompra(viaje: Viaje): void {
    this.viajeElegido.set(viaje);
    this.mapa.set(null);
    this.elegidos.set([]);
    this.pendiente.set(null);
    this.ventaFinal.set(null);
    this.fallo.set(null);
    this.cargandoMapa.set(true);
    this.viajesServicio.asientos(viaje.viajeId).subscribe({
      next: (mapa) => {
        this.mapa.set(mapa);
        this.cargandoMapa.set(false);
      },
      error: (e) => {
        this.cargandoMapa.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el mapa de asientos.'));
      },
    });
  }

  alElegir(asientos: number[]): void {
    this.elegidos.set(asientos);
  }

  /** Invitado: lo manda al login y regresa solo a esta página. */
  irALogin(): void {
    this.avisos.info('Entra a tu cuenta para pagar tus boletos.');
    this.router.navigate(['/login'], { queryParams: { volver: this.router.url } });
  }

  comprar(): void {
    const viaje = this.viajeElegido();
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

  /** Vuelve a intentar el paso que falló: el cobro si ya hay reserva, o la compra. */
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
    this.viajeElegido.set(null);
    this.mapa.set(null);
    this.elegidos.set([]);
    this.pendiente.set(null);
    this.ventaFinal.set(null);
    this.fallo.set(null);
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
}
