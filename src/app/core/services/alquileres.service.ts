import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Alquiler,
  AsignarAlquiler,
  CancelarAlquiler,
  ConfigAlquiler,
  CotizarAlquiler,
  FiltroAlquileres,
  NuevaConfigAlquiler,
  NuevoAlquiler,
  ViajeDetalle,
} from '../models/viaje.model';

/** Alquileres de buses (Trips): cualquier cliente los solicita; cotizar y asignar es del administrador. */
@Injectable({ providedIn: 'root' })
export class AlquileresService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/trips/alquileres`;
  private readonly config = `${environment.apiUrl}/trips/configuracion-alquiler`;

  /** Solicita un alquiler (CLIENTE en línea; CAJERO en mostrador). */
  solicitar(datos: NuevoAlquiler): Observable<Alquiler> {
    return this.http.post<Alquiler>(this.url, datos);
  }

  /** Alquileres del cliente del token. */
  mios(): Observable<Alquiler[]> {
    return this.http.get<Alquiler[]>(`${this.url}/mios`);
  }

  listar(filtro: FiltroAlquileres = {}): Observable<Alquiler[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<Alquiler[]>(this.url, { params });
  }

  detalle(id: string): Observable<Alquiler> {
    return this.http.get<Alquiler>(`${this.url}/${id}`);
  }

  /** Confirma el precio final (igual o ajustado al estimado). */
  cotizar(id: string, datos: CotizarAlquiler): Observable<Alquiler> {
    return this.http.post<Alquiler>(`${this.url}/${id}/cotizacion`, datos);
  }

  cancelar(id: string, datos: CancelarAlquiler): Observable<Alquiler> {
    return this.http.post<Alquiler>(`${this.url}/${id}/cancelar`, datos);
  }

  /** Asigna bus y chofer: crea el viaje privado y lo devuelve con su detalle. */
  asignar(id: string, datos: AsignarAlquiler): Observable<ViajeDetalle> {
    return this.http.post<ViajeDetalle>(`${this.url}/${id}/asignacion`, datos);
  }

  /** Historial del precio por km (el vigente es el último). */
  historialPrecio(): Observable<ConfigAlquiler[]> {
    return this.http.get<ConfigAlquiler[]>(this.config);
  }

  /** Registra un precio por km desde una fecha (solo el administrador del sistema). */
  registrarPrecio(datos: NuevaConfigAlquiler): Observable<ConfigAlquiler> {
    return this.http.post<ConfigAlquiler>(this.config, datos);
  }
}
