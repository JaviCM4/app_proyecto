import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarRuta,
  ActualizarViaje,
  EstadoViaje,
  FiltroViajes,
  MapaAsientos,
  NuevaRuta,
  NuevoViaje,
  RegistrarLlegada,
  RegistrarSalida,
  Ruta,
  Viaje,
  ViajeDetalle,
} from '../models/viaje.model';

/** Rutas, viajes y asientos. Sin sesión solo se ven los viajes regulares programados. */
@Injectable({ providedIn: 'root' })
export class ViajesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  buscar(filtro: FiltroViajes = {}): Observable<Viaje[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<Viaje[]>(`${this.api}/trips/viajes`, { params });
  }

  /** Viajes asignados al chofer del token (T13). */
  mios(filtro: { desde?: string | null; hasta?: string | null; estado?: EstadoViaje | null } = {}): Observable<Viaje[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<Viaje[]>(`${this.api}/trips/viajes/mios`, { params });
  }

  rutas(activa = true): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${this.api}/trips/rutas`, { params: { activa } });
  }

  asientos(viajeId: string): Observable<MapaAsientos> {
    return this.http.get<MapaAsientos>(`${this.api}/sales/viajes/${viajeId}/asientos`);
  }

  // ---------- Rutas (el origen debe ser la sucursal del token) ----------

  crearRuta(datos: NuevaRuta): Observable<Ruta> {
    return this.http.post<Ruta>(`${this.api}/trips/rutas`, datos);
  }

  actualizarRuta(id: string, datos: ActualizarRuta): Observable<Ruta> {
    return this.http.put<Ruta>(`${this.api}/trips/rutas/${id}`, datos);
  }

  eliminarRuta(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/trips/rutas/${id}`);
  }

  // ---------- Viajes regulares ----------

  detalleViaje(id: string): Observable<ViajeDetalle> {
    return this.http.get<ViajeDetalle>(`${this.api}/trips/viajes/${id}`);
  }

  /** Programa un viaje regular con bus, chofer y horario ya validados. */
  programarViaje(datos: NuevoViaje): Observable<Viaje> {
    return this.http.post<Viaje>(`${this.api}/trips/viajes`, datos);
  }

  /** Cambia hora, bus o chofer de un viaje programado (se envían los cuatro datos). */
  actualizarViaje(id: string, datos: ActualizarViaje): Observable<Viaje> {
    return this.http.put<Viaje>(`${this.api}/trips/viajes/${id}`, datos);
  }

  eliminarViaje(id: string, motivo?: string | null): Observable<void> {
    let params = new HttpParams();
    if (motivo) params = params.set('motivo', motivo);
    return this.http.delete<void>(`${this.api}/trips/viajes/${id}`, { params });
  }

  /** Marca la salida: el viaje pasa a EN_RUTA. */
  registrarSalida(id: string, datos: RegistrarSalida): Observable<ViajeDetalle> {
    return this.http.post<ViajeDetalle>(`${this.api}/trips/viajes/${id}/salida`, datos);
  }

  /** Marca la llegada: el viaje pasa a COMPLETADO. */
  registrarLlegada(id: string, datos: RegistrarLlegada): Observable<ViajeDetalle> {
    return this.http.post<ViajeDetalle>(`${this.api}/trips/viajes/${id}/llegada`, datos);
  }
}
