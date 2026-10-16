import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarCategoria,
  BusDisponible,
  Categoria,
  FiltroServicios,
  NuevaCategoria,
  NuevoServicio,
  ServicioTaller,
} from '../models/taller.model';

/**
 * Taller mecánico (Maintenance): el admin de sucursal registra los servicios
 * de sus buses; las categorías las administra el sistema.
 */
@Injectable({ providedIn: 'root' })
export class TallerService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/maintenance`;

  categorias(activa?: boolean | null): Observable<Categoria[]> {
    let params = new HttpParams();
    if (activa !== undefined && activa !== null) params = params.set('activa', activa);
    return this.http.get<Categoria[]>(`${this.api}/categorias`, { params });
  }

  crearCategoria(datos: NuevaCategoria): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.api}/categorias`, datos);
  }

  actualizarCategoria(id: string, datos: ActualizarCategoria): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.api}/categorias/${id}`, datos);
  }

  /** Buses de la sucursal del token para el selector del formulario. */
  busesDisponibles(activo?: boolean | null): Observable<BusDisponible[]> {
    let params = new HttpParams();
    if (activo !== undefined && activo !== null) params = params.set('activo', activo);
    return this.http.get<BusDisponible[]>(`${this.api}/buses`, { params });
  }

  registrar(datos: NuevoServicio): Observable<ServicioTaller> {
    return this.http.post<ServicioTaller>(`${this.api}/servicios`, datos);
  }

  listar(filtro: FiltroServicios = {}): Observable<ServicioTaller[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<ServicioTaller[]>(`${this.api}/servicios`, { params });
  }

  detalle(id: string): Observable<ServicioTaller> {
    return this.http.get<ServicioTaller>(`${this.api}/servicios/${id}`);
  }
}
