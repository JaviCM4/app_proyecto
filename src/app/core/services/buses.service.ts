import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarBus, Bus, BusDetalle, EstadoBusManual, NuevoBus, TipoFotoFleet, ViajeKilometraje } from '../models/bus.model';

/** Buses (Fleet). Crear, editar y cambiar estado es del administrador de sucursal. */
@Injectable({ providedIn: 'root' })
export class BusesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/fleet/buses`;
  private readonly archivos = `${environment.apiUrl}/fleet/archivos`;

  listar(sucursalId?: string | null, estado?: string | null): Observable<Bus[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId);
    if (estado) params = params.set('estado', estado);
    return this.http.get<Bus[]>(this.url, { params });
  }

  detalle(id: string): Observable<BusDetalle> {
    return this.http.get<BusDetalle>(`${this.url}/${id}`);
  }

  crear(datos: NuevoBus): Observable<Bus> {
    return this.http.post<Bus>(this.url, datos);
  }

  actualizar(id: string, datos: ActualizarBus): Observable<Bus> {
    return this.http.put<Bus>(`${this.url}/${id}`, datos);
  }

  cambiarEstado(id: string, estado: EstadoBusManual, fecha: string, version: number): Observable<Bus> {
    return this.http.patch<Bus>(`${this.url}/${id}/estado`, { estado, fecha, version });
  }

  /** Bitácora de kilometraje del bus en un rango de fechas. */
  bitacora(busId: string, desde?: string | null, hasta?: string | null): Observable<ViajeKilometraje[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ViajeKilometraje[]>(`${this.url}/${busId}/bitacora`, { params });
  }

  /** Sube la foto (JPG/PNG/WEBP, máx. 2MB) y devuelve su URL para el formulario. */
  subirFoto(tipo: TipoFotoFleet, archivo: File): Observable<{ fotoUrl: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<{ fotoUrl: string }>(`${this.archivos}/fotos`, form, { params: { tipo } });
  }
}
