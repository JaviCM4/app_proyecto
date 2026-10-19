import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { Bus, BusDetalle } from '../../../core/models/bus.model';
import { Chofer } from '../../../core/models/chofer.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Alquiler, EstadoAlquiler, EstadoViaje } from '../../../core/models/viaje.model';
import { AlquileresService } from '../../../core/services/alquileres.service';
import { AuthService } from '../../../core/services/auth.service';
import { BusesService } from '../../../core/services/buses.service';
import { ChoferesService } from '../../../core/services/choferes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { fechaHoraGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';
import { pantallaGrande } from '../../../shared/utils/pantalla';

const ESTADOS: EstadoAlquiler[] = ['SOLICITADO', 'COTIZADO', 'PAGADO', 'ASIGNADO', 'COMPLETADO', 'CANCELADO'];

/** Alquileres de buses: consulta para todos, cotizar/asignar/cancelar solo administración. */
@Component({
  selector: 'app-alquileres',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, CurrencyPipe, ModalComponent, PaginadorComponent, MapaRecorridoComponent],
  templateUrl: './alquileres.component.html',
  styleUrl: './alquileres.component.scss',
})
export class AlquileresComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly servicio = inject(AlquileresService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly busesServicio = inject(BusesService);
  private readonly choferesServicio = inject(ChoferesService);
  private readonly usuariosServicio = inject(UsuariosService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  /** En PC el detalle se abre amplio, con el mapa grande al lado de los datos. */
  readonly pantallaGrande = pantallaGrande();
  readonly puedeGestionar = this.auth.tieneRol('ADMIN_SISTEMA', 'ADMIN_SUCURSAL');

  private readonly alquileres = signal<Alquiler[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly buses = signal<Bus[]>([]);
  readonly choferes = signal<Chofer[]>([]);
  readonly cargando = signal(true);

  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly estado = signal('');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly enDetalle = signal<Alquiler | null>(null);
  /** Bus y chofer del viaje asignado, con marca/modelo/licencia (si el rol puede consultarlos). */
  readonly busAsignado = signal<BusDetalle | null>(null);
  readonly choferAsignado = signal<Chofer | null>(null);
  /** Foto del chofer asignado (vive en Identity, ligada a su usuario). */
  readonly fotoChofer = signal<string | null>(null);
  /** Vista previa al asignar: bus y chofer elegidos. */
  readonly busElegido = signal<Bus | null>(null);
  readonly choferElegido = signal<Chofer | null>(null);
  readonly fotoChoferAsignar = signal<string | null>(null);
  readonly porCotizar = signal<Alquiler | null>(null);
  readonly porAsignar = signal<Alquiler | null>(null);
  readonly porCancelar = signal<Alquiler | null>(null);
  readonly enviando = signal(false);

  readonly estados = ESTADOS;

  readonly formCotizar = this.fb.nonNullable.group({
    precioConfirmado: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  readonly formAsignar = this.fb.nonNullable.group({
    busId: ['', Validators.required],
    choferId: ['', Validators.required],
    llegadaEstimada: ['', Validators.required],
  });

  readonly formCancelar = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(255)]],
  });

  readonly paginaActual = computed(() => paginar(this.alquileres(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.sucursalesServicio.listar().subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    // Vista previa con foto al elegir bus/chofer en el modal de asignación.
    this.formAsignar.controls.busId.valueChanges.subscribe((id) => {
      this.busElegido.set(this.buses().find((b) => b.busId === id) ?? null);
    });
    this.formAsignar.controls.choferId.valueChanges.subscribe((id) => {
      const chofer = this.choferes().find((c) => c.choferId === id) ?? null;
      this.choferElegido.set(chofer);
      this.fotoChoferAsignar.set(null);
      this.cargarFoto(chofer?.usuarioId ?? null, this.fotoChoferAsignar);
    });
    this.cargar();
  }

  cambiarSucursal(id: string): void {
    this.sucursalId.set(id);
    this.pagina.set(1);
    this.cargar();
  }

  cambiarFiltro(valor: Partial<{ estado: string; desde: string; hasta: string }>): void {
    if (valor.estado !== undefined) this.estado.set(valor.estado);
    if (valor.desde !== undefined) this.desde.set(valor.desde);
    if (valor.hasta !== undefined) this.hasta.set(valor.hasta);
    this.pagina.set(1);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .listar({
        sucursalId: this.sucursalId() || null,
        estado: (this.estado() as EstadoAlquiler) || null,
        desde: this.desde() || null,
        hasta: this.hasta() || null,
      })
      .subscribe({
        next: (lista) => {
          this.alquileres.set(lista);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron cargar los alquileres.'));
        },
      });
  }

  verDetalle(a: Alquiler): void {
    this.enDetalle.set(a);
    this.busAsignado.set(null);
    this.choferAsignado.set(null);
    this.fotoChofer.set(null);
    if (!a.viaje) return;
    // El viaje ya trae placa, chofer y fechas; se completa con marca/modelo y licencia si el rol los puede ver.
    forkJoin({
      bus: this.busesServicio.detalle(a.viaje.busId).pipe(catchError(() => of(null))),
      chofer: this.choferesServicio.detalle(a.viaje.choferId).pipe(catchError(() => of(null))),
    }).subscribe(({ bus, chofer }) => {
      this.busAsignado.set(bus);
      this.choferAsignado.set(chofer);
      this.cargarFoto(chofer?.usuarioId ?? null, this.fotoChofer);
    });
  }

  cerrarDetalle(): void {
    this.enDetalle.set(null);
    this.busAsignado.set(null);
    this.choferAsignado.set(null);
    this.fotoChofer.set(null);
  }

  /** ¿El alquiler tiene puntos del mapa? Las solicitudes viejas no los tienen. */
  tieneRecorrido(a: Alquiler): boolean {
    return (a.origenLatitud !== null && a.origenLongitud !== null)
      || (a.destinoLatitud !== null && a.destinoLongitud !== null);
  }

  /** La foto del chofer está en su perfil de Identity (la ven ADMIN_SISTEMA y ADMIN_SUCURSAL). */
  private cargarFoto(usuarioId: string | null, destino: WritableSignal<string | null>): void {
    if (!usuarioId) {
      destino.set(null);
      return;
    }
    this.usuariosServicio
      .detalle(usuarioId)
      .pipe(catchError(() => of(null)))
      .subscribe((usuario) => destino.set(usuario?.fotoUrl ?? null));
  }

  /** Estado del viaje privado asignado. */
  viajeTexto(e: EstadoViaje): string {
    return e.charAt(0) + e.slice(1).replace('_', ' ').toLowerCase();
  }

  /** Bus del viaje: placa, marca, modelo y año (lo que se pudo consultar en Flota). */
  busTexto(a: Alquiler): string {
    const bus = this.busAsignado();
    if (bus) return `${bus.placa} · ${bus.marca} ${bus.modelo} (${bus.anioFabricacion})`;
    return a.viaje?.busPlaca ?? 'Por confirmar';
  }

  /** Chofer del viaje: nombre completo (lo que se pudo consultar en Flota). */
  choferTexto(a: Alquiler): string {
    return this.choferAsignado()?.nombreCompleto ?? a.viaje?.choferNombre ?? 'Por confirmar';
  }

  estadoTexto(e: EstadoAlquiler): string {
    return e.charAt(0) + e.slice(1).toLowerCase();
  }

  /** Tarifa por km aplicada al estimado (precioEstimado ÷ kmEstimados); explica de dónde sale el precio. */
  tarifa(a: Alquiler): number | null {
    if (!a.kmEstimados) return null;
    return Math.round((a.precioEstimado / a.kmEstimados) * 100) / 100;
  }

  abrirCotizar(a: Alquiler): void {
    this.formCotizar.reset({ precioConfirmado: a.precioConfirmado ?? a.precioEstimado });
    this.porCotizar.set(a);
  }

  cotizar(): void {
    const a = this.porCotizar();
    if (!a) return;
    if (this.formCotizar.invalid) {
      this.formCotizar.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.servicio
      .cotizar(a.alquilerId, { precioConfirmado: Number(this.formCotizar.getRawValue().precioConfirmado), version: a.version })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.porCotizar.set(null);
          this.avisos.exito('Alquiler cotizado.');
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formCotizar, e);
          this.avisos.error(mensajeError(e, 'No se pudo cotizar el alquiler.'));
        },
      });
  }

  abrirAsignar(a: Alquiler): void {
    this.formAsignar.reset({ busId: '', choferId: '', llegadaEstimada: '' });
    this.busElegido.set(null);
    this.choferElegido.set(null);
    this.fotoChoferAsignar.set(null);
    this.porAsignar.set(a);
    this.busesServicio.listar(a.sucursalId, 'ACTIVO').subscribe({
      next: (lista) => this.buses.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar los buses.')),
    });
    this.choferesServicio.listar(a.sucursalId, 'ACTIVO').subscribe({
      next: (lista) => this.choferes.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar los choferes.')),
    });
  }

  asignar(): void {
    const a = this.porAsignar();
    if (!a) return;
    if (this.formAsignar.invalid) {
      this.formAsignar.markAllAsTouched();
      return;
    }
    const f = this.formAsignar.getRawValue();
    this.enviando.set(true);
    this.servicio
      .asignar(a.alquilerId, {
        busId: f.busId,
        choferId: f.choferId,
        fechaLlegadaEstimada: fechaHoraGt(f.llegadaEstimada),
        version: a.version,
      })
      .subscribe({
        next: (viaje) => {
          this.enviando.set(false);
          this.porAsignar.set(null);
          this.avisos.exito(`Viaje creado con el bus ${viaje.busPlaca ?? ''}. El alquiler quedó asignado.`);
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formAsignar, e);
          this.avisos.error(mensajeError(e, 'No se pudo asignar el alquiler.'));
        },
      });
  }

  abrirCancelar(a: Alquiler): void {
    this.formCancelar.reset({ motivo: '' });
    this.porCancelar.set(a);
  }

  cancelar(): void {
    const a = this.porCancelar();
    if (!a) return;
    if (this.formCancelar.invalid) {
      this.formCancelar.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.servicio
      .cancelar(a.alquilerId, { motivo: this.formCancelar.getRawValue().motivo.trim(), version: a.version })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.porCancelar.set(null);
          this.avisos.exito('Alquiler cancelado.');
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudo cancelar el alquiler.'));
        },
      });
  }
}
