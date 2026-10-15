import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { ToastService } from '../../../shared/services/toast.service';

function coinciden(grupo: AbstractControl): ValidationErrors | null {
  return grupo.get('nueva')?.value === grupo.get('confirmacion')?.value ? null : { distintas: true };
}

/** Cambiar contraseña, verificación en dos pasos y cerrar sesión. */
@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmacionComponent],
  templateUrl: './seguridad.component.html',
  styleUrl: './seguridad.component.scss',
})
export class SeguridadComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  readonly guardandoClave = signal(false);
  readonly guardandoDobleFactor = signal(false);
  readonly confirmarSalida = signal(false);
  /** Opción elegida para la verificación en dos pasos (null = no se cambió en esta pantalla). */
  readonly dobleFactor = signal<boolean | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacion: ['', Validators.required],
    },
    { validators: coinciden },
  );

  cambiarContrasena(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardandoClave.set(true);
    const { actual, nueva } = this.form.getRawValue();
    this.auth.cambiarContrasena(actual, nueva).subscribe({
      next: () => {
        this.guardandoClave.set(false);
        this.form.reset();
        this.avisos.exito('Tu contraseña se cambió.');
      },
      error: (e) => {
        this.guardandoClave.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cambiar la contraseña.'));
      },
    });
  }

  cambiarDobleFactor(activado: boolean): void {
    this.guardandoDobleFactor.set(true);
    this.auth.cambiarDobleFactor(activado).subscribe({
      next: () => {
        this.guardandoDobleFactor.set(false);
        this.dobleFactor.set(activado);
        this.avisos.exito(activado ? 'Verificación en dos pasos activada.' : 'Verificación en dos pasos desactivada.');
      },
      error: (e) => {
        this.guardandoDobleFactor.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo guardar la opción.'));
      },
    });
  }

  salir(): void {
    this.auth.cerrarSesion().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
