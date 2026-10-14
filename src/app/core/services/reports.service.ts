import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PdfDescargado {
  blob: Blob;
  nombre: string;
}

function paramsDe(filtros: Record<string, string | number | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
  }
  return params;
}

function nombreDesde(res: HttpResponse<Blob>, defecto: string): string {
  const disp = res.headers.get('Content-Disposition') ?? '';
  const m = /filename="?([^";]+)"?/.exec(disp);
  return m?.[1] ?? defecto;
}

/**
 * Los 12 reportes (RG1–RG6 globales, RS1–RS6 por sucursal).
 * Cada endpoint responde JSON (?format=json, para ver en pantalla) o PDF (por defecto, para descargar).
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;

  // ---------- Globales RG1–RG6 (ADMIN_SISTEMA) ----------

  json<T>(ruta: string, filtros: Record<string, string | number | undefined | null>): Observable<T> {
    return this.http.get<T>(`${this.base}${ruta}`, { params: paramsDe(filtros).set('format', 'json') });
  }

  pdf(ruta: string, filtros: Record<string, string | number | undefined | null>, defecto: string): Observable<PdfDescargado> {
    return this.http
      .get(`${this.base}${ruta}`, { params: paramsDe(filtros).set('format', 'pdf'), observe: 'response', responseType: 'blob' })
      .pipe(map((res) => ({ blob: res.body as Blob, nombre: nombreDesde(res, defecto) })));
  }

  descargarPdf(pdf: PdfDescargado): void {
    const url = URL.createObjectURL(pdf.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdf.nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
