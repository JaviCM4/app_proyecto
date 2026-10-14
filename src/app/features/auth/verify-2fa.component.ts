import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-md px-4 py-10">
      <div class="card">
        <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Segundo factor</p>
        <h1 class="page-title">Verifica el código</h1>
        <p class="page-subtitle">
          POST /identity/auth/login/verificar ·
          @if (correo) { Enviamos un código de 6 dígitos a <strong>{{ correo }}</strong>. }
          @else { Inicia sesión primero para recibir tu código. }
        </p>
        <form class="mt-6" (ngSubmit)="verificar()" #f="ngForm">
          <div class="field">
            <label class="label" for="codigo">Código (6 dígitos)</label>
            <input class="input" id="codigo" name="codigo" required pattern="^[0-9]{6}$" maxlength="6"
              [(ngModel)]="codigo" placeholder="123456" />
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="cargando || f.invalid || !correo">
            {{ cargando ? 'Verificando…' : 'Verificar y entrar' }}
          </button>
        </form>
      </div>
    </section>
  `,
})
export class Verify2faComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  codigo = '';
  cargando = false;

  get correo(): string {
    return this.auth.desafioPendiente?.correo ?? '';
  }

  verificar(): void {
    if (!this.correo) return;
    this.cargando = true;
    this.auth.verificarDobleFactor(this.correo, this.codigo.trim()).subscribe({
      next: () => {
        this.cargando = false;
        this.avisos.success('Verificación correcta.');
        this.router.navigateByUrl(this.auth.rutaPorRol());
      },
      error: (e) => {
        this.cargando = false;
        this.avisos.error(mensajeError(e, 'Código inválido o vencido.'));
      },
    });
  }
}
