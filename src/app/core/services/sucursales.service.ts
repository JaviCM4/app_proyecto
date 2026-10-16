import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarSucursal, NuevaSucursal, Sucursal, SucursalCreada } from '../models/sucursal.model';

/** Sucursales (Fleet). La consulta es pública; crear y modificar es del administrador del sistema. */
@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/fleet/sucursales`;

  listar(activa?: boolean): Observable<Sucursal[]> {
    let params = new HttpParams();
    if (activa !== undefined) params = params.set('activa', activa);
    return this.http.get<Sucursal[]>(this.url, { params });
  }

  obtener(id: string): Observable<Sucursal> {
    return this.http.get<Sucursal>(`${this.url}/${id}`);
  }

  /** Crea la sucursal y la cuenta de su administrador (le llega un correo para activarla). */
  crear(datos: NuevaSucursal): Observable<SucursalCreada> {
    return this.http.post<SucursalCreada>(this.url, datos);
  }

  actualizar(id: string, datos: ActualizarSucursal): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${this.url}/${id}`, datos);
  }

  cambiarEstado(id: string, activa: boolean, version: number): Observable<Sucursal> {
    return this.http.patch<Sucursal>(`${this.url}/${id}/estado`, { activa, version });
  }
}
