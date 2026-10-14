import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-2xl px-4 py-10">
      <div class="card">
        <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Cliente nuevo</p>
        <h1 class="page-title">Crear cuenta</h1>
        <p class="page-subtitle">POST /identity/auth/registro · Solo asigna el rol CLIENTE.</p>
        <form class="mt-6 grid gap-x-4 md:grid-cols-2" (ngSubmit)="registrar()" #f="ngForm">
          <div class="field">
            <label class="label" for="nombres">Nombres</label>
            <input class="input" id="nombres" name="nombres" required maxlength="100" [(ngModel)]="modelo.nombres" />
          </div>
          <div class="field">
            <label class="label" for="apellidos">Apellidos</label>
            <input class="input" id="apellidos" name="apellidos" required maxlength="100" [(ngModel)]="modelo.apellidos" />
          </div>
          <div class="field">
            <label class="label" for="correo">Correo</label>
            <input class="input" id="correo" name="correo" type="email" required [(ngModel)]="modelo.correo" />
          </div>
          <div class="field">
            <label class="label" for="contrasena">Contraseña (mín. 8)</label>
            <input class="input" id="contrasena" name="contrasena" type="password" required minlength="8" maxlength="72" [(ngModel)]="modelo.contrasena" />
          </div>
          <div class="field">
            <label class="label" for="nit">NIT</label>
            <input class="input" id="nit" name="nit" required maxlength="20" [(ngModel)]="modelo.nit" />
          </div>
          <div class="field">
            <label class="label" for="dpi">DPI (13 dígitos)</label>
            <input class="input" id="dpi" name="dpi" required pattern="^[0-9]{13}$" [(ngModel)]="modelo.dpi" />
            <span class="hint">Exactamente 13 números.</span>
          </div>
          <div class="field">
            <label class="label" for="telefono">Teléfono (solo números)</label>
            <input class="input" id="telefono" name="telefono" required pattern="\\d+" [(ngModel)]="modelo.telefono" />
          </div>
          <div class="field">
            <label class="label" for="direccion">Dirección</label>
            <input class="input" id="direccion" name="direccion" required maxlength="255" [(ngModel)]="modelo.direccion" />
          </div>
          <div class="md:col-span-2">
            <button type="submit" class="btn-menta w-full" [disabled]="cargando || f.invalid">
              {{ cargando ? 'Creando…' : 'Registrarme' }}
            </button>
            <p class="mt-3 text-sm">¿Ya tienes cuenta? <a routerLink="/login" class="font-semibold text-azul">Entra aquí</a></p>
          </div>
        </form>
      </div>
    </section>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  modelo = { correo: '', contrasena: '', nombres: '', apellidos: '', nit: '', dpi: '', telefono: '', direccion: '' };
  cargando = false;

  registrar(): void {
    this.cargando = true;
    this.auth.registrar({ ...this.modelo, correo: this.modelo.correo.trim() }).subscribe({
      next: () => {
        this.cargando = false;
        this.avisos.success('Cuenta creada. Ya puedes iniciar sesión.');
        setTimeout(() => this.router.navigateByUrl('/login'), 1200);
      },
      error: (e) => {
        this.cargando = false;
        this.avisos.error(mensajeError(e, 'No se pudo crear la cuenta.'));
      },
    });
  }
}
