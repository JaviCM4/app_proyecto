import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Venta } from '../../../core/models/venta.model';
import { MapaAsientos, Viaje } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { ToastService } from '../../../shared/services/toast.service';
import { Ruta } from '../../../core/models/viaje.model';

/** Venta en mostrador: buscar viaje, elegir asientos y cobrar en efectivo (confirmada al instante). */
@Component({
  selector: 'app-mostrador',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe, ModalComponent, SelectorAsientosComponent],
  templateUrl: './mostrador.component.html',
  styleUrl: './mostrador.component.scss',
})
export class MostradorComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly viajesServicio = inject(ViajesService);
  private readonly ventasServicio = inject(VentasService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly zona = ZONA_GT;

  readonly sucursales = signal<Sucursal[]>([]);
  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly destinoId = signal('');
  readonly fecha = signal(hoyGt());
  readonly hasta = signal(hoyGt(7));

  private readonly viajes = signal<Viaje[]>([]);
  readonly buscando = signal(false);

  /** Viaje elegido: abre el modal de asientos y cobro. */
  readonly viajeElegido = signal<Viaje | null>(null);
  readonly mapa = signal<MapaAsientos | null>(null);
  readonly cargandoMapa = signal(false);
  readonly asientosElegidos = signal<number[]>([]);
  readonly vendiendo = signal(false);

  /** Última venta confirmada en esta sesión de mostrador. */
  readonly ventaConfirmada = signal<Venta | null>(null);

  readonly formVenta = this.fb.group({
    clienteNit: [''],
    clienteNombre: [''],
    clienteCorreo: ['', Validators.email],
    fechaPago: [hoyGt(), Validators.required],
  });

  readonly filtrados = computed(() => {    const d = this.destinoId();
    if (!d) return this.viajes();
    const rutasDestino = new Set(this.rutasOrigen().filter((r) => r.sucursalDestinoId === d).map((r) => r.rutaId));
    return this.viajes().filter((v) => v.rutaId !== null && rutasDestino.has(v.rutaId));
  });

  /** Rutas que salen de la sucursal (para el combo de destino). */
  private readonly rutasOrigen = signal<Ruta[]>([]);

  /** Destinos con salida desde la sucursal (para el combo). */
  readonly destinos = computed(() => {
    const vistas = new Map<string, string>();
    for (const r of this.rutasOrigen()) {
      if (!vistas.has(r.sucursalDestinoId)) vistas.set(r.sucursalDestinoId, r.destinoNombre);
    }
    return [...vistas.entries()].map(([id, nombre]) => ({ id, nombre }));
  });

  /** Nombre de la sucursal origen (fija para el cajero). */
  readonly nombreOrigen = computed(
    () => this.sucursales().find((s) => s.sucursalId === this.sucursalId())?.nombre ?? 'Mi sucursal',
  );

  readonly total = computed(() => this.asientosElegidos().length * (this.mapa()?.precioBoleto ?? 0));

  ngOnInit(): void {
    // Destinos y nombre de origen: todos ven las sucursales (consulta pública).
    this.sucursalesServicio.listar(true).subscribe({
      next: (lista) => {
        this.sucursales.set(lista);
        this.cargarRutas();
      },
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.buscar();
  }

  cambiarSucursal(id: string): void {
    this.sucursalId.set(id);
    this.destinoId.set('');
    this.cargarRutas();
    this.buscar();
  }

  /** Rutas que salen de la sucursal elegida (para el combo de destino). */
  private cargarRutas(): void {
    const origen = this.sucursalId();
    if (!origen) {
      this.rutasOrigen.set([]);
      return;
    }
    this.viajesServicio.rutas(true).subscribe({
      next: (todas) => this.rutasOrigen.set(todas.filter((r) => r.sucursalOrigenId === origen)),
      error: () => this.rutasOrigen.set([]),
    });
  }

  buscar(): void {
    const fecha = this.fecha();
    if (!fecha) {
      this.avisos.info('Elige la fecha del viaje para buscar.');
      return;
    }
    this.buscando.set(true);
    this.viajesServicio
      .buscar({ sucursalId: this.sucursalId() || null, desde: fecha, hasta: this.hasta() || null, estado: 'PROGRAMADO' })
      .subscribe({
        next: (lista) => {
          this.viajes.set(lista);
          this.buscando.set(false);
        },
        error: (e) => {
          this.buscando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron buscar los viajes.'));
        },
      });
  }

  elegir(v: Viaje): void {
    this.viajeElegido.set(v);
    this.mapa.set(null);
    this.asientosElegidos.set([]);
    this.formVenta.reset({ clienteNit: '', clienteNombre: '', clienteCorreo: '', fechaPago: hoyGt() });
    this.cargandoMapa.set(true);
    this.viajesServicio.asientos(v.viajeId).subscribe({
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

  cerrarModal(): void {
    if (this.vendiendo()) return;
    this.viajeElegido.set(null);
    this.mapa.set(null);
    this.asientosElegidos.set([]);
  }

  vender(): void {
    const viaje = this.viajeElegido();
    if (!viaje) return;
    if (this.asientosElegidos().length === 0) {
      this.avisos.info('Elige al menos un asiento para vender.');
      return;
    }
    if (this.formVenta.invalid) {
      this.formVenta.markAllAsTouched();
      return;
    }
    const f = this.formVenta.getRawValue();
    this.vendiendo.set(true);
    this.ventasServicio
      .venderEnMostrador({
        viajeId: viaje.viajeId,
        asientos: this.asientosElegidos(),
        clienteNit: f.clienteNit || null,
        clienteNombre: f.clienteNombre || null,
        clienteCorreo: f.clienteCorreo || null,
        fechaPago: f.fechaPago ?? hoyGt(),
      })
      .subscribe({
        next: (venta) => {
          this.vendiendo.set(false);
          this.ventaConfirmada.set(venta);
          this.viajeElegido.set(null);
          this.mapa.set(null);
          this.asientosElegidos.set([]);
          this.avisos.exito('Venta confirmada. Cobra en efectivo.');
          this.buscar();
        },
        error: (e) => {
          this.vendiendo.set(false);
          marcarErroresServidor(this.formVenta, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la venta.'));
        },
      });
  }

  nuevaVenta(): void {
    this.ventaConfirmada.set(null);
  }
}
