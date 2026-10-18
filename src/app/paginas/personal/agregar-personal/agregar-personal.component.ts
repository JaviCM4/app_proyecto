import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NuevoPersonal, RolPersonal, Sucursal } from '../../../core/models/sucursal.model';
import { UsuarioBusqueda } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalService } from '../../../core/services/personal.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { errorApi, marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { CuentaPersonaComponent, ModoCuenta, cuentaElegidaValida } from '../cuenta-persona/cuenta-persona.component';
import { grupoCuenta, valoresCuenta } from '../datos-cuenta/cuenta.form';

/** Datos que Identity rechaza por estar repetidos → campo del grupo de la cuenta. */
const CONFLICTOS: Record<string, string> = {
  CORREO_EN_USO: 'cuenta.correo',
  DPI_EN_USO: 'cuenta.dpi',
  NIT_EN_USO: 'cuenta.nit',
};

/**
 * Modal para agregar un administrador o cajero a una sucursal que ya existe, con una cuenta nueva o con
 * una persona que ya tiene cuenta. Si recibe `sucursalId` la sucursal queda fija; si no, se elige de la lista.
 * El administrador de sucursal solo agrega cajeros.
 */
@Component({
  selector: 'app-agregar-personal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, CuentaPersonaComponent],
  templateUrl: './agregar-personal.component.html',
})
export class AgregarPersonalComponent {
  private readonly personal = inject(PersonalService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly abierto = input(false);
  readonly sucursalId = input<string | null>(null);
  readonly agregado = output<void>();
  readonly cerrar = output<void>();

  readonly esSistema = inject(AuthService).tieneRol('ADMIN_SISTEMA');
  readonly titulo = this.esSistema ? 'Agregar personal a la sucursal' : 'Agregar cajero';

  readonly sucursales = signal<Sucursal[]>([]);
  readonly enviando = signal(false);
  readonly modo = signal<ModoCuenta>('nueva');
  readonly existente = signal<UsuarioBusqueda | null>(null);
  readonly correoEnUso = signal<string | null>(null);
  /** Llave de idempotencia: la misma en un reintento por red; se renueva si el servidor rechaza. */
  private solicitudId = crypto.randomUUID();

  readonly form = this.fb.nonNullable.group({
    sucursalId: ['', Validators.required],
    rol: ['ADMIN_SUCURSAL' as RolPersonal, Validators.required],
    fechaAsignacion: [hoyGt(), Validators.required],
    cuenta: grupoCuenta(this.fb),
  });

  readonly textoBoton = computed(() => (this.modo() === 'existente' ? 'Asignar' : 'Crear cuenta y asignar'));

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      this.modo.set('nueva');
      this.existente.set(null);
      this.correoEnUso.set(null);
      this.solicitudId = crypto.randomUUID();
      this.form.reset({
        sucursalId: this.sucursalId() ?? '',
        rol: this.esSistema ? 'ADMIN_SUCURSAL' : 'CAJERO',
        fechaAsignacion: hoyGt(),
      });
      this.form.enable();
      if (this.sucursalId()) this.form.controls.sucursalId.disable();
      if (!this.esSistema) this.form.controls.rol.disable();
      this.sucursalesServicio.listar(true).subscribe({ next: (s) => this.sucursales.set(s) });
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!cuentaElegidaValida(this.modo(), this.existente())) {
      this.avisos.error('Busca y elige una cuenta que se pueda asignar.');
      return;
    }
    const v = this.form.getRawValue();
    const existente = this.modo() === 'existente' ? this.existente() : null;
    const datos: NuevoPersonal = { rol: v.rol, fechaAsignacion: v.fechaAsignacion };
    if (existente) datos.usuarioExistente = { solicitudId: this.solicitudId, usuarioId: existente.usuarioId };
    else datos.cuenta = { ...valoresCuenta(this.form.controls.cuenta), solicitudId: this.solicitudId };

    this.enviando.set(true);
    this.correoEnUso.set(null);
    this.personal.agregar(v.sucursalId, datos).subscribe({
      next: (p) => {
        this.enviando.set(false);
        this.avisos.exito(
          existente
            ? `${p.nombreCompleto} quedó asignado a la sucursal. Le llegará un correo para que vuelva a iniciar sesión.`
            : `${p.nombreCompleto} quedó asignado a la sucursal. Le llegará un correo para activar su cuenta.`,
        );
        this.agregado.emit();
      },
      error: (e) => {
        this.enviando.set(false);
        this.solicitudId = crypto.randomUUID();
        this.mostrarError(e, v.cuenta.correo);
      },
    });
  }

  private mostrarError(e: unknown, correo: string): void {
    marcarErroresServidor(this.form, e);
    const cuerpo = errorApi(e);
    const campo = cuerpo ? CONFLICTOS[cuerpo.codigo] : undefined;
    if (campo) {
      this.form.get(campo)?.setErrors({ servidor: cuerpo!.mensaje });
      this.form.get(campo)?.markAsTouched();
    }
    if (cuerpo?.codigo === 'CORREO_EN_USO') this.correoEnUso.set(correo.trim().toLowerCase());
    this.avisos.error(mensajeError(e, 'No se pudo agregar a la persona.'));
  }
}
