import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-md px-4 py-10">
      <div class="card">
        <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Nueva contraseña</p>
        <h1 class="page-title">Restablecer</h1>
        <p class="page-subtitle">POST /identity/auth/restablecer · Usa el token que llegó a tu correo.</p>
        <form class="mt-6" (ngSubmit)="restablecer()" #f="ngForm">
          <div class="field">
            <label class="label" for="token">Token</label>
            <input class="input" id="token" name="token" required [(ngModel)]="token" placeholder="Pega aquí el token" />
          </div>
          <div class="field">
            <label class="label" for="nueva">Nueva contraseña (mín. 8)</label>
            <input class="input" id="nueva" name="nueva" type="password" required minlength="8" maxlength="72" [(ngModel)]="nueva" />
          </div>
          <button type="submit" class="btn-cafe w-full" [disabled]="cargando || f.invalid">
            {{ cargando ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
          <p class="mt-3 text-sm"><a routerLink="/login" class="font-semibold text-azul">Volver al login</a></p>
        </form>
      </div>
    </section>
  `,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly avisos = inject(ToastService);

  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  nueva = '';
  cargando = false;

  restablecer(): void {
    this.cargando = true;
    this.auth.restablecerContrasena(this.token.trim(), this.nueva).subscribe({
      next: () => {
        this.cargando = false;
        this.avisos.success('Contraseña restablecida. Inicia sesión.');
        this.router.navigateByUrl('/login');
      },
      error: (e) => {
        this.cargando = false;
        this.avisos.error(mensajeError(e, 'Token inválido o vencido.'));
      },
    });
  }
}
