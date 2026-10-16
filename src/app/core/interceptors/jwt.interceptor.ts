import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refrescando = false;

/** Peticiones de sesión que no llevan token (si fallan con 401 no se intenta refrescar). */
const PUBLICAS = [
  '/identity/auth/login',
  '/identity/auth/registro',
  '/identity/auth/refrescar',
  '/identity/auth/recuperar',
  '/identity/auth/restablecer',
  '/identity/auth/oauth2/',
];

/**
 * Agrega el token a cada petición. Si el token venció (401), pide uno nuevo con el token de
 * refresco una sola vez y repite la petición; si tampoco se puede, cierra la sesión.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const esAuth = PUBLICAS.some((ruta) => req.url.includes(ruta));
  const conToken = token && !esAuth ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(conToken).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || esAuth || !token) return throwError(() => error);
      if (refrescando || !auth.tieneRefresco()) {
        auth.limpiar();
        router.navigateByUrl('/login');
        return throwError(() => error);
      }
      refrescando = true;
      return auth.refrescar().pipe(
        switchMap((sesion) => {
          refrescando = false;
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${sesion.tokenAcceso}` } }));
        }),
        catchError((e) => {
          refrescando = false;
          auth.limpiar();
          router.navigateByUrl('/login');
          return throwError(() => e);
        }),
      );
    }),
  );
};
