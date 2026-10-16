import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Bus, BusDetalle, EstadoBus, EstadoBusManual, ViajeKilometraje } from '../../../core/models/bus.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { AuthService } from '../../../core/services/auth.service';
import { BusesService } from '../../../core/services/buses.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';

type FiltroEstadoBus = 'todas' | EstadoBus;

/** Buses de la sucursal: lista con búsqueda, registro, edición, cambio de estado y bitácora. */
@Component({
  selector: 'app-buses',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, ModalComponent, PaginadorComponent],
  templateUrl: './buses.component.html',
  styleUrl: './buses.component.scss',
})
export class BusesComponent implements OnInit {
  private readonly servicio = inject(BusesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly sucursalPropia = this.auth.usuario()?.sucursalId ?? '';

  readonly sucursales = signal<Sucursal[]>([]);
  /** Sucursal del filtro y de los formularios (el admin de sucursal siempre usa la suya). */
  readonly sucursalSel = signal(this.sucursalPropia);

  private readonly buses = signal<Bus[]>([]);
  readonly cargando = signal(true);

  readonly texto = signal('');
  readonly estado = signal<FiltroEstadoBus>('todas');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly creando = signal(false);
  readonly editando = signal<Bus | null>(null);
  readonly viendo = signal<Bus | null>(null);
  readonly cambiandoEstado = signal<Bus | null>(null);

  readonly detalle = signal<BusDetalle | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly bitacora = signal<ViajeKilometraje[]>([]);
  readonly desde = signal('');
  readonly hasta = signal('');

  readonly enviando = signal(false);
  readonly fotoCrear = signal<File | null>(null);
  readonly fotoEditar = signal<File | null>(null);

  readonly estadosManuales: EstadoBusManual[] = ['ACTIVO', 'EN_TALLER', 'INACTIVO'];

  readonly formCrear = this.fb.nonNullable.group({
    sucursalId: ['', Validators.required],
    placa: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(10), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
    marca: ['', [Validators.required, Validators.maxLength(100)]],
    modelo: ['', [Validators.required, Validators.maxLength(100)]],
    anioFabricacion: [new Date().getFullYear(), [Validators.required, Validators.min(1950), Validators.max(2100)]],
    capacidadPasajeros: [null as number | null, [Validators.required, Validators.min(1), Validators.max(120)]],
    kilometrajeActual: [null as number | null, [Validators.min(0)]],
    fechaRegistro: [hoyGt(), Validators.required],
    fotoUrl: [''],
  });

  readonly formEditar = this.fb.nonNullable.group({
    marca: ['', [Validators.required, Validators.maxLength(100)]],
    modelo: ['', [Validators.required, Validators.maxLength(100)]],
    anioFabricacion: [new Date().getFullYear(), [Validators.required, Validators.min(1950), Validators.max(2100)]],
    capacidadPasajeros: [null as number | null, [Validators.required, Validators.min(1), Validators.max(120)]],
    fotoUrl: [''],
  });

  readonly formEstado = this.fb.nonNullable.group({
    estado: ['ACTIVO' as EstadoBusManual, Validators.required],
    fecha: [hoyGt(), Validators.required],
  });

  readonly filtrados = computed(() => {
    const buscado = normalizar(this.texto());
    const estado = this.estado();
    return this.buses().filter(
      (b) =>
        (estado === 'todas' || b.estado === estado) &&
        (!buscado || normalizar(`${b.placa} ${b.marca} ${b.modelo}`).includes(buscado)),
    );
  });

  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  constructor() {
    effect(() => {
      if (!this.creando()) return;
      this.fotoCrear.set(null);
      this.formCrear.reset({
        sucursalId: this.sucursalEfectiva(),
        placa: '',
        marca: '',
        modelo: '',
        anioFabricacion: new Date().getFullYear(),
        capacidadPasajeros: null,
        kilometrajeActual: null,
        fechaRegistro: hoyGt(),
        fotoUrl: '',
      });
      if (this.esSistema) this.formCrear.controls.sucursalId.enable();
      else this.formCrear.controls.sucursalId.disable();
    });
    effect(() => {
      const b = this.editando();
      if (!b) return;
      this.fotoEditar.set(null);
      this.formEditar.reset({
        marca: b.marca,
        modelo: b.modelo,
        anioFabricacion: b.anioFabricacion,
        capacidadPasajeros: b.capacidadPasajeros,
        fotoUrl: b.fotoUrl,
      });
    });
    effect(() => {
      if (!this.cambiandoEstado()) return;
      this.formEstado.reset({ estado: 'ACTIVO', fecha: hoyGt() });
    });
    effect(() => {
      const b = this.viendo();
      this.detalle.set(null);
      this.bitacora.set([]);
      this.desde.set('');
      this.hasta.set('');
      if (b) this.cargarDetalle(b.busId);
    });
  }

  ngOnInit(): void {
    this.sucursalesServicio.listar(true).subscribe({ next: (s) => this.sucursales.set(s) });
    this.cargar();
  }

  sucursalEfectiva(): string {
    return this.esSistema ? this.sucursalSel() : this.sucursalPropia;
  }

  nombreSucursal(id: string): string {
    return this.sucursales().find((s) => s.sucursalId === id)?.nombre ?? '';
  }

  textoEstado(e: EstadoBus): string {
    return { ACTIVO: 'Activo', EN_RUTA: 'En ruta', EN_TALLER: 'En taller', INACTIVO: 'Inactivo' }[e];
  }

  cargar(): void {
    const sucursal = this.sucursalEfectiva();
    if (!this.esSistema && !sucursal) {
      this.cargando.set(false);
      this.avisos.error('Tu cuenta no tiene una sucursal asignada.');
      return;
    }
    this.cargando.set(true);
    this.servicio.listar(sucursal || null).subscribe({
      next: (lista) => {
        this.buses.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar los buses.'));
      },
    });
  }

  filtrar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  cambiarFiltroEstado(estado: FiltroEstadoBus): void {
    this.estado.set(estado);
    this.pagina.set(1);
  }

  alCambiarSucursal(id: string): void {
    this.sucursalSel.set(id);
    this.pagina.set(1);
    this.cargar();
  }

  invalidoCrear(ruta: string): boolean {
    const c = this.formCrear.get(ruta);
    return !!c && c.touched && c.invalid;
  }

  errorServidorCrear(ruta: string): string | null {
    return (this.formCrear.get(ruta)?.errors?.['servidor'] as string | undefined) ?? null;
  }

  alElegirFoto(evento: Event, destino: 'crear' | 'editar'): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) {
      if (destino === 'crear') this.fotoCrear.set(null);
      else this.fotoEditar.set(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 2 * 1024 * 1024) {
      this.avisos.error('La foto debe ser JPG, PNG o WEBP y pesar máximo 2 MB.');
      input.value = '';
      return;
    }
    if (destino === 'crear') this.fotoCrear.set(archivo);
    else this.fotoEditar.set(archivo);
  }

