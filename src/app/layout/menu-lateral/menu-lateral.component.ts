import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { catchError, filter, forkJoin, interval, merge, of, startWith, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Alquiler } from '../../core/models/viaje.model';
import { AlquileresService } from '../../core/services/alquileres.service';
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
  private readonly alquileres = inject(AlquileresService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);
  readonly appNombre = environment.appNombre;

  /** Solo los grupos y opciones que el usuario puede ver según sus roles. */
  readonly grupos = computed(() => menuPara(this.auth.usuario()?.roles ?? []));

  /** Alquileres que la sucursal debe atender: por cotizar (SOLICITADO) y por asignar (PAGADO). */
  private readonly porCotizar = signal(0);
  private readonly porAsignar = signal(0);

  constructor() {
    // El personal que atiende alquileres ve cuántos esperan; se refresca al navegar y cada minuto,
    // como los avisos de mensajes. El cliente no entra aquí. Ya no llega correo al admin por el pago:
    // el aviso de "por asignar" vive en esta burbuja.
    if (!this.auth.tieneRol('ADMIN_SISTEMA', 'ADMIN_SUCURSAL', 'CAJERO')) return;
    merge(
      interval(60000),
      this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)),
    )
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            cotizar: this.alquileres.listar({ estado: 'SOLICITADO' }).pipe(catchError(() => of<Alquiler[]>([]))),
            asignar: this.alquileres.listar({ estado: 'PAGADO' }).pipe(catchError(() => of<Alquiler[]>([]))),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ cotizar, asignar }) => {
        this.porCotizar.set(cotizar.length);
        this.porAsignar.set(asignar.length);
      });
  }

  /** Cantidad que se muestra como aviso en una opción del menú (0 = sin aviso). */
  aviso(ruta: string): number {
    return ruta === '/panel/alquileres' ? this.porCotizar() + this.porAsignar() : 0;
  }

  /** Detalle del aviso para el tooltip: qué alquileres esperan a la sucursal. */
  tituloAviso(ruta: string): string | null {
    if (ruta !== '/panel/alquileres') return null;
    return [
      this.porCotizar() ? `${this.porCotizar()} por cotizar` : '',
      this.porAsignar() ? `${this.porAsignar()} por asignar` : '',
    ].filter((texto) => texto).join(' · ');
  }
}
