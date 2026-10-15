import { Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ToastService } from '../../../shared/services/toast.service';

function coinciden(grupo: AbstractControl): ValidationErrors | null {
  return grupo.get('nueva')?.value === grupo.get('confirmacion')?.value ? null : { distintas: true };
}

/**
 * Enlace que llega por correo (/restablecer?token=...):
 * activa una cuenta creada por un administrador o restablece una contraseña olvidada.
 */
@Component({
  selector: 'app-restablecer',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './restablecer.component.html',
})
export class RestablecerComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  readonly token = input<string>();
  readonly enviando = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacion: ['', Validators.required],
    },
    { validators: coinciden },
  );

  guardar(): void {
    if (this.form.invalid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.restablecer(this.token()!, this.form.getRawValue().nueva).subscribe({
      next: () => {
        this.avisos.exito('Contraseña guardada. Ya puedes entrar.');
        this.router.navigateByUrl('/login');
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'El enlace no es válido o ya venció.'));
      },
    });
  }
}
