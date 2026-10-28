import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarTarifaReembolso,
  EstadoAlquilerTarifa,
  NuevaTarifaReembolso,
  ReglaReembolso,
  TarifaReembolso,
} from '../models/venta.model';

/**
 * Tarifas de reembolso (Sales): qué porcentaje se le devuelve al cliente cuando se cancela su
 * alquiler, según el estado del alquiler y las horas que faltaban para la salida.
 *
 * La tabla vive en Sales porque es Sales quien tiene la orden de alquiler y ejecuta la devolución.
 * La administra el administrador del sistema; el listado lo puede ver cualquier cuenta con sesión,
 * porque el cliente necesita el aviso antes de pedir un alquiler.
 */
@Injectable({ providedIn: 'root' })
export class TarifasReembolsoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sales/tarifas-reembolso`;

  listar(): Observable<TarifaReembolso[]> {
    return this.http.get<TarifaReembolso[]>(this.url);
  }

  /** La tarifa que aplicaría a una cancelación concreta (para el diálogo de confirmación). */
  aplicable(estado: EstadoAlquilerTarifa, horasAntes: number): Observable<ReglaReembolso> {
    const params = new HttpParams().set('estado', estado).set('horasAntes', Math.trunc(horasAntes));
    return this.http.get<ReglaReembolso>(`${this.url}/aplicable`, { params });
  }

  crear(datos: NuevaTarifaReembolso): Observable<TarifaReembolso> {
    return this.http.post<TarifaReembolso>(this.url, datos);
  }

  actualizar(id: string, datos: ActualizarTarifaReembolso): Observable<TarifaReembolso> {
    return this.http.put<TarifaReembolso>(`${this.url}/${id}`, datos);
  }
}
