import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Sucursal } from '../../../core/models/sucursal.model';
import {
  CanalVenta,
  EstadoVenta,
  Historial,
  Venta,
} from '../../../core/models/venta.model';
import { EstadoViaje, Viaje } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import {
  CANAL_VENTA,
  ESTADO_ORDEN_ALQUILER,
  ESTADO_VENTA,
  ESTADO_VIAJE,
  METODO_PAGO,
  ordenarVentas,
  textoViaje,
} from '../../../shared/constants/ventas';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';

type FiltroEstado = 'TODAS' | EstadoVenta;
type FiltroCanal = 'TODOS' | CanalVenta;
type Pestana = 'ventas' | 'historial';

/** Ventas (filtros por estado, canal, fechas, viaje y cliente; detalle y cancelación) e historial por NIT, en pestañas. */
@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    ModalComponent,
    ConfirmacionComponent,
    PaginadorComponent,
  ],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.scss',
})
export class VentasComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly servicio = inject(VentasService);
  private readonly viajesServicio = inject(ViajesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly puedeCancelar = this.auth.tieneRol('ADMIN_SUCURSAL');

  readonly estados: FiltroEstado[] = ['TODAS', 'PENDIENTE_PAGO', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA', 'REEMBOLSADA'];
  readonly canales: FiltroCanal[] = ['TODOS', 'EN_LINEA', 'PRESENCIAL'];
  readonly estadoVenta = ESTADO_VENTA;
  readonly canalVenta = CANAL_VENTA;
  readonly metodoPago = METODO_PAGO;
  readonly estadoOrden = ESTADO_ORDEN_ALQUILER;
  readonly estadoViaje = ESTADO_VIAJE;

  readonly pestana = signal<Pestana>('ventas');
  readonly zona = ZONA_GT;

  /** Viajes de la sucursal: dan la ruta y la salida de cada venta y alimentan el filtro por viaje. */
  private readonly viajes = signal<Map<string, Viaje>>(new Map());
  readonly viajeId = signal('');

  private readonly ventas = signal<Venta[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(true);

  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly estado = signal<FiltroEstado>('TODAS');
  readonly canal = signal<FiltroCanal>('TODOS');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly texto = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly enDetalle = signal<Venta | null>(null);
  readonly cargandoDetalle = signal(false);

  /** Venta en proceso de cancelación (abre el modal con motivo y fecha). */
  readonly porCancelar = signal<Venta | null>(null);
  readonly confirmando = signal(false);
  readonly cancelando = signal(false);

  readonly nitHistorial = signal('');
  readonly historial = signal<Historial | null>(null);
  readonly buscandoHistorial = signal(false);

  readonly formCancelar = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(255)]],
    fechaCancelacion: [hoyGt(), Validators.required],
  });

  /**
   * Viajes que tienen ventas cargadas, agrupados por estado (En ruta, Programado, Completado).
   * Programados y en ruta: el que sale antes primero; completados: el más reciente primero.
   * Cada opción lleva la placa del bus para distinguir viajes de la misma ruta y hora.
   */
  readonly gruposViaje = computed(() => {
    const ids = [...new Set(this.ventas().map((v) => v.viajeId))];
    const grupos = new Map<EstadoViaje | 'OTRO', { id: string; texto: string; salida: string }[]>();
    for (const id of ids) {
      const viaje = this.viajes().get(id);
      const clave = viaje?.estado ?? 'OTRO';
      const placa = viaje?.busPlaca ? ` · Bus ${viaje.busPlaca}` : '';
      const opcion = {
        id,
        salida: viaje?.fechaSalidaProgramada ?? '',
        texto: viaje
          ? textoViaje(viaje.origenNombre, viaje.destinoNombre, viaje.fechaSalidaProgramada) + placa
          : `Viaje ${id.slice(0, 8)}`,
      };
      grupos.set(clave, [...(grupos.get(clave) ?? []), opcion]);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => (a === 'OTRO' ? 9 : ESTADO_VIAJE[a].orden) - (b === 'OTRO' ? 9 : ESTADO_VIAJE[b].orden))
      .map(([estado, opciones]) => ({
        estado,
        texto: estado === 'OTRO' ? 'Sin datos del viaje' : `${ESTADO_VIAJE[estado].texto} (${opciones.length})`,
        opciones: opciones.sort((x, y) =>
          estado === 'COMPLETADO' || estado === 'OTRO' ? y.salida.localeCompare(x.salida) : x.salida.localeCompare(y.salida),
        ),
      }));
  });

  readonly filtradas = computed(() => {
    const buscado = normalizar(this.texto());
    const viaje = this.viajeId();
    return this.ventas().filter(
      (v) =>
        (!viaje || v.viajeId === viaje) &&
        (!buscado ||
          normalizar(`${v.clienteNit ?? ''} ${v.clienteNombre ?? ''}`).includes(buscado)),
    );
  });

  readonly paginaActual = computed(() => paginar(this.filtradas(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    if (this.esSistema) {
      this.sucursalesServicio.listar().subscribe({
        next: (lista) => this.sucursales.set(lista),
        error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
      });
    }
    this.cargar();
    this.cargarViajes();
  }

  cambiarSucursal(id: string): void {
    this.sucursalId.set(id);
    this.viajeId.set('');
    this.cambiarFiltro();
    this.cargarViajes();
  }

  filtrarViaje(id: string): void {
    this.viajeId.set(id);
    this.pagina.set(1);
  }

  /** Ruta y salida de la venta: del detalle si ya viene, si no del viaje de la sucursal. */
  rutaDe(v: Venta): { texto: string; salida: string | null } | null {
    if (v.viaje) return { texto: `${v.viaje.origenNombre} → ${v.viaje.destinoNombre}`, salida: v.viaje.fechaSalida };
    const viaje = this.viajes().get(v.viajeId);
    return viaje
      ? { texto: `${viaje.origenNombre} → ${viaje.destinoNombre}`, salida: viaje.fechaSalidaProgramada }
      : null;
  }

  /** Estado del viaje de la venta (Programado, En ruta, Completado), si se conoce. */
  estadoViajeDe(v: Venta): { texto: string; clase: string } | null {
    const estado = this.viajes().get(v.viajeId)?.estado;
    return estado ? ESTADO_VIAJE[estado] : null;
  }

  private cargarViajes(): void {
    this.viajesServicio.buscar({ sucursalId: this.sucursalId() || null }).subscribe({
      next: (lista) => this.viajes.set(new Map(lista.map((v) => [v.viajeId, v]))),
      // Sin viajes la tabla sigue funcionando; solo no muestra la ruta
      error: () => this.viajes.set(new Map()),
    });
  }

  cambiarFiltro(): void {
    this.pagina.set(1);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .listar({
        sucursalId: this.sucursalId() || null,
        estado: this.estado() === 'TODAS' ? null : (this.estado() as EstadoVenta),
        canal: this.canal() === 'TODOS' ? null : (this.canal() as CanalVenta),
        desde: this.desde() || null,
        hasta: this.hasta() || null,
      })
      .subscribe({
        next: (lista) => {
          this.ventas.set(ordenarVentas(lista));
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron cargar las ventas.'));
        },
      });
  }

  filtrar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  verDetalle(v: Venta): void {
    this.cargandoDetalle.set(true);
    this.enDetalle.set(v);
    this.servicio.detalle(v.ventaId).subscribe({
      next: (detalle) => {
        this.cargandoDetalle.set(false);
        this.enDetalle.set(detalle);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle de la venta.'));
      },
    });
  }

  abrirCancelar(v: Venta): void {
    this.formCancelar.reset({ motivo: '', fechaCancelacion: hoyGt() });
    this.confirmando.set(false);
    this.porCancelar.set(v);
  }

  pedirConfirmacion(): void {
    if (this.formCancelar.invalid) {
      this.formCancelar.markAllAsTouched();
      return;
    }
    this.confirmando.set(true);
  }

  confirmarCancelar(): void {
    const v = this.porCancelar();
    if (!v) return;
    const f = this.formCancelar.getRawValue();
    this.cancelando.set(true);
    this.servicio
      .cancelar(v.ventaId, { motivo: f.motivo, fechaCancelacion: f.fechaCancelacion, version: v.version })
      .subscribe({
        next: (actualizada) => {
          this.ventas.update((lista) =>
            lista.map((x) => (x.ventaId === actualizada.ventaId ? actualizada : x)),
          );
          if (this.enDetalle()?.ventaId === actualizada.ventaId) this.enDetalle.set(actualizada);
          this.avisos.exito('Venta cancelada.');
          this.cancelando.set(false);
          this.porCancelar.set(null);
          this.confirmando.set(false);
        },
        error: (e) => {
          this.cancelando.set(false);
          this.confirmando.set(false);
          marcarErroresServidor(this.formCancelar, e);
          this.avisos.error(mensajeError(e, 'No se pudo cancelar la venta.'));
        },
      });
  }

  buscarHistorial(): void {
    const nit = this.nitHistorial().trim();
    if (!nit) {
      this.avisos.info('Escribe el NIT para ver su historial.');
      return;
    }
    this.buscandoHistorial.set(true);
    this.servicio.historialPorNit(nit).subscribe({
      next: (h) => {
        this.historial.set(h);
        this.buscandoHistorial.set(false);
        if (h.ventas.length === 0 && h.alquileres.length === 0) {
          this.avisos.info('Ese NIT no tiene ventas ni alquileres.');
        }
      },
      error: (e) => {
        this.buscandoHistorial.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el historial de ese NIT.'));
      },
    });
  }
}
