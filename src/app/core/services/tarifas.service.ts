import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TarifaDepreciacion } from '../models/tarifa.model';

/** Tarifas de depreciación (las crea el administrador del sistema; no se editan ni se borran). */
@Injectable({ providedIn: 'root' })
export class TarifasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/identity/tarifas-depreciacion`;

  listar(): Observable<TarifaDepreciacion[]> {
    return this.http.get<TarifaDepreciacion[]>(this.url, { params: { size: 2000 } });
  }

  vigenteEn(fecha: string): Observable<TarifaDepreciacion> {
    return this.http.get<TarifaDepreciacion>(this.url, { params: new HttpParams().set('vigenteEn', fecha) });
  }

  crear(montoPorKm: number, vigenteDesde: string): Observable<TarifaDepreciacion> {
    return this.http.post<TarifaDepreciacion>(this.url, { montoPorKm, vigenteDesde });
  }
}
