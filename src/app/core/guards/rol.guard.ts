import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

/**
 * Revisa los roles de la ruta (data.roles). Sin permiso, regresa al inicio del panel.
 * Todas las cuentas tienen el rol CLIENTE, así que las rutas de cliente quedan abiertas para todos.
 */
export const rolGuard: CanActivateFn = (ruta) => {
  const auth = inject(AuthService);
  const roles = (ruta.data['roles'] as Rol[] | undefined) ?? [];
  return roles.length === 0 || auth.tieneRol(...roles) ? true : inject(Router).createUrlTree(['/panel']);
};
