import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, interval, switchMap, takeWhile, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoOrdenAlquiler, FiltroOrdenes, OrdenAlquiler } from '../models/venta.model';

/** Órdenes de pago de alquileres (Sales): cartera (cliente) o efectivo (ventanilla). */
@Injectable({ providedIn: 'root' })
export class OrdenesAlquilerService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sales/ordenes-alquiler`;

  listar(filtro: FiltroOrdenes = {}): Observable<OrdenAlquiler[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<OrdenAlquiler[]>(this.url, { params });
  }

  mias(): Observable<OrdenAlquiler[]> {
    return this.http.get<OrdenAlquiler[]>(`${this.url}/mias`);
  }

  detalle(id: string): Observable<OrdenAlquiler> {
    return this.http.get<OrdenAlquiler>(`${this.url}/${id}`);
  }

  /** Paga con la cartera (202 pendiente; consultar detalle hasta PAGADA o RECHAZADA). */
  pagarCartera(id: string, fechaPago: string): Observable<OrdenAlquiler> {
    return this.http.post<OrdenAlquiler>(`${this.url}/${id}/pago-cartera`, { fechaPago });
  }

  /** Paga en efectivo en mostrador (inmediato). */
  pagarEfectivo(id: string, fechaPago: string): Observable<OrdenAlquiler> {
    return this.http.post<OrdenAlquiler>(`${this.url}/${id}/pago-efectivo`, { fechaPago });
  }

  /** Consulta el detalle cada 2 s hasta que deja de estar pendiente. Máximo ~2 minutos. */
  seguirHastaFin(id: string): Observable<OrdenAlquiler> {
    return interval(2000).pipe(
      switchMap(() => this.detalle(id)),
      takeWhile((o) => o.estado === 'PENDIENTE_PAGO', true),
      timeout(125000),
    );
  }

  estados(): EstadoOrdenAlquiler[] {
    return ['PENDIENTE_PAGO', 'PAGADA', 'RECHAZADA', 'REEMBOLSADA'];
  }
}
