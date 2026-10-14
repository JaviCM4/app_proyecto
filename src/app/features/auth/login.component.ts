import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-md px-4 py-10">
      <div class="card">
        <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Bienvenido</p>
        <h1 class="page-title">Inicia sesión</h1>
        <p class="page-subtitle">POST /identity/auth/login · Si tu cuenta usa doble factor recibirás un código.</p>
        <form class="mt-6" (ngSubmit)="entrar()" #f="ngForm">
          <div class="field">
            <label class="label" for="correo">Correo</label>
            <input class="input" id="correo" name="correo" type="email" required [(ngModel)]="correo" placeholder="usuario@correo.com" />
          </div>
          <div class="field">
            <label class="label" for="clave">Contraseña</label>
            <input class="input" id="clave" name="clave" type="password" required [(ngModel)]="contrasena" />
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="cargando || f.invalid">
            {{ cargando ? 'Entrando…' : 'Entrar ahora' }}
          </button>
        </form>
        <div class="mt-4 flex flex-col gap-1 text-sm">
          <p>¿No tienes cuenta? <a routerLink="/registro" class="font-semibold text-menta-oscuro">Regístrate</a></p>
          <p><a routerLink="/recuperar" class="font-semibold text-cafe">¿Olvidaste tu contraseña?</a></p>
        </div>
      </div>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  correo = '';
  contrasena = '';
  cargando = false;

  entrar(): void {
    this.cargando = true;
    this.auth.login(this.correo.trim(), this.contrasena).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res.tipoResultado === 'DOBLE_FACTOR') {
          this.avisos.info('Te enviamos un código de 6 dígitos al correo.');
          this.router.navigateByUrl('/verificar-2fa');
        } else {
          this.avisos.success('Sesión iniciada.');
          this.router.navigateByUrl(this.auth.rutaPorRol());
        }
      },
      error: (e) => {
        this.cargando = false;
        this.avisos.error(mensajeError(e, 'No se pudo iniciar sesión. Intenta nuevamente.'));
      },
    });
  }
}
