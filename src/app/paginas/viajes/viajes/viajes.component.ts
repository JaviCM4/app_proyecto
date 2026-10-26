import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Bus } from '../../../core/models/bus.model';
import { Chofer } from '../../../core/models/chofer.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { EstadoViaje, MapaAsientos, Ruta, Viaje, ViajeDetalle } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { BusesService } from '../../../core/services/buses.service';
import { ChoferesService } from '../../../core/services/choferes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, fechaHoraGt } from '../../../core/utils/fechas';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

type FiltroEstado = 'TODAS' | EstadoViaje;

/** Pestañas del detalle de un viaje. */
type PestanaViaje = 'datos' | 'asientos' | 'mapa';

/** Viajes regulares: programar, ver detalle, editar, eliminar y registrar salida/llegada. */
@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    CurrencyPipe,
    ModalComponent,
    PaginadorComponent,
    SelectorAsientosComponent,
    MapaRecorridoComponent,
  ],
  templateUrl: './viajes.component.html',
  styleUrl: './viajes.component.scss',
})
export class ViajesComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly servicio = inject(ViajesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly busesServicio = inject(BusesService);
  private readonly choferesServicio = inject(ChoferesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');

  private readonly viajes = signal<Viaje[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly rutas = signal<Ruta[]>([]);
  readonly buses = signal<Bus[]>([]);
  readonly choferes = signal<Chofer[]>([]);
  readonly cargando = signal(true);
  readonly zona = ZONA_GT;

  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly rutaId = signal('');
  readonly estado = signal<FiltroEstado>('TODAS');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly programando = signal(false);
  readonly editando = signal<Viaje | null>(null);
  readonly detalleVisible = signal(false);
  readonly enDetalle = signal<ViajeDetalle | null>(null);
  readonly cargandoDetalle = signal(false);
  /** Foto del bus del viaje abierto en el detalle (null mientras carga o si no tiene). */
  readonly fotoBus = signal<string | null>(null);
  /** Pestaña abierta del detalle: datos del viaje, mapa de asientos o mapa del recorrido. */
  readonly pestanaViaje = signal<PestanaViaje>('datos');
  /** Asientos vendidos del viaje abierto (solo para ver: aquí no se vende). */
  readonly mapaAsientos = signal<MapaAsientos | null>(null);
  readonly cargandoAsientos = signal(false);
  readonly sinAsientos = signal('');
  readonly porEliminar = signal<Viaje | null>(null);
  readonly enSalida = signal<Viaje | null>(null);
  readonly enLlegada = signal<Viaje | null>(null);
  readonly enviando = signal(false);

  readonly formViaje = this.fb.nonNullable.group({
    rutaId: ['', Validators.required],
    busId: ['', Validators.required],
    choferId: ['', Validators.required],
    salida: ['', Validators.required],
    llegada: ['', Validators.required],
  });

  readonly formEditar = this.fb.nonNullable.group({
    busId: ['', Validators.required],
    choferId: ['', Validators.required],
    salida: ['', Validators.required],
    llegada: ['', Validators.required],
  });

  readonly formSalida = this.fb.nonNullable.group({
    fechaHora: ['', Validators.required],
    kmInicial: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly formLlegada = this.fb.nonNullable.group({
    fechaHora: ['', Validators.required],
    kmFinal: [null as number | null, [Validators.required, Validators.min(0)]],
    costoCombustible: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly formEliminar = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(255)]],
  });

  readonly rutasDeSucursal = computed(() => {
    const sucursal = this.sucursalId();
    return this.rutas().filter((r) => !sucursal || r.sucursalOrigenId === sucursal);
  });

  readonly filtrados = computed(() => {
    const estado = this.estado();
    return this.viajes().filter((v) => estado === 'TODAS' || v.estado === estado);
  });

  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  /**
   * Sucursales de origen y destino del viaje abierto, para dibujar el recorrido. Salen de la ruta:
   * el viaje solo guarda los nombres, y el mapa necesita las coordenadas de cada sucursal.
   */
  readonly recorrido = computed(() => {
    const viaje = this.enDetalle();
    if (!viaje?.rutaId) return null;
    const ruta = this.rutas().find((r) => r.rutaId === viaje.rutaId);
    if (!ruta) return null;
    const origen = this.sucursales().find((s) => s.sucursalId === ruta.sucursalOrigenId);
    const destino = this.sucursales().find((s) => s.sucursalId === ruta.sucursalDestinoId);
    return origen && destino ? { origen, destino, ruta } : null;
  });

  ngOnInit(): void {
    this.sucursalesServicio.listar().subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.cargarListas();
    this.cargarViajes();
  }

  cambiarSucursal(id: string): void {
    this.sucursalId.set(id);
    this.rutaId.set('');
    this.pagina.set(1);
    this.cargarListas();
    this.cargarViajes();
  }

  cambiarFiltro(valor: Partial<{ rutaId: string; estado: FiltroEstado; desde: string; hasta: string }>): void {
    if (valor.rutaId !== undefined) this.rutaId.set(valor.rutaId);
    if (valor.estado !== undefined) this.estado.set(valor.estado);
    if (valor.desde !== undefined) this.desde.set(valor.desde);
    if (valor.hasta !== undefined) this.hasta.set(valor.hasta);
    this.pagina.set(1);
    if (valor.rutaId !== undefined || valor.desde !== undefined || valor.hasta !== undefined) this.cargarViajes();
  }

  cargarViajes(): void {
    this.cargando.set(true);
    this.servicio
      .buscar({
        sucursalId: this.sucursalId() || null,
        rutaId: this.rutaId() || null,
        desde: this.desde() || null,
        hasta: this.hasta() || null,
      })
      .subscribe({
        next: (lista) => {
          this.viajes.set(lista);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron cargar los viajes.'));
        },
      });
  }

  private cargarListas(): void {
    const sucursal = this.sucursalId() || null;
    this.servicio.rutas(true).subscribe({
      next: (lista) => this.rutas.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las rutas.')),
    });
    this.busesServicio.listar(sucursal, 'ACTIVO').subscribe({
      next: (lista) => this.buses.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar los buses.')),
    });
    this.choferesServicio.listar(sucursal, 'ACTIVO').subscribe({
      next: (lista) => this.choferes.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar los choferes.')),
    });
  }

  verDetalle(v: Viaje): void {
    this.cargandoDetalle.set(true);
    this.enDetalle.set(null);
    this.detalleVisible.set(true);
    this.pestanaViaje.set('datos');
    this.cargarAsientos(v.viajeId);
    this.servicio.detalleViaje(v.viajeId).subscribe({
      next: (detalle) => {
        this.cargandoDetalle.set(false);
        this.enDetalle.set(detalle);
        this.cargarFotoBus(detalle.busId);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle del viaje.'));
      },
    });
  }

  abrirProgramar(): void {
    this.formViaje.reset({ rutaId: this.rutaId() || '', busId: '', choferId: '', salida: '', llegada: '' });
    this.programando.set(true);
  }

  programar(): void {
    if (this.formViaje.invalid) {
      this.formViaje.markAllAsTouched();
      return;
    }
    const v = this.formViaje.getRawValue();
    this.enviando.set(true);
    this.servicio
      .programarViaje({
        rutaId: v.rutaId,
        busId: v.busId,
        choferId: v.choferId,
        fechaSalidaProgramada: fechaHoraGt(v.salida),
        fechaLlegadaEstimada: fechaHoraGt(v.llegada),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.programando.set(false);
          this.avisos.exito('Viaje programado.');
          this.cargarViajes();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formViaje, e);
          this.avisos.error(mensajeError(e, 'No se pudo programar el viaje.'));
        },
      });
  }

  abrirEditar(v: Viaje): void {
    this.formEditar.reset({
      busId: v.busId,
      choferId: v.choferId,
      salida: this.aLocal(v.fechaSalidaProgramada),
      llegada: this.aLocal(v.fechaLlegadaEstimada),
    });
    this.editando.set(v);
  }

  guardarEdicion(): void {
    const v = this.editando();
    if (!v) return;
    if (this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      return;
    }
    const f = this.formEditar.getRawValue();
    this.enviando.set(true);
    this.servicio
      .actualizarViaje(v.viajeId, {
        busId: f.busId,
        choferId: f.choferId,
        fechaSalidaProgramada: fechaHoraGt(f.salida),
        fechaLlegadaEstimada: fechaHoraGt(f.llegada),
        version: v.version,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.editando.set(null);
          this.avisos.exito('Viaje actualizado.');
          this.cargarViajes();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formEditar, e);
          this.avisos.error(mensajeError(e, 'No se pudo actualizar el viaje.'));
        },
      });
  }

  abrirEliminar(v: Viaje): void {
    this.formEliminar.reset({ motivo: '' });
    this.porEliminar.set(v);
  }

  confirmarEliminar(): void {
    const v = this.porEliminar();
    if (!v) return;
    if (this.formEliminar.invalid) {
      this.formEliminar.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.servicio.eliminarViaje(v.viajeId, this.formEliminar.getRawValue().motivo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.porEliminar.set(null);
        this.avisos.exito('Viaje eliminado.');
        this.cargarViajes();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo eliminar el viaje.'));
      },
    });
  }

  abrirSalida(v: Viaje): void {
    this.formSalida.reset({ fechaHora: '', kmInicial: null });
    this.enSalida.set(v);
  }

  confirmarSalida(): void {
    const v = this.enSalida();
    if (!v) return;
    if (this.formSalida.invalid) {
      this.formSalida.markAllAsTouched();
      return;
    }
    const f = this.formSalida.getRawValue();
    this.enviando.set(true);
    this.servicio
      .registrarSalida(v.viajeId, { fechaHoraSalida: fechaHoraGt(f.fechaHora), kmInicial: Number(f.kmInicial) })
      .subscribe({
        next: (detalle) => {
          this.enviando.set(false);
          this.enSalida.set(null);
          this.avisos.exito('Salida registrada. El viaje está en ruta.');
          this.detalleVisible.set(true);
          this.enDetalle.set(detalle);
        this.cargarFotoBus(detalle.busId);
          this.cargarViajes();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formSalida, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la salida.'));
        },
      });
  }

  abrirLlegada(v: Viaje): void {
    this.formLlegada.reset({ fechaHora: '', kmFinal: null, costoCombustible: null });
    this.enLlegada.set(v);
  }

  confirmarLlegada(): void {
    const v = this.enLlegada();
    if (!v) return;
    if (this.formLlegada.invalid) {
      this.formLlegada.markAllAsTouched();
      return;
    }
    const f = this.formLlegada.getRawValue();
    this.enviando.set(true);
    this.servicio
      .registrarLlegada(v.viajeId, {
        fechaHoraLlegada: fechaHoraGt(f.fechaHora),
        kmFinal: Number(f.kmFinal),
        costoCombustible: Number(f.costoCombustible),
      })
      .subscribe({
        next: (detalle) => {
          this.enviando.set(false);
          this.enLlegada.set(null);
          this.avisos.exito('Llegada registrada. El viaje quedó completado.');
          this.detalleVisible.set(true);
          this.enDetalle.set(detalle);
        this.cargarFotoBus(detalle.busId);
          this.cargarViajes();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formLlegada, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la llegada.'));
        },
      });
  }

  cerrarDetalle(): void {
    this.detalleVisible.set(false);
    this.enDetalle.set(null);
    this.fotoBus.set(null);
    this.mapaAsientos.set(null);
    this.sinAsientos.set('');
  }

  /**
   * Mapa de asientos del viaje (consulta pública de Sales). Un viaje ya completado o sin copia en
   * Sales no lo tiene: la pestaña lo dice en lugar de quedarse vacía.
   */
  private cargarAsientos(viajeId: string): void {
    this.mapaAsientos.set(null);
    this.sinAsientos.set('');
    this.cargandoAsientos.set(true);
    this.servicio.asientos(viajeId).subscribe({
      next: (mapa) => {
        this.cargandoAsientos.set(false);
        this.mapaAsientos.set(mapa);
      },
      error: () => {
        this.cargandoAsientos.set(false);
        this.sinAsientos.set('Este viaje ya no tiene mapa de asientos (solo los viajes a la venta lo tienen).');
      },
    });
  }

  /** La foto del bus está en Fleet; si no se puede cargar el detalle se muestra sin ella. */
  private cargarFotoBus(busId: string): void {
    this.fotoBus.set(null);
    this.busesServicio.detalle(busId).subscribe({
      next: (bus) => this.fotoBus.set(bus.fotoUrl || null),
      error: () => this.fotoBus.set(null),
    });
  }

  /** Convierte un OffsetDateTime ("…T06:00:00-06:00") a datetime-local ("…T06:00"). */
  private aLocal(fecha: string): string {
    return fecha.length >= 16 ? fecha.slice(0, 16) : fecha;
  }
}
