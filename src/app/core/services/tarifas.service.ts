import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DepreciationRateResponse } from '../models/identity.model';

/** Tarifas de depreciación: GET /identity/tarifas-depreciacion[?vigenteEn] y POST (ADMIN_SISTEMA). */
@Injectable({ providedIn: 'root' })
export class TarifasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/identity/tarifas-depreciacion`;

  listar(): Observable<DepreciationRateResponse[]> {
    return this.http.get<DepreciationRateResponse[]>(this.base);
  }

  vigente(vigenteEn: string): Observable<DepreciationRateResponse> {
    const params = new HttpParams().set('vigenteEn', vigenteEn);
    return this.http.get<DepreciationRateResponse>(this.base, { params });
  }

  crear(montoPorKm: number, vigenteDesde: string): Observable<DepreciationRateResponse> {
    return this.http.post<DepreciationRateResponse>(this.base, { montoPorKm, vigenteDesde });
  }
}
