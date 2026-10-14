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
        <div class="mt-4 flex items-center gap-3 text-xs font-semibold text-cafe">
          <span class="h-px flex-1 bg-azul/15"></span> o <span class="h-px flex-1 bg-azul/15"></span>
        </div>
        <button type="button" class="btn-crema mt-4 w-full" (click)="entrarConGoogle()" [disabled]="cargandoGoogle">
          <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"/>
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5.1l-.1.1-3.6 2.8v.1C3.5 21.3 7.4 24 12 24z"/>
            <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.6z"/>
            <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.7 1.4 6.9l3.8 2.9c.9-3 3.6-5.1 6.8-5.1z"/>
          </svg>
          {{ cargandoGoogle ? 'Abriendo Google…' : 'Continuar con Google' }}
        </button>
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
  cargandoGoogle = false;

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

  entrarConGoogle(): void {
    this.cargandoGoogle = true;
    this.auth.urlGoogle().subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: (e) => {
        this.cargandoGoogle = false;
        this.avisos.error(mensajeError(e, 'El inicio con Google no está disponible.'));
      },
    });
  }
}
