import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Sucursal } from '../../../core/models/sucursal.model';
import { EstadoViaje, Ruta, Viaje, ViajeDetalle } from '../../../core/models/viaje.model';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, ahoraGt, fechaHoraGt } from '../../../core/utils/fechas';
import { Coordenadas, MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

type FiltroEstado = 'TODAS' | EstadoViaje;

/**
 * Vista del piloto (CHOFER): sus viajes asignados y el registro de la salida y la llegada.
 * Solo maneja los viajes que el backend le devuelve en /trips/viajes/mios.
 */
@Component({
  selector: 'app-mis-viajes-chofer',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, CurrencyPipe, ModalComponent, PaginadorComponent, MapaRecorridoComponent],
  templateUrl: './mis-viajes.component.html',
  styleUrl: './mis-viajes.component.scss',
})
export class MisViajesChoferComponent implements OnInit {
  private readonly servicio = inject(ViajesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly zona = ZONA_GT;

  private readonly viajes = signal<Viaje[]>([]);
  readonly cargando = signal(true);

  readonly estado = signal<FiltroEstado>('TODAS');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(9);

  readonly enSalida = signal<Viaje | null>(null);
  readonly enLlegada = signal<Viaje | null>(null);
  readonly enviando = signal(false);

  readonly detalleVisible = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly enDetalle = signal<ViajeDetalle | null>(null);

  /** Origen y destino del recorrido para el mapa del detalle (salen de la ruta y sus sucursales). */
  readonly origenRecorrido = signal<Coordenadas | null>(null);
  readonly destinoRecorrido = signal<Coordenadas | null>(null);
  readonly recorrido = computed(() => {
    const origen = this.origenRecorrido();
    const destino = this.destinoRecorrido();
    return origen && destino ? { origen, destino } : null;
  });

  private rutas: Ruta[] | null = null;
  private sucursales: Sucursal[] | null = null;
  readonly cargandoRecorrido = signal(false);

  readonly formSalida = this.fb.nonNullable.group({
    fechaHora: [ahoraGt(), Validators.required],
    kmInicial: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly formLlegada = this.fb.nonNullable.group({
    fechaHora: [ahoraGt(), Validators.required],
    kmFinal: [null as number | null, [Validators.required, Validators.min(0)]],
    costoCombustible: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly filtrados = computed(() => {
    const estado = this.estado();
    return this.viajes().filter((v) => estado === 'TODAS' || v.estado === estado);
  });

  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .mios({ desde: this.desde() || null, hasta: this.hasta() || null })
      .subscribe({
        next: (lista) => {
          this.viajes.set(lista);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron cargar tus viajes.'));
        },
      });
  }

  cambiarEstado(valor: FiltroEstado): void {
    this.estado.set(valor);
    this.pagina.set(1);
  }

  limpiarFechas(): void {
    this.desde.set('');
    this.hasta.set('');
    this.cargar();
  }

  verDetalle(v: Viaje): void {
    this.cargandoDetalle.set(true);
    this.enDetalle.set(null);
    this.limpiarRecorrido();
    this.detalleVisible.set(true);
    this.servicio.detalleViaje(v.viajeId).subscribe({
      next: (detalle) => {
        this.cargandoDetalle.set(false);
        this.enDetalle.set(detalle);
        this.cargarRecorrido(detalle);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle del viaje.'));
      },
    });
  }

  abrirSalida(v: Viaje): void {
    this.formSalida.reset({ fechaHora: ahoraGt(), kmInicial: null });
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
          this.avisos.exito('Salida registrada. Buen viaje.');
          this.enDetalle.set(detalle);
          this.cargarRecorrido(detalle);
          this.detalleVisible.set(true);
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formSalida, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la salida.'));
        },
      });
  }

  abrirLlegada(v: Viaje): void {
    this.formLlegada.reset({ fechaHora: ahoraGt(), kmFinal: null, costoCombustible: null });
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
          this.avisos.exito('Llegada registrada. Viaje completado.');
          this.enDetalle.set(detalle);
          this.cargarRecorrido(detalle);
          this.detalleVisible.set(true);
          this.cargar();
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
    this.limpiarRecorrido();
  }

  private limpiarRecorrido(): void {
    this.origenRecorrido.set(null);
    this.destinoRecorrido.set(null);
  }

  /**
   * Resuelve el origen y el destino para dibujar el recorrido del viaje. El viaje solo trae
   * `rutaId`; las coordenadas salen de la ruta y de sus sucursales (mismo criterio que la
   * compra de boletos). Un viaje privado no tiene ruta: su mapa vive en el alquiler.
   */
  private cargarRecorrido(v: Viaje): void {
    this.limpiarRecorrido();
    // PRIVADO: el recorrido son los puntos que el cliente marcó al pedir el alquiler y vienen en el
    // propio viaje, así que el piloto lo ve sin pedirle nada al servicio de alquileres.
    if (v.tipo === 'PRIVADO') {
      if (v.origenLatitud == null || v.origenLongitud == null) return;
      if (v.destinoLatitud == null || v.destinoLongitud == null) return;
      this.origenRecorrido.set({ latitud: v.origenLatitud, longitud: v.origenLongitud });
      this.destinoRecorrido.set({ latitud: v.destinoLatitud, longitud: v.destinoLongitud });
      return;
    }
    if (!v.rutaId) return;
    if (this.rutas && this.sucursales) {
      this.aplicarRecorrido(v.rutaId);
      return;
    }
    if (this.cargandoRecorrido()) return;

    this.cargandoRecorrido.set(true);
    forkJoin({
      activas: this.servicio.rutas(true),
      inactivas: this.servicio.rutas(false),
      sucursales: this.sucursalesServicio.listar(),
    }).subscribe({
      next: ({ activas, inactivas, sucursales }) => {
        this.rutas = [...activas, ...inactivas];
        this.sucursales = sucursales;
        this.cargandoRecorrido.set(false);
        const actual = this.enDetalle();
        if (actual?.rutaId) this.aplicarRecorrido(actual.rutaId);
      },
      error: () => {
        this.cargandoRecorrido.set(false);
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
