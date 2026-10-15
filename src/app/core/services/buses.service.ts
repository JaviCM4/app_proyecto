import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Bus } from '../models/bus.model';

/** Buses (Fleet). El administrador de sucursal solo ve los de su sucursal. */
@Injectable({ providedIn: 'root' })
export class BusesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/fleet/buses`;

  listar(sucursalId?: string | null): Observable<Bus[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId);
    return this.http.get<Bus[]>(this.url, { params });
  }
}
