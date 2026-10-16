import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarChofer, ActualizarLicencia, Chofer, EstadoChofer, NuevoChofer } from '../models/chofer.model';
import { TipoFotoFleet } from '../models/bus.model';

/** Choferes (Fleet). Todo el ABM es del administrador de sucursal. */
@Injectable({ providedIn: 'root' })
export class ChoferesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/fleet/choferes`;
  private readonly archivos = `${environment.apiUrl}/fleet/archivos`;

  listar(sucursalId?: string | null, estado?: EstadoChofer | null): Observable<Chofer[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId);
    if (estado) params = params.set('estado', estado);
    return this.http.get<Chofer[]>(this.url, { params });
  }

  detalle(id: string): Observable<Chofer> {
    return this.http.get<Chofer>(`${this.url}/${id}`);
  }

  /** Crea el chofer y su cuenta (la foto de la cuenta sale de subirFoto con tipo CHOFER). */
  crear(datos: NuevoChofer): Observable<Chofer> {
    return this.http.post<Chofer>(this.url, datos);
  }

  /** Solo datos laborales; nombre, correo y foto se editan en Identity. */
  actualizar(id: string, datos: ActualizarChofer): Observable<Chofer> {
    return this.http.put<Chofer>(`${this.url}/${id}`, datos);
  }

  actualizarLicencia(id: string, datos: ActualizarLicencia): Observable<Chofer> {
    return this.http.put<Chofer>(`${this.url}/${id}/licencia`, datos);
  }

  desactivar(id: string, fecha: string, version: number): Observable<Chofer> {
    return this.http.patch<Chofer>(`${this.url}/${id}/desactivar`, { fecha, version });
  }

  subirFoto(archivo: File): Observable<{ fotoUrl: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    const tipo: TipoFotoFleet = 'CHOFER';
    return this.http.post<{ fotoUrl: string }>(`${this.archivos}/fotos`, form, { params: { tipo } });
  }
}
