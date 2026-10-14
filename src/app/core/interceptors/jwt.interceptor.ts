import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refrescando = false;

/** Adjunta el Bearer token y reintenta una vez con token refrescado ante un 401. */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const conToken = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(conToken).pipe(
    catchError((error: HttpErrorResponse) => {
      const esRefresco = req.url.includes('/identity/auth/refrescar');
      if (error.status !== 401 || esRefresco || refrescando || !localStorage.getItem('refreshToken')) {
        if (error.status === 401 && !esRefresco) {
          auth.cerrarSesion().subscribe(() => router.navigateByUrl('/login'));
        }
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
          auth.cerrarSesion().subscribe(() => router.navigateByUrl('/login'));
          return throwError(() => e);
        }),
      );
    }),
  );
};
