import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-md px-4 py-10">
      <div class="card">
        <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Recuperación</p>
        <h1 class="page-title">¿Olvidaste tu contraseña?</h1>
        <p class="page-subtitle">POST /identity/auth/recuperar · Te enviaremos un enlace con un token.</p>
        <form class="mt-6" (ngSubmit)="enviar()" #f="ngForm">
          <div class="field">
            <label class="label" for="correo">Correo</label>
            <input class="input" id="correo" name="correo" type="email" required [(ngModel)]="correo" />
          </div>
          <button type="submit" class="btn-cafe w-full" [disabled]="cargando || f.invalid">
            {{ cargando ? 'Enviando…' : 'Enviar enlace' }}
          </button>
          <p class="mt-3 text-sm">¿Ya tienes el token? <a routerLink="/restablecer" class="font-semibold text-azul">Restablecer aquí</a></p>
        </form>
      </div>
    </section>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(ToastService);

  correo = '';
  cargando = false;

  enviar(): void {
    this.cargando = true;
    this.auth.solicitarRecuperacion(this.correo.trim()).subscribe({
      next: () => {
        this.cargando = false;
        this.avisos.success('Si el correo existe, recibirás el enlace de recuperación.');
      },
      error: (e) => {
        this.cargando = false;
        this.avisos.error(mensajeError(e, 'No se pudo enviar el correo.'));
      },
    });
  }
}
