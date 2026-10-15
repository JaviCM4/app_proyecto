import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { BotonGoogleComponent } from '../../../shared/components/boton-google/boton-google.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Registro de clientes: la cuenta queda lista para entrar de una vez. */
@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BotonGoogleComponent],
  templateUrl: './registro.component.html',
})
export class RegistroComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);
  readonly enviando = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    dpi: ['', [Validators.required, Validators.pattern(/^[0-9]{13}$/)]],
    nit: ['', [Validators.required, Validators.maxLength(20)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{8,20}$/)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
  });

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    const datos = this.form.getRawValue();
    this.auth.registrar({ ...datos, correo: datos.correo.trim() }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito('Tu cuenta fue creada. Ya puedes entrar.');
        this.router.navigateByUrl('/login');
      },
      error: (e) => {
        this.enviando.set(false);
        marcarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e, 'No se pudo crear la cuenta.'));
      },
    });
  }
}
