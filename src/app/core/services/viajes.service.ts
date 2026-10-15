import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltroViajes, MapaAsientos, Ruta, Viaje } from '../models/viaje.model';

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

  rutas(activa = true): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${this.api}/trips/rutas`, { params: { activa } });
  }

  asientos(viajeId: string): Observable<MapaAsientos> {
    return this.http.get<MapaAsientos>(`${this.api}/sales/viajes/${viajeId}/asientos`);
  }
}
