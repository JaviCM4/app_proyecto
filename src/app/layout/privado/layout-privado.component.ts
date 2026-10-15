import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarraSuperiorComponent } from '../barra-superior/barra-superior.component';
import { LayoutService } from '../layout.service';
import { MenuLateralComponent } from '../menu-lateral/menu-lateral.component';

/** Estructura del panel: menú a la izquierda, barra arriba y la página en el centro. */
@Component({
  selector: 'app-layout-privado',
  standalone: true,
  imports: [RouterOutlet, MenuLateralComponent, BarraSuperiorComponent],
  templateUrl: './layout-privado.component.html',
  styleUrl: './layout-privado.component.scss',
})
export class LayoutPrivadoComponent {
  readonly layout = inject(LayoutService);
}
