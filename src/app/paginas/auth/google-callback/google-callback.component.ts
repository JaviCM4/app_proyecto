import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { errorApi, mensajeError } from '../../../core/utils/errores-http';
import { BotonGoogleComponent } from '../../../shared/components/boton-google/boton-google.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Mensajes para los códigos con los que Identity regresa del inicio con Google (?error=CODIGO). */
const MENSAJES: Record<string, string> = {
  OAUTH_NO_CONFIGURADO: 'El inicio con Google no está disponible por ahora. Entra con tu correo y contraseña.',
  OAUTH_ESTADO_INVALIDO: 'La solicitud venció o ya se usó. Vuelve a intentarlo.',
  OAUTH_CODIGO_INVALIDO: 'No se completó el inicio con Google. Si cancelaste, vuelve a intentarlo.',
  OAUTH_CORREO_NO_VERIFICADO: 'Tu correo de Google no está verificado. Verifícalo en Google o crea tu cuenta con correo y contraseña.',
  OAUTH_CUENTA_VINCULADA: 'Este correo ya está vinculado a otra cuenta de Google. Entra con esa cuenta o con tu contraseña.',
  OAUTH_TICKET_INVALIDO: 'El acceso venció o ya se usó. Vuelve a intentarlo.',
  CUENTA_BLOQUEADA: 'Tu cuenta está bloqueada temporalmente por varios intentos fallidos. Intenta más tarde.',
  CUENTA_INACTIVA: 'Tu cuenta está desactivada. Comunícate con el administrador.',
  GOOGLE_SIN_RESPUESTA: 'Google no respondió. Intenta de nuevo en un momento.',
  GOOGLE_SIN_ID_TOKEN: 'Google no confirmó tu identidad. Vuelve a intentarlo.',
  GOOGLE_TOKEN_INVALIDO: 'Google no confirmó tu identidad. Vuelve a intentarlo.',
  GOOGLE_TOKEN_VENCIDO: 'La respuesta de Google venció. Vuelve a intentarlo.',
};

/**
 * Regreso del inicio con Google: FRONTEND_URL/oauth/google/callback?ticket=... (o ?error=CODIGO).
 * Cambia el ticket por la sesión; si la cuenta tiene doble factor, sigue a la pantalla del código.
 * Las cuentas nuevas de Google no tienen NIT, teléfono ni dirección: se manda a completar el perfil.
 */
@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [RouterLink, BotonGoogleComponent],
  templateUrl: './google-callback.component.html',
})
export class GoogleCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  /** Parámetros de la URL (withComponentInputBinding). */
  readonly ticket = input<string>();
  readonly error = input<string>();

  readonly problema = signal<string | null>(null);

  ngOnInit(): void {
    const ticket = this.ticket();
    if (!ticket) {
      this.problema.set(MENSAJES[this.error() ?? ''] ?? 'No se pudo entrar con Google. Vuelve a intentarlo.');
      return;
    }
    // Si ya había una sesión abierta en este navegador, se reemplaza por la de Google.
    this.auth.limpiar();
    this.auth.canjearTicketGoogle(ticket).subscribe({
      next: (r) => {
        if (r.tipo === 'DOBLE_FACTOR') {
          this.avisos.info('Te enviamos un código de 6 dígitos a tu correo.');
          this.router.navigateByUrl('/verificar', { replaceUrl: true });
          return;
        }
        this.irAlPanel();
      },
      error: (e) => {
        const codigo = errorApi(e)?.codigo ?? '';
        this.problema.set(MENSAJES[codigo] ?? mensajeError(e, 'No se pudo entrar con Google. Vuelve a intentarlo.'));
      },
    });
  }

  /** Con sesión: si al perfil le faltan datos (cuenta nueva de Google) se abre Mi perfil para completarlos. */
  private irAlPanel(): void {
    this.usuarios
      .perfil()
      .pipe(catchError(() => of(null)))
      .subscribe((p) => {
        if (p && (!p.nit || !p.telefono || !p.direccion)) {
          this.avisos.info('¡Bienvenido! Completa tu NIT, teléfono y dirección para poder comprar boletos.');
          this.router.navigateByUrl('/panel/perfil', { replaceUrl: true });
          return;
        }
        this.router.navigateByUrl('/panel', { replaceUrl: true });
      });
  }
}
