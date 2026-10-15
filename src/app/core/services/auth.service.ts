import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DesafioDobleFactor, RegistroCliente, ResultadoLogin, Rol, Sesion, UrlGoogle, UsuarioSesion } from '../models/auth.model';

const CLAVE_TOKEN = 'token';
const CLAVE_REFRESCO = 'tokenRefresco';
const CLAVE_USUARIO = 'usuario';

/** Sesión del usuario: login, registro, recuperación y datos guardados en el navegador. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/identity/auth`;

  private readonly usuarioActual = signal<UsuarioSesion | null>(this.leerUsuario());
  readonly usuario = this.usuarioActual.asReadonly();
  readonly autenticado = computed(() => this.usuarioActual() !== null);

  /** Desafío pendiente cuando la cuenta usa doble factor (se usa en la pantalla de verificación). */
  desafio: DesafioDobleFactor | null = null;

  // ---------- Sin sesión ----------

  login(correo: string, contrasena: string): Observable<ResultadoLogin> {
    return this.iniciar(this.http.post<Sesion | DesafioDobleFactor>(`${this.url}/login`, { correo, contrasena }));
  }

  /**
   * Inicio con Google, paso 1: el backend arma la URL de Google (con su state anti-CSRF) y el
   * navegador se va para allá. Google regresa al backend y el backend al front con ?ticket=.
   */
  urlGoogle(): Observable<UrlGoogle> {
    return this.http.get<UrlGoogle>(`${this.url}/oauth2/google/url`);
  }

  /** Inicio con Google, paso 2: cambia el ticket de un solo uso por la sesión (o por el desafío de doble factor). */
  canjearTicketGoogle(ticket: string): Observable<ResultadoLogin> {
    return this.iniciar(this.http.post<Sesion | DesafioDobleFactor>(`${this.url}/oauth2/canjear`, { ticket }));
  }

  verificarCodigo(correo: string, codigo: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.url}/login/verificar`, { correo, codigo }).pipe(tap((s) => this.guardar(s)));
  }

  registrar(datos: RegistroCliente): Observable<void> {
    return this.http.post<unknown>(`${this.url}/registro`, datos).pipe(map(() => undefined));
  }

  recuperar(correo: string): Observable<void> {
    return this.http.post<void>(`${this.url}/recuperar`, { correo });
  }

  /** Sirve para activar una cuenta nueva y para restablecer la contraseña (mismo enlace del correo). */
  restablecer(token: string, nuevaContrasena: string): Observable<void> {
    return this.http.post<void>(`${this.url}/restablecer`, { token, nuevaContrasena });
  }

  refrescar(): Observable<Sesion> {
    const tokenRefresco = localStorage.getItem(CLAVE_REFRESCO) ?? '';
    return this.http.post<Sesion>(`${this.url}/refrescar`, { tokenRefresco }).pipe(tap((s) => this.guardar(s)));
  }

  // ---------- Con sesión ----------

  cerrarSesion(): Observable<void> {
    const tokenRefresco = localStorage.getItem(CLAVE_REFRESCO);
    const peticion = tokenRefresco
      ? this.http.post<void>(`${this.url}/cerrar-sesion`, { tokenRefresco }).pipe(catchError(() => of(undefined)))
      : of(undefined);
    return peticion.pipe(tap(() => this.limpiar()));
  }

  cambiarContrasena(contrasenaActual: string, nuevaContrasena: string): Observable<void> {
    return this.http.put<void>(`${this.url}/contrasena`, { contrasenaActual, nuevaContrasena });
  }

  /** Verificación en dos pasos: al entrar se pide un código enviado al correo. */
  cambiarDobleFactor(activado: boolean): Observable<void> {
    return this.http.put<void>(`${this.url}/doble-factor`, { activado });
  }

  /** Actualiza los datos guardados de la sesión (por ejemplo, nombre o foto después de editar el perfil). */
  actualizarUsuario(cambios: Partial<UsuarioSesion>): void {
    const actual = this.usuarioActual();
    if (!actual) return;
    const nuevo = { ...actual, ...cambios };
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(nuevo));
    this.usuarioActual.set(nuevo);
  }

  limpiar(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_REFRESCO);
    localStorage.removeItem(CLAVE_USUARIO);
    this.desafio = null;
    this.usuarioActual.set(null);
  }

  token(): string | null {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  tieneRefresco(): boolean {
    return !!localStorage.getItem(CLAVE_REFRESCO);
  }

  tieneRol(...roles: Rol[]): boolean {
    const actuales = this.usuarioActual()?.roles ?? [];
    return roles.some((r) => actuales.includes(r));
  }

  /** Login con contraseña o con Google: guarda la sesión, o el desafío si la cuenta tiene doble factor. */
  private iniciar(peticion: Observable<Sesion | DesafioDobleFactor>): Observable<ResultadoLogin> {
    return peticion.pipe(
      map((r): ResultadoLogin => ('tokenAcceso' in r ? { tipo: 'SESION', sesion: r } : { tipo: 'DOBLE_FACTOR', desafio: r })),
      tap((r) => {
        if (r.tipo === 'SESION') this.guardar(r.sesion);
        else this.desafio = r.desafio;
      }),
    );
  }

  private guardar(sesion: Sesion): void {
    localStorage.setItem(CLAVE_TOKEN, sesion.tokenAcceso);
    localStorage.setItem(CLAVE_REFRESCO, sesion.tokenRefresco);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
    this.desafio = null;
    this.usuarioActual.set(sesion.usuario);
  }

  private leerUsuario(): UsuarioSesion | null {
    try {
      const guardado = localStorage.getItem(CLAVE_USUARIO);
      return guardado && localStorage.getItem(CLAVE_TOKEN) ? (JSON.parse(guardado) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  }
}
