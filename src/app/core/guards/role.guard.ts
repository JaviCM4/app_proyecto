import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/identity.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data?.['roles'] as Rol[] | undefined) ?? [];
  if (!auth.estaAutenticado()) return router.createUrlTree(['/login']);
  return auth.tieneRol(...roles) ? true : router.createUrlTree(['/dashboard']);
};
