import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <div class="card grid gap-8 md:grid-cols-2">
        <div>
          <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Identity · Transporte extraurbano</p>
          <h1 class="page-title mt-2 !text-3xl">Tu cuenta, tus viajes, tu saldo</h1>
          <p class="page-subtitle mt-2">
            Regístrate como cliente, inicia sesión (con doble factor opcional), administra tu perfil,
            recarga tu cartera y consulta tus movimientos. Los administradores gestionan usuarios y tarifas.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a routerLink="/registro" class="btn-menta">Crear cuenta</a>
            <a routerLink="/login" class="btn-primary">Iniciar sesión</a>
          </div>
        </div>
        <div class="grid content-center gap-3">
          <div class="rounded-2xl bg-crema p-4">
            <p class="font-bold text-azul">Cliente</p>
            <p class="text-sm text-cafe">Perfil, foto, cartera con recargas y movimientos.</p>
          </div>
          <div class="rounded-2xl bg-menta-claro p-4">
            <p class="font-bold text-azul">Administración</p>
            <p class="text-sm text-cafe">Usuarios (filtros, estados, alta de admins) y tarifas de depreciación.</p>
          </div>
          <div class="rounded-2xl bg-azul p-4 text-white">
            <p class="font-bold">Seguridad</p>
            <p class="text-sm text-white/80">Doble factor por correo, recuperación de contraseña y cambio de clave.</p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent {}
