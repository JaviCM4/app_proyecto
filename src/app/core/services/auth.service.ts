import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DesafioDobleFactor,
  RegistroRequest,
  RegistroResponse,
  ResultadoLogin,
  Rol,
  SesionResponse,
  UsuarioSesion,
} from '../models/identity.model';

interface SesionBackend extends SesionResponse {
  usuarioId: string;
}

function esDesafio(res: unknown): res is DesafioDobleFactor {
  return (
    !!res &&
    typeof res === 'object' &&
    !('tokenAcceso' in (res as Record<string, unknown>)) &&
    'correo' in (res as Record<string, unknown>)
  );
}

/**
 * Todos los endpoints de /identity/auth del identity-service.
 * Guarda tokenAcceso/tokenRefresco/usuario en localStorage (igual que el frontend de referencia).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/identity/auth`;
  private readonly usuarioSubject = new BehaviorSubject<UsuarioSesion | null>(this.leerUsuario());

  readonly usuarioActual$ = this.usuarioSubject.asObservable();
  /** Reto 2FA pendiente (login devolvió 202): se usa en la vista de verificación. */
  desafioPendiente: DesafioDobleFactor | null = null;

  // ---------- Públicos ----------

  registrar(payload: RegistroRequest): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(`${this.base}/registro`, payload);
  }

  login(correo: string, contrasena: string): Observable<ResultadoLogin> {
    return this.http
      .post<SesionBackend | DesafioDobleFactor>(`${this.base}/login`, { correo, contrasena })
      .pipe(
        tap((res) => {
          if (esDesafio(res)) {
            this.desafioPendiente = res;
          } else {
            this.guardarSesion(res);
          }
        }),
        map((res): ResultadoLogin =>
          esDesafio(res) ? { tipoResultado: 'DOBLE_FACTOR', ...res } : { tipoResultado: 'SESION', ...res },
        ),
      );
  }

  verificarDobleFactor(correo: string, codigo: string): Observable<SesionResponse> {
    return this.http
      .post<SesionBackend>(`${this.base}/login/verificar`, { correo, codigo })
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  // ---------- Google OAuth2 ----------

  /** Pide la URL de autorización de Google (el navegador debe redirigir a ella). */
  urlGoogle(): Observable<{ url: string; state: string }> {
    return this.http.get<{ url: string; state: string }>(`${this.base}/oauth2/google/url`);
  }

  /**
   * Canjea el ticket que dejó el callback (?ticket=). Igual que el login:
   * 200 sesión completa o 202 reto 2FA (verificar-2fa).
   */
  canjearTicketGoogle(ticket: string): Observable<ResultadoLogin> {
    return this.http
      .post<SesionBackend | DesafioDobleFactor>(`${this.base}/oauth2/canjear`, { ticket })
      .pipe(
        tap((res) => {
          if (esDesafio(res)) {
            this.desafioPendiente = res;
          } else {
            this.guardarSesion(res);
          }
        }),
        map((res): ResultadoLogin =>
          esDesafio(res) ? { tipoResultado: 'DOBLE_FACTOR', ...res } : { tipoResultado: 'SESION', ...res },
        ),
      );
  }

  refrescar(): Observable<SesionResponse> {
    const tokenRefresco = localStorage.getItem('refreshToken') ?? '';
    return this.http
      .post<SesionBackend>(`${this.base}/refrescar`, { tokenRefresco })
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  solicitarRecuperacion(correo: string): Observable<void> {
    return this.http.post<void>(`${this.base}/recuperar`, { correo });
  }

  restablecerContrasena(token: string, nuevaContrasena: string): Observable<void> {
    return this.http.post<void>(`${this.base}/restablecer`, { token, nuevaContrasena });
  }

  // ---------- Con sesión ----------

  cambiarDobleFactor(activado: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/doble-factor`, { activado });
  }

  cerrarSesion(): Observable<boolean> {
    const tokenRefresco = localStorage.getItem('refreshToken') ?? '';
    return this.http.post<void>(`${this.base}/cerrar-sesion`, { tokenRefresco }).pipe(
      map(() => true),
      catchError(() => of(false)),
      tap(() => this.limpiarSesion()),
    );
  }

  cambiarContrasena(contrasenaActual: string, nuevaContrasena: string): Observable<void> {
    return this.http.put<void>(`${this.base}/contrasena`, { contrasenaActual, nuevaContrasena });
  }

  // ---------- Sesión local ----------

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsuario(): UsuarioSesion | null {
    return this.usuarioSubject.value;
  }

  tieneRol(...roles: Rol[]): boolean {
    const actual = this.getUsuario()?.roles ?? [];
    return roles.some((r) => actual.includes(r));
  }

  estaAutenticado(): boolean {
    return !!this.getToken();
  }

  rutaPorRol(): string {
    const roles = this.getUsuario()?.roles ?? [];
    if (roles.includes('ADMIN_SISTEMA')) return '/dashboard/usuarios';
    if (roles.includes('ADMIN_SUCURSAL')) return '/dashboard/tarifas';
    if (roles.includes('CLIENTE')) return '/dashboard/cartera';
    return '/dashboard';
  }

  private guardarSesion(res: SesionBackend): void {
    localStorage.setItem('token', res.tokenAcceso);
    localStorage.setItem('refreshToken', res.tokenRefresco);
    localStorage.setItem('user', JSON.stringify(res.usuario));
    this.desafioPendiente = null;
    this.usuarioSubject.next(res.usuario);
  }

  private leerUsuario(): UsuarioSesion | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  }

  private limpiarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.desafioPendiente = null;
    this.usuarioSubject.next(null);
  }
}
