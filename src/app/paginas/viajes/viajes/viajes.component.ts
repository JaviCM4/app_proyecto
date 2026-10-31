import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Bus } from '../../../core/models/bus.model';
import { Chofer } from '../../../core/models/chofer.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { EstadoViaje, MapaAsientos, Ruta, SalidaViaje, Viaje, ViajeDetalle } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { BusesService } from '../../../core/services/buses.service';
import { ChoferesService } from '../../../core/services/choferes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, aLocalGt, fechaHoraGt } from '../../../core/utils/fechas';
import { FotoTarjetaComponent } from '../../../shared/components/foto-tarjeta/foto-tarjeta.component';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { TIPO_VIAJE } from '../../../shared/constants/ventas';
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
    FotoTarjetaComponent,
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
  private readonly usuariosServicio = inject(UsuariosService);
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
  readonly tipoViaje = TIPO_VIAJE;

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
  /** Foto del piloto del viaje abierto (vive en su perfil de Identity). */
  readonly fotoChofer = signal<string | null>(null);
  /** Bus y piloto elegidos en los formularios de programar y editar, para ver su foto antes de guardar. */
  readonly busElegido = signal<Bus | null>(null);
  readonly choferElegido = signal<Chofer | null>(null);
  readonly fotoChoferElegido = signal<string | null>(null);
  /** Pestaña abierta del detalle: datos del viaje, mapa de asientos o mapa del recorrido. */
  readonly pestanaViaje = signal<PestanaViaje>('datos');
  /** Asientos vendidos del viaje abierto (solo para ver: aquí no se vende). */
  readonly mapaAsientos = signal<MapaAsientos | null>(null);
  readonly cargandoAsientos = signal(false);
  readonly sinAsientos = signal('');
  readonly porEliminar = signal<Viaje | null>(null);
  /** Salida ya registrada del viaje que se va a cerrar: su hora y su kilometraje son el piso. */
  readonly salidaRegistrada = signal<SalidaViaje | null>(null);
  readonly enSalida = signal<Viaje | null>(null);
  readonly enLlegada = signal<Viaje | null>(null);
  readonly enviando = signal(false);

  readonly formViaje = this.fb.nonNullable.group({
    rutaId: ['', Validators.required],
    busId: ['', Validators.required],
    choferId: ['', Validators.required],
    salida: ['', Validators.required],
    llegada: ['', Validators.required],
    /** El piloto de la ida puede vender boletos presenciales a bordo. */
    ventaPorChofer: [false],
    /** Programar también la vuelta por la misma ruta: abre el segundo paso del formulario. */
    conRegreso: [false],
  });

  /**
   * El viaje de vuelta. No pide ruta: es la misma de la ida, recorrida al revés. Se abre al marcar
   * la casilla y llega con el bus y el piloto de la ida ya puestos, que es lo normal: la misma
   * unidad se va y se regresa.
   */
  readonly formRegreso = this.fb.nonNullable.group({
    /** No se edita: el regreso va en el mismo bus que la ida (el backend lo valida igual). */
    busId: [{ value: '', disabled: true }, Validators.required],
    choferId: ['', Validators.required],
    salida: ['', Validators.required],
    llegada: ['', Validators.required],
    ventaPorChofer: [false],
  });

  /** Paso del formulario de programación: 1 la ida, 2 el regreso. */
  readonly paso = signal<1 | 2>(1);

  readonly formEditar = this.fb.nonNullable.group({
    busId: ['', Validators.required],
    choferId: ['', Validators.required],
    salida: ['', Validators.required],
    llegada: ['', Validators.required],
    ventaPorChofer: [false],
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
    // Si el viaje es de regreso el recorrido va del destino de la ruta a su origen.
    const invertido = viaje.sentido === 'REGRESO';
    const puntaA = this.sucursales().find((s) => s.sucursalId === ruta.sucursalOrigenId);
    const puntaB = this.sucursales().find((s) => s.sucursalId === ruta.sucursalDestinoId);
    const origen = invertido ? puntaB : puntaA;
    const destino = invertido ? puntaA : puntaB;
    return origen && destino ? { origen, destino, ruta } : null;
  });

  /**
   * Recorrido de un viaje PRIVADO: los puntos que el cliente marcó al pedir el alquiler. Null si
   * el viaje es regular o si el alquiler se pidió sin marcar el mapa (los primeros no lo traen).
   */
  readonly recorridoAlquiler = computed(() => {
    const v = this.enDetalle();
    if (!v || v.tipo !== 'PRIVADO') return null;
    if (v.origenLatitud == null || v.origenLongitud == null) return null;
    if (v.destinoLatitud == null || v.destinoLongitud == null) return null;
    return {
      origenLatitud: v.origenLatitud,
      origenLongitud: v.origenLongitud,
      destinoLatitud: v.destinoLatitud,
      destinoLongitud: v.destinoLongitud,
      origen: v.origenNombre,
      destino: v.destinoNombre,
    };
  });

  ngOnInit(): void {
    this.sucursalesServicio.listar().subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    // Vista previa: al elegir bus o piloto se ve su foto antes de guardar (igual que al asignar un alquiler).
    for (const form of [this.formViaje, this.formRegreso, this.formEditar]) {
      form.controls.busId.valueChanges.subscribe((id) => this.elegirBus(id));
      form.controls.choferId.valueChanges.subscribe((id) => this.elegirChofer(id));
    }
    this.cargarListas();
    this.cargarViajes();
  }

  private elegirBus(busId: string): void {
    this.busElegido.set(this.buses().find((b) => b.busId === busId) ?? null);
  }

  private elegirChofer(choferId: string): void {
    const chofer = this.choferes().find((c) => c.choferId === choferId) ?? null;
    this.choferElegido.set(chofer);
    this.cargarFotoChofer(chofer?.usuarioId ?? null, this.fotoChoferElegido);
  }

  /** La foto del piloto vive en su perfil de Identity; si el rol no puede verla, se queda sin foto. */
  private cargarFotoChofer(usuarioId: string | null, destino: WritableSignal<string | null>): void {
    destino.set(null);
    if (!usuarioId) return;
    this.usuariosServicio.detalle(usuarioId).subscribe({
      next: (usuario) => destino.set(usuario.fotoUrl || null),
      error: () => destino.set(null),
    });
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
        this.cargarFotoChoferDelViaje(detalle.choferId);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle del viaje.'));
      },
    });
  }

  abrirProgramar(): void {
    this.formViaje.reset({
      rutaId: this.rutaId() || '', busId: '', choferId: '', salida: '', llegada: '',
      ventaPorChofer: false, conRegreso: false,
    });
    this.formRegreso.reset({ busId: '', choferId: '', salida: '', llegada: '', ventaPorChofer: false });
    this.paso.set(1);
    this.programando.set(true);
  }

  /**
   * Pasa al segundo paso con los datos de la ida ya validados. El regreso se propone con el mismo
   * bus y el mismo piloto, y saliendo una hora después de que llegue la ida: es el caso normal y
   * evita que choque con su propia ida, que el backend rechazaría.
   */
  siguiente(): void {
    if (this.formViaje.invalid) {
      this.formViaje.markAllAsTouched();
      return;
    }
    const v = this.formViaje.getRawValue();
    const salidaRegreso = this.sumarHoras(v.llegada, 1);
    // El bus viene bloqueado con el de la ida: es la unidad que se fue la que se regresa.
    this.formRegreso.reset({
      busId: v.busId,
      choferId: v.choferId,
      salida: salidaRegreso,
      llegada: this.sumarHoras(salidaRegreso, this.horasDeViaje(v.salida, v.llegada)),
      ventaPorChofer: false,
    });
    this.paso.set(2);
  }

  volverAIda(): void {
    this.paso.set(1);
    const v = this.formViaje.getRawValue();
    this.elegirBus(v.busId);
    this.elegirChofer(v.choferId);
  }

  /**
   * Resumen de la ida para el segundo paso. Son valores de un formulario reactivo, que no son
   * señales, así que esto se lee como método en la plantilla y no como computed.
   */
  resumenIda(): { ruta: string; rutaRegreso: string; bus: string; chofer: string; salida: string; llegada: string } {
    const v = this.formViaje.getRawValue();
    const ruta = this.rutas().find((r) => r.rutaId === v.rutaId);
    const bus = this.buses().find((b) => b.busId === v.busId);
    const chofer = this.choferes().find((c) => c.choferId === v.choferId);
    return {
      ruta: ruta ? `${ruta.origenNombre} → ${ruta.destinoNombre}` : '—',
      rutaRegreso: ruta ? `${ruta.destinoNombre} → ${ruta.origenNombre}` : '—',
      bus: bus?.placa ?? '—',
      chofer: chofer?.nombreCompleto ?? '—',
      salida: v.salida,
      llegada: v.llegada,
    };
  }

  /** Suma horas a un datetime-local ("2026-10-25T06:00") y lo devuelve en el mismo formato. */
  private sumarHoras(local: string, horas: number): string {
    if (!local) return '';
    const fecha = new Date(local);
    fecha.setHours(fecha.getHours() + horas);
    return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  /** Cuánto dura la ida, para proponerle al regreso la misma duración (mínimo una hora). */
  private horasDeViaje(salida: string, llegada: string): number {
    const horas = (new Date(llegada).getTime() - new Date(salida).getTime()) / 3600000;
    return Number.isFinite(horas) && horas >= 1 ? Math.round(horas) : 1;
  }

  programar(): void {
    if (this.formViaje.invalid) {
      this.formViaje.markAllAsTouched();
      return;
    }
    const v = this.formViaje.getRawValue();
    const conRegreso = v.conRegreso;
    // Enter en el primer paso con el regreso marcado: pasa al segundo paso, no envía a medias.
    if (conRegreso && this.paso() === 1) {
      this.siguiente();
      return;
    }
    if (conRegreso && this.formRegreso.invalid) {
      this.formRegreso.markAllAsTouched();
      return;
    }
    const r = this.formRegreso.getRawValue();
    this.enviando.set(true);
    this.servicio
      .programarViaje({
        rutaId: v.rutaId,
        busId: v.busId,
        choferId: v.choferId,
        fechaSalidaProgramada: fechaHoraGt(v.salida),
        fechaLlegadaEstimada: fechaHoraGt(v.llegada),
        ventaPorChofer: v.ventaPorChofer,
        // Los dos viajes van en la misma petición: el backend los crea juntos o no crea ninguno.
        regreso: conRegreso
          ? {
              busId: r.busId,
              choferId: r.choferId,
              fechaSalidaProgramada: fechaHoraGt(r.salida),
              fechaLlegadaEstimada: fechaHoraGt(r.llegada),
              ventaPorChofer: r.ventaPorChofer,
            }
          : null,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.programando.set(false);
          this.paso.set(1);
          this.avisos.exito(conRegreso ? 'Viajes de ida y regreso programados.' : 'Viaje programado.');
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
      ventaPorChofer: v.ventaPorChofer === true,
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
        ventaPorChofer: f.ventaPorChofer,
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

  /** Se propone la hora programada del viaje y el odómetro del bus: los mínimos que exige Trips. */
  abrirSalida(v: Viaje): void {
    this.formSalida.reset({
      fechaHora: aLocalGt(v.fechaSalidaProgramada),
      kmInicial: v.busKilometrajeActual ?? null,
    });
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
          this.cargarFotoChoferDelViaje(detalle.choferId);
          this.cargarViajes();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formSalida, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la salida.'));
        },
      });
  }

  /** La llegada se propone con la estimada, y el kilometraje con el de la salida ya registrada. */
  abrirLlegada(v: Viaje): void {
    this.formLlegada.reset({
      fechaHora: aLocalGt(v.fechaLlegadaEstimada),
      kmFinal: null,
      costoCombustible: null,
    });
    this.salidaRegistrada.set(null);
    this.enLlegada.set(v);
    this.servicio.detalleViaje(v.viajeId).subscribe({
      next: (detalle) => {
        if (this.enLlegada()?.viajeId !== v.viajeId) return;
        this.salidaRegistrada.set(detalle.salida);
        if (detalle.salida) {
          this.formLlegada.patchValue({ kmFinal: detalle.salida.kmInicial });
        }
      },
      error: () => {
        /* Sin el detalle se registra igual: el backend valida la hora y el kilometraje. */
      },
    });
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
          this.cargarFotoChoferDelViaje(detalle.choferId);
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
    this.fotoChofer.set(null);
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

  /** Foto del piloto del viaje abierto: se busca por el chofer, que es quien lleva el usuario. */
  private cargarFotoChoferDelViaje(choferId: string): void {
    this.fotoChofer.set(null);
    this.choferesServicio.detalle(choferId).subscribe({
      next: (chofer) => this.cargarFotoChofer(chofer.usuarioId ?? null, this.fotoChofer),
      error: () => this.fotoChofer.set(null),
    });
  }

  /** Convierte un OffsetDateTime ("…T06:00:00-06:00") a datetime-local ("…T06:00"). */
  private aLocal(fecha: string): string {
    return fecha.length >= 16 ? fecha.slice(0, 16) : fecha;
  }
}
