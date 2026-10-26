import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClienteCuenta } from '../models/venta.model';

/**
 * Clientes con cuenta (copia que Sales mantiene de Identity). La ventanilla los busca por NIT antes
 * de vender: si el NIT es de una cuenta, el boleto queda ligado a ella y le aparece al pasajero en
 * "Mis boletos" aunque pague en efectivo.
 */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sales/clientes`;

  /** Busca por NIT, nombre o correo. Sin texto devuelve los primeros en orden alfabético. */
  buscar(busqueda?: string | null): Observable<ClienteCuenta[]> {
    const params = busqueda ? new HttpParams().set('busqueda', busqueda) : new HttpParams();
    return this.http.get<ClienteCuenta[]>(this.url, { params });
  }
}
