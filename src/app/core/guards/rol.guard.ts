import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { rolPrincipal } from '../../shared/constants/roles';

/**
 * Revisa los roles de la ruta (data.roles) y, si la ruta tiene data.soloCliente, que la cuenta sea de cliente.
 * Sin permiso, regresa al inicio del panel.
 */
export const rolGuard: CanActivateFn = (ruta) => {
  const auth = inject(AuthService);
  const roles = (ruta.data['roles'] as Rol[] | undefined) ?? [];
  const soloCliente = ruta.data['soloCliente'] === true;
  const propios = auth.usuario()?.roles ?? [];
  const permitido =
    (roles.length === 0 || auth.tieneRol(...roles)) && (!soloCliente || rolPrincipal(propios) === 'CLIENTE');
  return permitido ? true : inject(Router).createUrlTree(['/panel']);
};
