import { Component, effect, inject, input, output, signal } from '@angular/core';
import { UsuarioBusqueda } from '../../../core/models/usuario.model';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { BuscarCuentaComponent } from '../../personal/buscar-cuenta/buscar-cuenta.component';
import { ModoCuenta } from '../../personal/cuenta-persona/cuenta-persona.component';

/**
 * Modal para agregar un administrador del sistema: con una cuenta nueva (le llega un correo para activarla)
 * o dándole el rol a alguien que ya se registró (le llega un correo para que vuelva a iniciar sesión).
 */
@Component({
  selector: 'app-nuevo-admin',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, BuscarCuentaComponent],
  templateUrl: './nuevo-admin.component.html',
})
export class NuevoAdminComponent {
  private readonly usuarios = inject(UsuariosService);
  private readonly avisos = inject(ToastService);

  readonly abierto = input(false);
  readonly creado = output<void>();
  readonly cerrar = output<void>();
  readonly enviando = signal(false);
  readonly modo = signal<ModoCuenta>('nueva');
  readonly existente = signal<UsuarioBusqueda | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email]],
    dpi: ['', [Validators.required, Validators.pattern(/^[0-9]{13}$/)]],
    nit: ['', [Validators.required, Validators.maxLength(20)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{8,20}$/)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      this.form.reset();
      this.modo.set('nueva');
      this.existente.set(null);
    });
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  errorServidor(campo: keyof typeof this.form.controls): string | null {
    return (this.form.controls[campo].errors?.['servidor'] as string | undefined) ?? null;
  }

  cambiarModo(modo: ModoCuenta): void {
    this.modo.set(modo);
    this.existente.set(null);
  }

  guardar(): void {
    if (this.modo() === 'existente') this.promover();
    else this.crear();
  }

  /** Le da el rol a una cuenta que ya existe. Identity valida que se pueda (activa, no es personal ni piloto). */
  private promover(): void {
    const cuenta = this.existente();
    if (!cuenta) {
      this.avisos.error('Busca y elige la cuenta.');
      return;
    }
    this.enviando.set(true);
    this.usuarios.hacerAdministradorSistema(cuenta.usuarioId).subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(`${cuenta.nombreCompleto} ahora es administrador del sistema. Le llegará un correo para que vuelva a iniciar sesión.`);
        this.creado.emit();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo hacer administrador a esa cuenta.'));
      },
    });
  }

  private crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    const v = this.form.getRawValue();
    this.usuarios.crearAdministrador({ ...v, correo: v.correo.trim(), nit: v.nit.trim().toUpperCase() }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(`Administrador creado. Se envió un correo a ${v.correo} para activar su cuenta.`);
        this.creado.emit();
      },
      error: (e) => {
        this.enviando.set(false);
        marcarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e, 'No se pudo crear el administrador.'));
      },
    });
  }
}
