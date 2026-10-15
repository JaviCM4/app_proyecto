import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PdfDescargado } from '../models/reporte.model';

type Filtros = Record<string, string | number | null | undefined>;

/** Reportes: el mismo recurso responde JSON (?format=json) para ver en pantalla o PDF (?format=pdf) para descargar. */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/reports`;

  datos<T>(ruta: string, filtros: Filtros = {}): Observable<T> {
    return this.http.get<T>(`${this.url}${ruta}`, { params: this.params(filtros).set('format', 'json') });
  }

  pdf(ruta: string, filtros: Filtros, nombrePorDefecto: string): Observable<PdfDescargado> {
    return this.http
      .get(`${this.url}${ruta}`, { params: this.params(filtros).set('format', 'pdf'), observe: 'response', responseType: 'blob' })
      .pipe(map((r: HttpResponse<Blob>) => ({ blob: r.body as Blob, nombre: this.nombreArchivo(r, nombrePorDefecto) })));
  }

  /** Descarga el PDF en el navegador. */
  guardar(pdf: PdfDescargado): void {
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(pdf.blob);
    enlace.download = pdf.nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 5000);
  }

  private params(filtros: Filtros): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== null && valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return params;
  }

  private nombreArchivo(r: HttpResponse<Blob>, porDefecto: string): string {
    const m = /filename="?([^";]+)"?/.exec(r.headers.get('Content-Disposition') ?? '');
    return m?.[1] ?? porDefecto;
  }
}
