import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { IconoComponent } from '../../shared/components/icono/icono.component';

/** Estructura de las páginas sin sesión: encabezado con Entrar / Crear cuenta. */
@Component({
  selector: 'app-layout-publico',
  standalone: true,
  imports: [RouterOutlet, RouterLink, IconoComponent],
  templateUrl: './layout-publico.component.html',
  styleUrl: './layout-publico.component.scss',
})
export class LayoutPublicoComponent {
  readonly auth = inject(AuthService);
  readonly appNombre = environment.appNombre;
  readonly anio = new Date().getFullYear();
}
