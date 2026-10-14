import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast.service';

const ERRORES_OAUTH: Record<string, string> = {
  OAUTH_NO_CONFIGURADO: 'El inicio con Google no está configurado en el servidor.',
  OAUTH_ESTADO_INVALIDO: 'La solicitud venció o ya fue usada. Intenta de nuevo.',
  OAUTH_CODIGO_INVALIDO: 'Google no devolvió el código. Intenta de nuevo.',
  GOOGLE_SIN_RESPUESTA: 'Google no respondió. Intenta más tarde.',
  GOOGLE_SIN_ID_TOKEN: 'Google no devolvió identidad. Intenta de nuevo.',
  GOOGLE_TOKEN_INVALIDO: 'La identidad de Google no es válida.',
  GOOGLE_TOKEN_VENCIDO: 'La identidad de Google venció. Intenta de nuevo.',
  OAUTH_CORREO_NO_VERIFICADO: 'Tu correo de Google no está verificado.',
  OAUTH_CUENTA_VINCULADA: 'Ese correo ya está vinculado a otra cuenta.',
  OAUTH_TICKET_INVALIDO: 'El ticket venció o ya fue usado. Intenta de nuevo.',
  CUENTA_BLOQUEADA: 'Tu cuenta está bloqueada temporalmente.',
  CUENTA_INACTIVA: 'Tu cuenta no está activa.',
};

/**
 * Retorno del login con Google: el backend redirige aquí con ?ticket= o ?error=.
 * El ticket se canjea por la sesión (o el reto 2FA) sin exponer tokens en la URL.
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <section class="mx-auto max-w-md px-4 py-10">
      <div class="card text-center">
        <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Google</p>
        <h1 class="page-title">Completando el inicio de sesión…</h1>
      </div>
    </section>
  `,
})
export class OAuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  ngOnInit(): void {
    const params = this.ruta.snapshot.queryParamMap;
    const error = params.get('error');
    if (error) {
      this.avisos.error(ERRORES_OAUTH[error] ?? 'No se pudo iniciar sesión con Google.');
      this.router.navigateByUrl('/login');
      return;
    }
    const ticket = params.get('ticket') ?? '';
    if (!ticket) {
      this.avisos.error('No se recibió el ticket de Google.');
      this.router.navigateByUrl('/login');
      return;
    }
    this.auth.canjearTicketGoogle(ticket).subscribe({
      next: (res) => {
        if (res.tipoResultado === 'DOBLE_FACTOR') {
          this.avisos.info('Te enviamos un código de 6 dígitos al correo.');
          this.router.navigateByUrl('/verificar-2fa');
        } else {
          this.avisos.success('Sesión iniciada con Google.');
          this.router.navigateByUrl(this.auth.rutaPorRol());
        }
      },
      error: () => {
        this.avisos.error('El ticket venció o ya fue usado. Intenta de nuevo.');
        this.router.navigateByUrl('/login');
      },
    });
  }
}