  guardarCrear(): void {
    if (this.formCrear.invalid) {
      this.formCrear.markAllAsTouched();
      return;
    }
    const archivo = this.fotoCrear();
    const fotoActual = this.formCrear.getRawValue().fotoUrl.trim();
    if (!archivo && !fotoActual) {
      this.avisos.error('Sube una foto del bus (JPG, PNG o WEBP, máx. 2 MB).');
      return;
    }
    this.enviando.set(true);
    if (archivo) {
      this.servicio.subirFoto('BUS', archivo).subscribe({
        next: (r) => this.crearBus(r.fotoUrl),
        error: (e) => {
          this.enviando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudo subir la foto.'));
        },
      });
    } else {
      this.crearBus(fotoActual);
    }
  }

  private crearBus(fotoUrl: string): void {
    const v = this.formCrear.getRawValue();
    this.servicio
      .crear({
        sucursalId: v.sucursalId,
        placa: v.placa.trim().toUpperCase(),
        marca: v.marca.trim(),
        modelo: v.modelo.trim(),
        anioFabricacion: Number(v.anioFabricacion),
        capacidadPasajeros: Number(v.capacidadPasajeros),
        kilometrajeActual: v.kilometrajeActual ?? null,
        fotoUrl,
        fechaRegistro: v.fechaRegistro,
      })
      .subscribe({
        next: (b) => {
          this.enviando.set(false);
          this.creando.set(false);
          this.avisos.exito(`Bus ${b.placa} registrado.`);
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formCrear, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar el bus.'));
        },
      });
  }

  guardarEditar(): void {
    const b = this.editando();
    if (!b) return;
    if (this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      return;
    }
    const archivo = this.fotoEditar();
    this.enviando.set(true);
    if (archivo) {
      this.servicio.subirFoto('BUS', archivo).subscribe({
        next: (r) => this.actualizarBus(b, r.fotoUrl),
        error: (e) => {
          this.enviando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudo subir la foto.'));
        },
      });
    } else {
      this.actualizarBus(b, this.formEditar.getRawValue().fotoUrl);
    }
  }

  private actualizarBus(b: Bus, fotoUrl: string): void {
    const v = this.formEditar.getRawValue();
    this.servicio
      .actualizar(b.busId, {
        marca: v.marca.trim(),
        modelo: v.modelo.trim(),
        anioFabricacion: Number(v.anioFabricacion),
        capacidadPasajeros: Number(v.capacidadPasajeros),
        fotoUrl,
        version: b.version,
      })
      .subscribe({
        next: (actualizado) => {
          this.enviando.set(false);
          this.buses.update((lista) => lista.map((x) => (x.busId === actualizado.busId ? actualizado : x)));
          this.editando.set(null);
          this.avisos.exito(`Bus ${actualizado.placa} actualizado.`);
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formEditar, e);
          this.avisos.error(mensajeError(e, 'No se pudo actualizar el bus.'));
        },
      });
  }

  confirmarEstado(): void {
    const b = this.cambiandoEstado();
    if (!b) return;
    if (this.formEstado.invalid) {
      this.formEstado.markAllAsTouched();
      return;
    }
    const { estado, fecha } = this.formEstado.getRawValue();
    this.enviando.set(true);
    this.servicio.cambiarEstado(b.busId, estado, fecha, b.version).subscribe({
      next: (actualizado) => {
        this.enviando.set(false);
        this.buses.update((lista) => lista.map((x) => (x.busId === actualizado.busId ? actualizado : x)));
        this.cambiandoEstado.set(null);
        this.avisos.exito(`Bus ${actualizado.placa}: ${this.textoEstado(actualizado.estado).toLowerCase()}.`);
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cambiar el estado.'));
      },
    });
  }

  private cargarDetalle(busId: string): void {
    this.cargandoDetalle.set(true);
    this.servicio.detalle(busId).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargandoDetalle.set(false);
        this.cargarBitacora();
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle del bus.'));
      },
    });
  }

  cargarBitacora(): void {
    const id = this.viendo()?.busId;
    if (!id) return;
    this.servicio.bitacora(id, this.desde() || null, this.hasta() || null).subscribe({
      next: (lista) => this.bitacora.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudo cargar la bitácora.')),
    });
  }
}
