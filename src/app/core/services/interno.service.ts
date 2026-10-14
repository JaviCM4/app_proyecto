import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminContactoResponse,
  ContactoResponse,
  CuentaPersonalRequest,
  CuentaPersonalResponse,
} from '../models/identity.model';

/**
 * Endpoints internos (rol SERVICIO, token de servicio):
 * - POST /identity/interno/cuentas-personal
 * - GET /identity/interno/sucursales/{id}/administradores
 * - GET /identity/interno/usuarios/{id}/contacto
 * Se exponen para el módulo de integración; la UI normal no los usa.
 */
@Injectable({ providedIn: 'root' })
export class InternoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/identity/interno`;

  crearCuentaPersonal(payload: CuentaPersonalRequest): Observable<CuentaPersonalResponse> {
    return this.http.post<CuentaPersonalResponse>(`${this.base}/cuentas-personal`, payload);
  }

  administradoresDeSucursal(sucursalId: string): Observable<AdminContactoResponse[]> {
    return this.http.get<AdminContactoResponse[]>(`${this.base}/sucursales/${sucursalId}/administradores`);
  }

  contactoDeUsuario(usuarioId: string): Observable<ContactoResponse> {
    return this.http.get<ContactoResponse>(`${this.base}/usuarios/${usuarioId}/contacto`);
  }
}
