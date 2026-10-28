import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { catchError, filter, forkJoin, fromEvent, interval, merge, of, startWith, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol } from '../../core/models/auth.model';
import { Alquiler } from '../../core/models/viaje.model';
import { OrdenAlquiler } from '../../core/models/venta.model';
import { AlquileresService } from '../../core/services/alquileres.service';
import { AuthService } from '../../core/services/auth.service';
import { OrdenesAlquilerService } from '../../core/services/ordenes-alquiler.service';
import { IconoComponent } from '../../shared/components/icono/icono.component';
import { NOMBRE_ROL, ORDEN_ROL } from '../../shared/constants/roles';
import { AvisosMenuService } from '../../shared/services/avisos-menu.service';
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
  private readonly ordenes = inject(OrdenesAlquilerService);
  private readonly avisosMenu = inject(AvisosMenuService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);
  readonly appNombre = environment.appNombre;

  /** Roles de la cuenta, en el orden en que se muestran (el principal primero). */
  readonly roles = computed<Rol[]>(() => {
    const roles = this.auth.usuario()?.roles ?? [];
    return ORDEN_ROL.filter((rol) => roles.includes(rol));
  });

  private readonly rolElegido = signal<Rol | null>(null);

  /** Rol cuyo menú se muestra: el elegido o, si no hay elección válida, el rol principal. */
  readonly rolActivo = computed<Rol | null>(() => {
    const roles = this.roles();
    if (roles.length === 0) return null;
    const elegido = this.rolElegido();
    return elegido && roles.includes(elegido) ? elegido : roles[0];
  });

  /** El cambio de menú por rol solo tiene sentido si la cuenta tiene más de un rol. */
  readonly variosRoles = computed(() => this.roles().length > 1);

  readonly iconoRol: Record<Rol, string> = {
    ADMIN_SISTEMA: 'monitor',
    ADMIN_SUCURSAL: 'sucursal',
    CAJERO: 'boleto',
    CHOFER: 'bus',
    CLIENTE: 'perfil',
  };

  /** Solo los grupos y opciones del rol activo (más las opciones para todos). */
  readonly grupos = computed(() => {
    const activo = this.rolActivo();
    return menuPara(activo ? [activo] : []);
  });

  /** Alquileres que la sucursal debe atender: por cotizar (SOLICITADO) y por asignar (PAGADO). */
  private readonly porCotizar = signal(0);
  private readonly porAsignar = signal(0);
  /**
   * Órdenes que el cajero tiene que cobrar en efectivo (PENDIENTE_PAGO y sin cartera). Las que
   * están cobrando con la billetera del cliente avanzan solas y no necesitan que intervenga.
   */
  private readonly porCobrar = signal(0);
  private readonly cobrandoConCartera = signal(0);

  constructor() {
    // El personal que atiende alquileres ve cuántos esperan; se refresca al navegar y cada minuto,
    // como los avisos de mensajes. El cliente no entra aquí. Ya no llega correo al admin por el pago:
    // el aviso de "por asignar" vive en esta burbuja.
    if (!this.auth.tieneRol('ADMIN_SISTEMA', 'ADMIN_SUCURSAL', 'CAJERO')) return;
    merge(
      interval(60000),
      this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)),
      // Al volver a la pestaña se refresca por si otro usuario cambió algo mientras tanto.
      fromEvent(window, 'focus'),
      // Las pantallas avisan cuando una acción cambia los pendientes (pagar, cotizar, asignar...).
      this.avisosMenu.cambios$,
    )
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            cotizar: this.alquileres.listar({ estado: 'SOLICITADO' }).pipe(catchError(() => of<Alquiler[]>([]))),
            asignar: this.alquileres.listar({ estado: 'PAGADO' }).pipe(catchError(() => of<Alquiler[]>([]))),
            cobrar: this.ordenes.listar({ estado: 'PENDIENTE_PAGO' }).pipe(catchError(() => of<OrdenAlquiler[]>([]))),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ cotizar, asignar, cobrar }) => {
        this.porCotizar.set(cotizar.length);
        this.porAsignar.set(asignar.length);
        const enEfectivo = cobrar.filter((orden) => orden.metodoPago !== 'CARTERA').length;
        this.porCobrar.set(enEfectivo);
        this.cobrandoConCartera.set(cobrar.length - enEfectivo);
      });
  }

  /** Cantidad que se muestra como aviso en una opción del menú (0 = sin aviso). */
  aviso(ruta: string): number {
    if (ruta === '/panel/alquileres') return this.porCotizar() + this.porAsignar();
    // En el menú del cajero no existe Alquileres: el aviso va en sus órdenes y cuenta solo lo que
    // él tiene que cobrar en efectivo (lo que muestra el botón "Pagar en efectivo" de esa vista).
    if (ruta === '/panel/ordenes' && this.rolActivo() === 'CAJERO') return this.porCobrar();
    return 0;
  }

  /** Detalle del aviso para el tooltip. */
  tituloAviso(ruta: string): string | null {
    if (ruta === '/panel/alquileres') {
      return [
        this.porCotizar() ? `${this.porCotizar()} por cotizar` : '',
        this.porAsignar() ? `${this.porAsignar()} por asignar` : '',
      ].filter((texto) => texto).join(' · ');
    }
    if (ruta === '/panel/ordenes' && this.rolActivo() === 'CAJERO') {
      return [
        this.porCobrar() ? `${this.porCobrar()} por cobrar en efectivo` : '',
        this.cobrandoConCartera() ? `${this.cobrandoConCartera()} cobrando con cartera` : '',
      ].filter((texto) => texto).join(' · ');
    }
    return null;
  }

  nombreRol(rol: Rol | null): string {
    return rol ? NOMBRE_ROL[rol] : '';
  }

  /**
   * Cambia el menú al rol elegido. Si la pantalla actual no está en ese menú, vuelve a Inicio
   * para no dejar al usuario en una página que su rol activo no muestra.
   */
  elegirRol(rol: Rol): void {
    if (rol === this.rolActivo()) return;
    this.rolElegido.set(rol);
    this.asegurarRutaPermitida(rol);
    this.layout.cerrarMovil();
  }

  private asegurarRutaPermitida(rol: Rol): void {
    const actual = this.router.url.split('?')[0].split('#')[0];
    const permitidas = menuPara([rol]).flatMap((grupo) => grupo.opciones.map((opcion) => opcion.ruta));
    const dentro = permitidas.some((ruta) =>
      ruta === '/panel' ? actual === '/panel' : actual === ruta || actual.startsWith(`${ruta}/`),
    );
    if (!dentro) void this.router.navigateByUrl('/panel');
  }
}
