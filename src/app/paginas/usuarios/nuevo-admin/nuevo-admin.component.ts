import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Modal para crear otro administrador del sistema (le llega un correo para activar su cuenta). */
@Component({
  selector: 'app-nuevo-admin',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './nuevo-admin.component.html',
})
export class NuevoAdminComponent {
  private readonly usuarios = inject(UsuariosService);
  private readonly avisos = inject(ToastService);

  readonly abierto = input(false);
  readonly creado = output<void>();
  readonly cerrar = output<void>();
  readonly enviando = signal(false);

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
      if (this.abierto()) this.form.reset();
    });
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  errorServidor(campo: keyof typeof this.form.controls): string | null {
    return (this.form.controls[campo].errors?.['servidor'] as string | undefined) ?? null;
  }

  crear(): void {
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
