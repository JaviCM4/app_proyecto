import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Chofer, EstadoChofer, TipoLicencia } from '../../../core/models/chofer.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChoferesService } from '../../../core/services/choferes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';
import { DatosCuentaComponent } from '../../personal/datos-cuenta/datos-cuenta.component';
import { grupoCuenta, valoresCuenta } from '../../personal/datos-cuenta/cuenta.form';

type FiltroEstadoChofer = 'todas' | EstadoChofer;

/** Choferes de la sucursal: registro con cuenta, salario, licencia y desactivación. */
@Component({
  selector: 'app-choferes',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, ModalComponent, PaginadorComponent, DatosCuentaComponent],
  templateUrl: './choferes.component.html',
  styleUrl: './choferes.component.scss',
})
export class ChoferesComponent implements OnInit {
  private readonly servicio = inject(ChoferesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly sucursalPropia = this.auth.usuario()?.sucursalId ?? '';

  readonly sucursales = signal<Sucursal[]>([]);
  /** Sucursal del filtro y de los formularios (el admin de sucursal siempre usa la suya). */
  readonly sucursalSel = signal(this.sucursalPropia);

  private readonly choferes = signal<Chofer[]>([]);
  readonly cargando = signal(true);

  readonly texto = signal('');
  readonly estado = signal<FiltroEstadoChofer>('todas');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly creando = signal(false);
  readonly viendo = signal<Chofer | null>(null);
  readonly editandoSalario = signal<Chofer | null>(null);
  readonly renovando = signal<Chofer | null>(null);
  readonly porDesactivar = signal<Chofer | null>(null);

  readonly detalle = signal<Chofer | null>(null);
  readonly cargandoDetalle = signal(false);

  readonly enviando = signal(false);
  readonly foto = signal<File | null>(null);

  readonly tiposLicencia: TipoLicencia[] = ['A', 'B', 'C', 'M', 'E'];

  readonly formCrear = this.fb.nonNullable.group({
    sucursalId: ['', Validators.required],
    numeroLicencia: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
    tipoLicencia: ['B' as TipoLicencia, Validators.required],
    fechaVencimientoLicencia: ['', Validators.required],
    salarioBaseViaje: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fechaRegistro: [hoyGt(), Validators.required],
    cuenta: grupoCuenta(this.fb),
  });

  readonly formSalario = this.fb.nonNullable.group({
    salarioBaseViaje: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  readonly formLicencia = this.fb.nonNullable.group({
    numeroLicencia: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
    tipoLicencia: ['B' as TipoLicencia, Validators.required],
    fechaVencimientoLicencia: ['', Validators.required],
    fechaRegistro: [hoyGt(), Validators.required],
  });

  readonly formRetiro = this.fb.nonNullable.group({
    fecha: [hoyGt(), Validators.required],
  });

  readonly filtrados = computed(() => {
    const buscado = normalizar(this.texto());
    const estado = this.estado();
    return this.choferes().filter(
      (c) =>
        (estado === 'todas' || c.estado === estado) &&
        (!buscado || normalizar(`${c.nombreCompleto} ${c.numeroLicencia}`).includes(buscado)),
    );
  });

  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  constructor() {
    effect(() => {
      if (!this.creando()) return;
      this.foto.set(null);
      this.formCrear.reset({
        sucursalId: this.sucursalEfectiva(),
        numeroLicencia: '',
        tipoLicencia: 'B',
        fechaVencimientoLicencia: '',
        salarioBaseViaje: null,
        fechaRegistro: hoyGt(),
      });
      this.formCrear.controls.cuenta.reset({ nombres: '', apellidos: '', correo: '', dpi: '', nit: '', telefono: '', direccion: '' });
      if (this.esSistema) this.formCrear.controls.sucursalId.enable();
      else this.formCrear.controls.sucursalId.disable();
    });
    effect(() => {
      const c = this.editandoSalario();
      if (!c) return;
      this.formSalario.reset({ salarioBaseViaje: c.salarioBaseViaje });
    });
    effect(() => {
      const c = this.renovando();
      if (!c) return;
      this.formLicencia.reset({
        numeroLicencia: c.numeroLicencia,
        tipoLicencia: c.tipoLicencia,
        fechaVencimientoLicencia: c.fechaVencimientoLicencia,
        fechaRegistro: hoyGt(),
      });
    });
    effect(() => {
      if (!this.porDesactivar()) return;
      this.formRetiro.reset({ fecha: hoyGt() });
    });
    effect(() => {
      const c = this.viendo();
      this.detalle.set(null);
      if (c) this.cargarDetalle(c.choferId);
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
        this.choferes.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar los choferes.'));
      },
    });
  }

  filtrar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  cambiarFiltroEstado(estado: FiltroEstadoChofer): void {
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

  alElegirFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) {
      this.foto.set(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 2 * 1024 * 1024) {
      this.avisos.error('La foto debe ser JPG, PNG o WEBP y pesar máximo 2 MB.');
      input.value = '';
      return;
    }
    this.foto.set(archivo);
  }

  guardarCrear(): void {
    if (this.formCrear.invalid) {
      this.formCrear.markAllAsTouched();
      return;
    }
    if (this.formCrear.controls.fechaVencimientoLicencia.value <= hoyGt()) {
      this.formCrear.controls.fechaVencimientoLicencia.setErrors({ futura: true });
      this.formCrear.controls.fechaVencimientoLicencia.markAsTouched();
      this.avisos.error('La licencia debe vencer en una fecha futura.');
      return;
    }
    const archivo = this.foto();
    this.enviando.set(true);
    if (archivo) {
      this.servicio.subirFoto(archivo).subscribe({
        next: (r) => this.crearChofer(r.fotoUrl),
        error: (e) => {
          this.enviando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudo subir la foto.'));
        },
      });
    } else {
      this.crearChofer(null);
    }
  }

  private crearChofer(fotoUrl: string | null): void {
    const v = this.formCrear.getRawValue();
    this.servicio
      .crear({
        sucursalId: v.sucursalId,
        numeroLicencia: v.numeroLicencia.trim().toUpperCase(),
        tipoLicencia: v.tipoLicencia,
        fechaVencimientoLicencia: v.fechaVencimientoLicencia,
        salarioBaseViaje: Number(v.salarioBaseViaje),
        fechaRegistro: v.fechaRegistro,
        cuenta: fotoUrl ? { ...valoresCuenta(this.formCrear.controls.cuenta), fotoUrl } : valoresCuenta(this.formCrear.controls.cuenta),
      })
      .subscribe({
        next: (c) => {
          this.enviando.set(false);
          this.creando.set(false);
          this.avisos.exito(`${c.nombreCompleto} quedó registrado como piloto. Le llegará un correo para activar su cuenta.`);
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formCrear, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar el chofer.'));
        },
      });
  }

  guardarSalario(): void {
    const c = this.editandoSalario();
    if (!c) return;
    if (this.formSalario.invalid) {
      this.formSalario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.servicio
      .actualizar(c.choferId, { salarioBaseViaje: Number(this.formSalario.getRawValue().salarioBaseViaje), version: c.version })
      .subscribe({
        next: (actualizado) => {
          this.enviando.set(false);
          this.choferes.update((lista) => lista.map((x) => (x.choferId === actualizado.choferId ? actualizado : x)));
          this.editandoSalario.set(null);
          this.avisos.exito('Salario actualizado.');
        },
        error: (e) => {
          this.enviando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudo actualizar el salario.'));
        },
      });
  }

  guardarLicencia(): void {
    const c = this.renovando();
    if (!c) return;
    if (this.formLicencia.invalid) {
      this.formLicencia.markAllAsTouched();
      return;
    }
    const v = this.formLicencia.getRawValue();
    if (v.fechaVencimientoLicencia <= hoyGt()) {
      this.formLicencia.controls.fechaVencimientoLicencia.setErrors({ futura: true });
      this.formLicencia.controls.fechaVencimientoLicencia.markAsTouched();
      this.avisos.error('La licencia debe vencer en una fecha futura.');
      return;
    }
    this.enviando.set(true);
    this.servicio
      .actualizarLicencia(c.choferId, {
        numeroLicencia: v.numeroLicencia.trim().toUpperCase(),
        tipoLicencia: v.tipoLicencia,
        fechaVencimientoLicencia: v.fechaVencimientoLicencia,
        fechaRegistro: v.fechaRegistro,
        version: c.version,
      })
      .subscribe({
        next: (actualizado) => {
          this.enviando.set(false);
          this.choferes.update((lista) => lista.map((x) => (x.choferId === actualizado.choferId ? actualizado : x)));
          this.renovando.set(null);
          this.avisos.exito('Licencia renovada.');
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formLicencia, e);
          this.avisos.error(mensajeError(e, 'No se pudo renovar la licencia.'));
        },
      });
  }

  confirmarRetiro(): void {
    const c = this.porDesactivar();
    if (!c) return;
    if (this.formRetiro.invalid) {
      this.formRetiro.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.servicio.desactivar(c.choferId, this.formRetiro.getRawValue().fecha, c.version).subscribe({
      next: (actualizado) => {
        this.enviando.set(false);
        this.choferes.update((lista) => lista.map((x) => (x.choferId === actualizado.choferId ? actualizado : x)));
        this.porDesactivar.set(null);
        this.avisos.exito(`${actualizado.nombreCompleto} fue desactivado.`);
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo desactivar el chofer.'));
      },
    });
  }

  private cargarDetalle(choferId: string): void {
    this.cargandoDetalle.set(true);
    this.servicio.detalle(choferId).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargandoDetalle.set(false);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle del chofer.'));
      },
    });
  }
}
