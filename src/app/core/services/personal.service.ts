import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NuevoPersonal, PersonalSucursal, RolPersonal, TrasladoRealizado } from '../models/sucursal.model';

/**
 * Personal de las sucursales (administradores y cajeros) en Fleet.
 * Fleet crea la cuenta en Identity y valida que cada sucursal activa conserve al menos un administrador.
 */
@Injectable({ providedIn: 'root' })
export class PersonalService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/fleet`;

  listar(sucursalId: string, rol?: RolPersonal, activo?: boolean): Observable<PersonalSucursal[]> {
    let params = new HttpParams();
    if (rol) params = params.set('rol', rol);
    if (activo !== undefined) params = params.set('activo', activo);
    return this.http.get<PersonalSucursal[]>(`${this.api}/sucursales/${sucursalId}/personal`, { params });
  }

  /** Agrega un administrador o cajero a la sucursal y crea su cuenta (le llega un correo para activarla). */
  agregar(sucursalId: string, datos: NuevoPersonal): Observable<PersonalSucursal> {
    return this.http.post<PersonalSucursal>(`${this.api}/sucursales/${sucursalId}/personal`, datos);
  }

  /** Lo retira de la sucursal: pierde el rol y el acceso a esa sucursal. */
  desactivar(personalId: string, fechaDesasignacion: string, version: number): Observable<PersonalSucursal> {
    return this.http.patch<PersonalSucursal>(`${this.api}/personal/${personalId}/desactivar`, { fechaDesasignacion, version });
  }

  /**
   * Vuelve a asignar a una persona retirada, con su misma cuenta, en la misma u otra sucursal y con el
   * mismo u otro puesto. Fleet valida que no esté activa en otra sucursal y que la sucursal esté activa.
   */
  reintegrar(personalId: string, sucursalId: string, rol: RolPersonal, fechaAsignacion: string): Observable<PersonalSucursal> {
    return this.http.post<PersonalSucursal>(`${this.api}/personal/${personalId}/reintegro`, { sucursalId, rol, fechaAsignacion });
  }

  /** Lo mueve a otra sucursal con el mismo rol (solo el administrador del sistema). */
  trasladar(personalId: string, sucursalDestinoId: string, fechaTraslado: string, version: number): Observable<TrasladoRealizado> {
    return this.http.post<TrasladoRealizado>(`${this.api}/personal/${personalId}/traslado`, { sucursalDestinoId, fechaTraslado, version });
  }
}
