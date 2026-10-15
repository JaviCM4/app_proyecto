import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cartera, MovimientoCartera } from '../models/cartera.model';

/** Cartera digital del usuario (todas las cuentas tienen una). */
@Injectable({ providedIn: 'root' })
export class CarteraService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/identity/cartera`;

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
