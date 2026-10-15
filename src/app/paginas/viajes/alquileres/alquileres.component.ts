import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Bus } from '../../../core/models/bus.model';
import { Chofer } from '../../../core/models/chofer.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Alquiler, EstadoAlquiler } from '../../../core/models/viaje.model';
import { AlquileresService } from '../../../core/services/alquileres.service';
import { AuthService } from '../../../core/services/auth.service';
import { BusesService } from '../../../core/services/buses.service';
import { ChoferesService } from '../../../core/services/choferes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { fechaHoraGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

const ESTADOS: EstadoAlquiler[] = ['SOLICITADO', 'COTIZADO', 'PAGADO', 'ASIGNADO', 'COMPLETADO', 'CANCELADO'];

/** Alquileres de buses: consulta para todos, cotizar/asignar/cancelar solo administración. */
@Component({
  selector: 'app-alquileres',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, ModalComponent, PaginadorComponent],
  templateUrl: './alquileres.component.html',
  styleUrl: './alquileres.component.scss',
})
export class AlquileresComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly servicio = inject(AlquileresService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly busesServicio = inject(BusesService);
  private readonly choferesServicio = inject(ChoferesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
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
  }

  estadoTexto(e: EstadoAlquiler): string {
    return e.charAt(0) + e.slice(1).toLowerCase();
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
