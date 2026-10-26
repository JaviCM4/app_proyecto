import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, interval, switchMap, takeWhile, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CancelarVenta,
  FiltroVentas,
  Historial,
  NuevaVentaEnLinea,
  NuevaVentaMostrador,
  ReembolsarVenta,
  Venta,
  VentaPendiente,
} from '../models/venta.model';

/**
 * Ventas de boletos (Sales): en línea (reserva + cobro async a la cartera),
 * mostrador (efectivo, inmediata), consulta, listado y cancelación.
 */
@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sales/ventas`;
  private readonly historialUrl = `${environment.apiUrl}/sales/historial`;

  /** Compra en línea: devuelve 202 pendiente; consultar detalle hasta que termine. */
  venderEnLinea(datos: NuevaVentaEnLinea): Observable<VentaPendiente> {
    return this.http.post<VentaPendiente>(`${this.url}/en-linea`, datos);
  }

  /** Venta en mostrador (cajero o admin sucursal): confirmada al instante. */
  venderEnMostrador(datos: NuevaVentaMostrador): Observable<Venta> {
    return this.http.post<Venta>(`${this.url}/mostrador`, datos);
  }

  detalle(id: string): Observable<Venta> {
    return this.http.get<Venta>(`${this.url}/${id}`);
  }

  listar(filtro: FiltroVentas = {}): Observable<Venta[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<Venta[]>(this.url, { params });
  }

  /** Cancela una venta confirmada de un viaje que no ha salido (admin sucursal). */
  cancelar(id: string, datos: CancelarVenta): Observable<Venta> {
    return this.http.post<Venta>(`${this.url}/${id}/cancelar`, datos);
  }

  /**
   * Devuelve el dinero de una venta cancelada (ventanilla). En efectivo queda REEMBOLSADA al
   * instante; si se pagó con cartera, el servicio se lo vuelve a pedir a la billetera y la venta
   * sigue CANCELADA hasta que esta responda.
   */
  reembolsar(id: string, datos: ReembolsarVenta): Observable<Venta> {
    return this.http.post<Venta>(`${this.url}/${id}/reembolsar`, datos);
  }

  /** Venta del boleto impreso, por su código de barras (también acepta el id completo). */
  buscarPorCodigo(codigo: string): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.url}/boleto`, { params: { codigo } });
  }

  /** Historial del cliente (por el NIT de su perfil, incluye mostrador). */
  miHistorial(): Observable<Historial> {
    return this.http.get<Historial>(`${this.historialUrl}/mio`);
  }

  /** Historial de un NIT (ventanilla). */
  historialPorNit(nit: string): Observable<Historial> {
    return this.http.get<Historial>(this.historialUrl, { params: { nit } });
  }

  /**
   * Consulta el detalle cada 2 s hasta que la venta deja de estar pendiente
   * (CONFIRMADA, RECHAZADA...). Máximo ~2 minutos.
   */
  seguirHastaFin(id: string): Observable<Venta> {
    return interval(2000).pipe(
      switchMap(() => this.detalle(id)),
      takeWhile((v) => v.estado === 'PENDIENTE_PAGO', true),
      timeout(125000),
    );
  }
}
