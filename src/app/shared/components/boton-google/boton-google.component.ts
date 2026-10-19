import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { recordarRegreso } from '../../../core/utils/regreso';
import { ToastService } from '../../services/toast.service';

/**
 * Botón "Continuar con Google" (login y registro de clientes).
 *
 * Pide al backend la URL de Google y manda el navegador para allá. Al terminar, Google vuelve al
 * backend y el backend al front en /oauth/google/callback?ticket=... (ver GoogleCallbackComponent).
 * Si el correo no tenía cuenta, Identity la crea como Cliente; si ya existía, entra a esa cuenta.
 */
@Component({
  selector: 'app-boton-google',
  standalone: true,
  templateUrl: './boton-google.component.html',
  styleUrl: './boton-google.component.scss',
})
export class BotonGoogleComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  readonly texto = input('Continuar con Google');
  readonly yendo = signal(false);

  /**
   * Logo oficial de Google, tal como Google lo publica en su guía de marca de "Sign in with Google"
   * (https://developers.google.com/identity/branding-guidelines). Si no carga (sin internet), el botón
   * queda solo con el texto.
   */
  readonly logo = 'https://developers.google.com/static/identity/images/g-logo.png';
  readonly sinLogo = signal(false);

  continuar(): void {
    this.yendo.set(true);
    this.auth.urlGoogle().subscribe({
      next: ({ url }) => {
        // Google sale y regresa por /oauth/google/callback: se anota el destino para no perderlo.
        recordarRegreso(this.volverActual());
        window.location.assign(url);
      },
      error: (e) => {
        this.yendo.set(false);
        this.avisos.error(mensajeError(e, 'El inicio con Google no está disponible por ahora.'));
      },
    });
  }

  /** A dónde volver: el ?volver= de la pantalla de login o el panel. */
  private volverActual(): string {
    const params = this.router.parseUrl(this.router.url).queryParams;
    const volver = params['volver'];
    return typeof volver === 'string' ? volver : '/panel';
  }
}
