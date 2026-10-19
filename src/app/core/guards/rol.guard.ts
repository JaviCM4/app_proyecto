import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { rolPrincipal } from '../../shared/constants/roles';
import { Rol } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

/**
 * Revisa los roles de la ruta (data.roles). Además:
 * - data.soloCliente: solo cuentas cuyo rol principal es Cliente.
 * - data.rolesPrincipales: solo si el rol principal de la cuenta está en la lista (sirve para
 *   pantallas compartidas por Cliente y Cajero sin dejar entrar al resto del personal).
 * Sin permiso, regresa al inicio del panel.
 */
export const rolGuard: CanActivateFn = (ruta) => {
  const auth = inject(AuthService);
  const roles = (ruta.data['roles'] as Rol[] | undefined) ?? [];
  const soloCliente = ruta.data['soloCliente'] === true;
  const principales = ruta.data['rolesPrincipales'] as Rol[] | undefined;
  const propios = auth.usuario()?.roles ?? [];
  const principal = rolPrincipal(propios);
  const permitido =
    (roles.length === 0 || auth.tieneRol(...roles))
    && (!soloCliente || principal === 'CLIENTE')
    && (!principales || (principal !== null && principales.includes(principal)));
  return permitido ? true : inject(Router).createUrlTree(['/panel']);
};
