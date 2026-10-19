import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Una cuenta creada con Google que no ha completado DPI, teléfono y dirección no entra al portal:
 * siempre se le muestra /completar-perfil. Sin sesión (o con el perfil completo) deja pasar.
 */
export const perfilCompletoGuard: CanActivateFn = () => {
  const usuario = inject(AuthService).usuario();
  return usuario?.perfilCompleto === false ? inject(Router).createUrlTree(['/completar-perfil']) : true;
};

/** La página de completar perfil solo es para quien le falta completarlo. */
export const perfilPendienteGuard: CanActivateFn = () => {
  const usuario = inject(AuthService).usuario();
  return usuario?.perfilCompleto === false ? true : inject(Router).createUrlTree(['/panel']);
};
