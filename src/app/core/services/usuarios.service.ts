import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdministradorSistemaRequest,
  PerfilResponse,
  UpdateProfileRequest,
  UsuarioDetalleResponse,
  UsuarioListaResponse,
} from '../models/identity.model';

/**
 * Endpoints de perfil propio y administración de usuarios.
 * - GET/PUT /identity/perfil
 * - GET /identity/usuarios · POST /identity/usuarios/administradores-sistema
 * - GET/PATCH /identity/usuarios/{id}[/estado]
 */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/identity`;

  // ----- Perfil propio -----
  verPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(`${this.base}/perfil`);
  }

  actualizarPerfil(payload: UpdateProfileRequest): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(`${this.base}/perfil`, payload);
  }

  // ----- Administración (ADMIN_SISTEMA / ADMIN_SUCURSAL) -----
  listar(rol?: string, estado?: string, q?: string): Observable<UsuarioListaResponse[]> {
    let params = new HttpParams();
    if (rol) params = params.set('rol', rol);
    if (estado) params = params.set('estado', estado);
    if (q) params = params.set('q', q);
    return this.http.get<UsuarioListaResponse[]>(`${this.base}/usuarios`, { params });
  }

  detalle(id: string): Observable<UsuarioDetalleResponse> {
    return this.http.get<UsuarioDetalleResponse>(`${this.base}/usuarios/${id}`);
  }

  crearAdministrador(payload: AdministradorSistemaRequest): Observable<UsuarioDetalleResponse> {
    return this.http.post<UsuarioDetalleResponse>(`${this.base}/usuarios/administradores-sistema`, payload);
  }

  cambiarEstado(id: string, estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO'): Observable<UsuarioDetalleResponse> {
    return this.http.patch<UsuarioDetalleResponse>(`${this.base}/usuarios/${id}/estado`, { estado });
  }
}
