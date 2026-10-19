import { Component, HostListener, ElementRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { IconoComponent } from '../../shared/components/icono/icono.component';
import { SelectorTemaComponent } from '../../shared/components/selector-tema/selector-tema.component';
import { RolTextoPipe } from '../../shared/pipes/rol-texto.pipe';
import { LayoutService } from '../layout.service';
import { MENU, puedeVer } from '../menu-lateral/menu.config';

@Component({
  selector: 'app-barra-superior',
  standalone: true,
  imports: [RouterLink, AvatarComponent, IconoComponent, RolTextoPipe, SelectorTemaComponent],
  templateUrl: './barra-superior.component.html',
  styleUrl: './barra-superior.component.scss',
})
export class BarraSuperiorComponent {
  private readonly router = inject(Router);
  private readonly elemento = inject(ElementRef);
  readonly auth = inject(AuthService);
  readonly layout = inject(LayoutService);
  readonly menuUsuario = signal(false);

  /**
   * Opciones del menú de la cuenta: Mi perfil, la Billetera digital (toda cuenta con rol Cliente, sea o no
   * personal) y Seguridad. Lo demás está en la barra lateral.
   */
  readonly opcionesCuenta = computed(() => {
    const roles = this.auth.usuario()?.roles ?? [];
    const opciones = MENU.flatMap((g) => g.opciones);
    const buscar = (ruta: string) => opciones.find((o) => o.ruta === ruta);
    return [buscar('/panel/perfil'), buscar('/panel/cartera'), buscar('/panel/seguridad')]
      .filter((o): o is NonNullable<typeof o> => !!o && puedeVer(o, roles));
  });

  /** Cierra el desplegable al hacer clic fuera de él. */
  @HostListener('document:click', ['$event'])
  alHacerClic(evento: MouseEvent): void {
    if (!this.elemento.nativeElement.contains(evento.target)) this.menuUsuario.set(false);
  }

  salir(): void {
    this.auth.cerrarSesion().subscribe(() => this.router.navigateByUrl('/'));
  }
}
