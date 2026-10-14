import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar.component';
import { ToastComponent } from './shared/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  template: `
    <app-navbar></app-navbar>
    <app-toast></app-toast>
    <main class="min-h-[calc(100vh-64px)]">
      <router-outlet></router-outlet>
    </main>
    <footer class="border-t border-azul/15 py-4 text-center text-xs text-cafe">
      Transporte Extraurbano · Módulo Identity · API Gateway http://localhost:8080
    </footer>
  `,
})
export class AppComponent {}
