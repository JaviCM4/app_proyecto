import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Subida de foto de perfil: POST /identity/archivos/fotos (multipart, campo "archivo"). */
@Injectable({ providedIn: 'root' })
export class ArchivosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/identity/archivos`;

  subirFoto(archivo: File): Observable<{ fotoUrl: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<{ fotoUrl: string }>(`${this.base}/fotos`, form);
  }
}
