import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CarteraSistema, MovimientoCartera } from '../models/cartera.model';

/**
 * Billetera del sistema (wallet-service, /wallet/sistema): solo consulta, para el administrador del sistema.
 * Cada compra en línea entra aquí (COBRO) y cada reembolso sale de aquí (DEVOLUCION).
 */
@Injectable({ providedIn: 'root' })
export class CarteraSistemaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/wallet/sistema`;

  consultar(): Observable<CarteraSistema> {
    return this.http.get<CarteraSistema>(this.url);
  }

  /** El servidor pagina por su cuenta; aquí se pide una página grande y se pagina en pantalla. */
  movimientos(desde?: string, hasta?: string): Observable<MovimientoCartera[]> {
    let params = new HttpParams().set('size', 2000);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<MovimientoCartera[]>(`${this.url}/movimientos`, { params });
  }
}
