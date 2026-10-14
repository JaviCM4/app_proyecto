import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-2xl px-4 py-8">
      <h1 class="page-title">Seguridad</h1>
      <p class="page-subtitle">PUT /identity/auth/contrasena · PUT /identity/auth/doble-factor · POST /identity/auth/cerrar-sesion.</p>

      <div class="card mt-4">
        <h2 class="font-bold text-azul">Cambiar contraseña</h2>
        <form class="mt-4" (ngSubmit)="cambiarClave()" #f1="ngForm">
          <div class="field">
            <label class="label" for="actual">Contraseña actual</label>
            <input class="input" id="actual" name="actual" type="password" required [(ngModel)]="clave.actual" />
          </div>
          <div class="field">
            <label class="label" for="nueva">Nueva contraseña (mín. 8)</label>
            <input class="input" id="nueva" name="nueva" type="password" required minlength="8" maxlength="72" [(ngModel)]="clave.nueva" />
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="cargandoClave || f1.invalid">
            {{ cargandoClave ? 'Guardando…' : 'Cambiar contraseña' }}
          </button>
        </form>
      </div>

      <div class="card mt-4">
        <h2 class="font-bold text-azul">Doble factor por correo</h2>
        <p class="mt-1 text-sm text-cafe">Si lo activas, cada login te pedirá un código de 6 dígitos.</p>
        <div class="mt-3 flex gap-3">
          <button type="button" class="btn-menta" (click)="cambiar2fa(true)" [disabled]="cargando2fa">Activar</button>
          <button type="button" class="btn-crema" (click)="cambiar2fa(false)" [disabled]="cargando2fa">Desactivar</button>
        </div>
      </div>

      <div class="card mt-4">
        <h2 class="font-bold text-azul">Sesión</h2>
        <p class="mt-1 text-sm text-cafe">Cierra la sesión actual (invalida el token de refresco).</p>
        <button type="button" class="btn-cafe mt-3" (click)="salir()">Cerrar sesión</button>
      </div>
    </section>
  `,
})
export class SeguridadComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  clave = { actual: '', nueva: '' };
  cargandoClave = false;
  cargando2fa = false;

  cambiarClave(): void {
    this.cargandoClave = true;
    this.auth.cambiarContrasena(this.clave.actual, this.clave.nueva).subscribe({
      next: () => {
        this.cargandoClave = false;
        this.avisos.success('Contraseña actualizada.');
        this.clave = { actual: '', nueva: '' };
      },
      error: (e) => {
        this.cargandoClave = false;
        this.avisos.error(mensajeError(e, 'No se pudo cambiar la contraseña.'));
      },
    });
  }

  cambiar2fa(activado: boolean): void {
    this.cargando2fa = true;
    this.auth.cambiarDobleFactor(activado).subscribe({
      next: () => {
        this.cargando2fa = false;
        this.avisos.success(activado ? 'Doble factor activado.' : 'Doble factor desactivado.');
      },
      error: (e) => {
        this.cargando2fa = false;
        this.avisos.error(mensajeError(e, 'No se pudo guardar la preferencia.'));
      },
    });
  }

  salir(): void {
    this.auth.cerrarSesion().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
