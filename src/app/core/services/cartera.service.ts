import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WalletMovementResponse, WalletResponse } from '../models/identity.model';

/** Endpoints de cartera propia (rol CLIENTE): GET /identity/cartera, POST recargas, GET movimientos. */
@Injectable({ providedIn: 'root' })
export class CarteraService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/identity/cartera`;

  saldo(): Observable<WalletResponse> {
    return this.http.get<WalletResponse>(this.base);
  }

  recargar(monto: number, fechaMovimiento?: string): Observable<WalletMovementResponse> {
    return this.http.post<WalletMovementResponse>(`${this.base}/recargas`, { monto, fechaMovimiento });
  }

  movimientos(desde?: string, hasta?: string): Observable<WalletMovementResponse[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<WalletMovementResponse[]>(`${this.base}/movimientos`, { params });
  }
}
