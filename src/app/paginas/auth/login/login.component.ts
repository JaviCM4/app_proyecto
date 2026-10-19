import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { limpiarRegreso, recordarRegreso, rutaSegura } from '../../../core/utils/regreso';
import { BotonGoogleComponent } from '../../../shared/components/boton-google/boton-google.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BotonGoogleComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  /** Página a la que se regresa después de entrar (?volver=/panel/...). */
  readonly volver = input<string>();
  readonly enviando = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    // Se anota el destino: si hay 2FA el salto a /verificar lo conserva.
    recordarRegreso(this.volver());
    const { correo, contrasena } = this.form.getRawValue();
    this.auth.login(correo.trim(), contrasena).subscribe({
      next: (r) => {
        this.enviando.set(false);
        if (r.tipo === 'DOBLE_FACTOR') {
          this.avisos.info('Te enviamos un código de 6 dígitos a tu correo.');
          this.router.navigateByUrl('/verificar');
          return;
        }
        limpiarRegreso();
        this.router.navigateByUrl(rutaSegura(this.volver()));
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo iniciar sesión.'));
      },
    });
  }
}
