import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="bg-azul text-white shadow-lg">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <a routerLink="/" class="flex items-center gap-2 font-bold text-lg">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-menta font-black text-azul-oscuro">T</span>
          <span>Transporte <span class="text-menta">Extraurbano</span></span>
        </a>
        <nav class="ml-auto flex flex-wrap items-center gap-2 text-sm">
          @if (!auth.estaAutenticado()) {
            <a routerLink="/login" class="rounded-lg px-3 py-1.5 hover:bg-white/10">Entrar</a>
            <a routerLink="/registro" class="rounded-lg bg-menta px-3 py-1.5 font-semibold text-azul-oscuro hover:bg-menta-oscuro hover:text-white">Crear cuenta</a>
          } @else {
            <a routerLink="/dashboard/perfil" class="rounded-lg px-3 py-1.5 hover:bg-white/10">Mi perfil</a>
            @if (auth.tieneRol('CLIENTE')) {
              <a routerLink="/dashboard/cartera" class="rounded-lg px-3 py-1.5 hover:bg-white/10">Mi cartera</a>
            }
            @if (auth.tieneRol('ADMIN_SISTEMA')) {
              <a routerLink="/dashboard/usuarios" class="rounded-lg px-3 py-1.5 hover:bg-white/10">Usuarios</a>
            }
            @if (auth.tieneRol('ADMIN_SISTEMA', 'ADMIN_SUCURSAL')) {
              <a routerLink="/dashboard/tarifas" class="rounded-lg px-3 py-1.5 hover:bg-white/10">Tarifas</a>
              <a routerLink="/dashboard/reportes" class="rounded-lg px-3 py-1.5 hover:bg-white/10">Reportes</a>
            }
            <div class="relative">
              <button type="button" (click)="menuAbierto = !menuAbierto" class="flex items-center gap-2 rounded-full bg-white/15 py-1 pl-1 pr-3 hover:bg-white/25" aria-haspopup="menu" [attr.aria-expanded]="menuAbierto">
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-menta text-sm font-black text-azul-oscuro">
                  {{ inicial }}
                </span>
                <span class="hidden max-w-40 truncate text-xs sm:inline">{{ auth.getUsuario()?.correo }}</span>
                <span class="text-xs">▾</span>
              </button>
              @if (menuAbierto) {
                <div class="fixed inset-0 z-40" (click)="menuAbierto = false"></div>
                <div class="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-azul/15 bg-white text-azul-oscuro shadow-xl" role="menu">
                  <p class="truncate border-b border-azul/10 px-4 py-2 text-xs font-semibold text-cafe">{{ auth.getUsuario()?.correo }}</p>
                  <a routerLink="/dashboard/seguridad" (click)="menuAbierto = false" class="block px-4 py-2.5 text-sm hover:bg-crema" role="menuitem">Seguridad</a>
                  <button type="button" (click)="salir()" class="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50" role="menuitem">Cerrar sesión</button>
                </div>
              }
            </div>
          }
        </nav>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  menuAbierto = false;

  get inicial(): string {
    const u = this.auth.getUsuario();
    return (u?.nombre?.[0] ?? u?.correo?.[0] ?? '?').toUpperCase();
  }

  salir(): void {
    this.menuAbierto = false;
    this.auth.cerrarSesion().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
