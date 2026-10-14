import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-8">
      <h1 class="page-title">Panel</h1>
      <p class="page-subtitle">Hola, {{ nombreActual }} · Roles: {{ rolesActuales }}</p>
      <div class="mt-6 grid gap-4 md:grid-cols-3">
        <a routerLink="/dashboard/perfil" class="card hover:shadow-lg">
          <p class="font-bold text-azul">Mi perfil</p>
          <p class="text-sm text-cafe">Ver y editar mis datos + foto (GET/PUT /identity/perfil).</p>
          <span class="btn-crema btn-sm mt-3">Abrir</span>
        </a>
        <a routerLink="/dashboard/seguridad" class="card hover:shadow-lg">
          <p class="font-bold text-azul">Seguridad</p>
          <p class="text-sm text-cafe">Contraseña, doble factor y cerrar sesión.</p>
          <span class="btn-crema btn-sm mt-3">Abrir</span>
        </a>
        @if (auth.tieneRol('CLIENTE')) {
          <a routerLink="/dashboard/cartera" class="card hover:shadow-lg">
            <p class="font-bold text-azul">Mi cartera</p>
            <p class="text-sm text-cafe">Saldo, recargas y movimientos.</p>
            <span class="btn-crema btn-sm mt-3">Abrir</span>
          </a>
        }
        @if (auth.tieneRol('ADMIN_SISTEMA')) {
          <a routerLink="/dashboard/usuarios" class="card hover:shadow-lg">
            <p class="font-bold text-azul">Usuarios</p>
            <p class="text-sm text-cafe">Listar, ver, cambiar estado y crear admins.</p>
            <span class="btn-crema btn-sm mt-3">Abrir</span>
          </a>
        }
        @if (auth.tieneRol('ADMIN_SISTEMA', 'ADMIN_SUCURSAL')) {
          <a routerLink="/dashboard/tarifas" class="card hover:shadow-lg">
            <p class="font-bold text-azul">Tarifas de depreciación</p>
            <p class="text-sm text-cafe">Listar, vigente en fecha y crear.</p>
            <span class="btn-crema btn-sm mt-3">Abrir</span>
          </a>
          <a routerLink="/dashboard/reportes" class="card hover:shadow-lg">
            <p class="font-bold text-azul">Reportes</p>
            <p class="text-sm text-cafe">Globales y por sucursal, en pantalla o PDF.</p>
            <span class="btn-crema btn-sm mt-3">Abrir</span>
          </a>
        }
      </div>
    </section>
  `,
})
export class DashboardComponent {
  readonly auth = inject(AuthService);

  get nombreActual(): string {
    return this.auth.getUsuario()?.nombre ?? this.auth.getUsuario()?.correo ?? '';
  }

  get rolesActuales(): string {
    return (this.auth.getUsuario()?.roles ?? []).join(', ');
  }
}
