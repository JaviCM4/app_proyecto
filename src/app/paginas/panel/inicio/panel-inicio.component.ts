import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconoComponent } from '../../../shared/components/icono/icono.component';
import { RolTextoPipe } from '../../../shared/pipes/rol-texto.pipe';
import { menuPara } from '../../../layout/menu-lateral/menu.config';

/** Bienvenida del panel con accesos directos a las opciones del rol. */
@Component({
  selector: 'app-panel-inicio',
  standalone: true,
  imports: [RouterLink, IconoComponent, RolTextoPipe],
  templateUrl: './panel-inicio.component.html',
  styleUrl: './panel-inicio.component.scss',
})
export class PanelInicioComponent {
  readonly auth = inject(AuthService);

  readonly accesos = computed(() =>
    menuPara(this.auth.usuario()?.roles ?? [])
      .flatMap((g) => g.opciones)
      .filter((o) => o.ruta !== '/panel'),
  );
}
