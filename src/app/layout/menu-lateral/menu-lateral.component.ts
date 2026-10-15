import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { IconoComponent } from '../../shared/components/icono/icono.component';
import { LayoutService } from '../layout.service';
import { menuPara } from './menu.config';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconoComponent],
  templateUrl: './menu-lateral.component.html',
  styleUrl: './menu-lateral.component.scss',
})
export class MenuLateralComponent {
  private readonly auth = inject(AuthService);
  readonly layout = inject(LayoutService);
  readonly appNombre = environment.appNombre;

  /** Solo los grupos y opciones que el usuario puede ver según sus roles. */
  readonly grupos = computed(() => menuPara(this.auth.usuario()?.roles ?? []));
}
