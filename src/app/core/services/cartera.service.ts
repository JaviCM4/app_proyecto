import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cartera, MovimientoCartera } from '../models/cartera.model';

/**
 * Cartera digital del cliente (wallet-service, /wallet/cartera por el gateway).
 * Si el cliente no tiene cartera, el backend se la abre en cero la primera vez que la consulta.
 */
@Injectable({ providedIn: 'root' })
export class CarteraService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/wallet/cartera`;

  consultar(): Observable<Cartera> {
    return this.http.get<Cartera>(this.url);
  }

  recargar(monto: number, fechaMovimiento: string): Observable<MovimientoCartera> {
    return this.http.post<MovimientoCartera>(`${this.url}/recargas`, { monto, fechaMovimiento });
  }

  movimientos(desde?: string, hasta?: string): Observable<MovimientoCartera[]> {
    let params = new HttpParams().set('size', 2000);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<MovimientoCartera[]>(`${this.url}/movimientos`, { params });
  }
}
