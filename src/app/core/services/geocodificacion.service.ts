import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

export interface Lugar {
  /** Nombre corto y legible: "Parque Central, Quetzaltenango". */
  nombre: string;
  latitud: number;
  longitud: number;
}

interface PropiedadesPhoton {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  county?: string;
  state?: string;
}

interface CaracteristicaPhoton {
  geometry: { coordinates: [number, number] };
  properties: PropiedadesPhoton;
}

interface RespuestaPhoton {
  features: CaracteristicaPhoton[];
}

/** Caja de Guatemala (minLon,minLat,maxLon,maxLat) para no proponer lugares de otros países. */
const CAJA_GT = '-92.6,13.4,-88.0,18.1';

/** Coordenada con 6 decimales (≈ 11 cm): lo máximo que acepta el backend (Trips valida 6 decimales). */
export function seisDecimales(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

/**
 * Búsqueda de lugares y geocodificación inversa con Photon (sin API key).
 *
 * Es una ayuda opcional: si el servicio no responde (sin internet, bloqueado en la nube…)
 * se devuelven resultados vacíos y el usuario puede escribir el origen y el destino a mano.
 */
@Injectable({ providedIn: 'root' })
export class GeocodificacionService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://photon.komoot.io';

  /** Lugares de Guatemala cuyo nombre se parece a lo que escribió el usuario. */
  buscar(texto: string): Observable<Lugar[]> {
    const consulta = texto.trim();
    if (consulta.length < 3) return of([]);
    // Ojo: Photon solo acepta lang = default, de, en, fr. Sin lang devuelve el nombre local
    // (que en Guatemala ya viene en español), y así se evita el 400 Bad Request.
    const params = new HttpParams()
      .set('q', consulta)
      .set('limit', '6')
      .set('bbox', CAJA_GT);
    return this.http.get<RespuestaPhoton>(`${this.base}/api`, { params }).pipe(
      map((r) => (r.features ?? []).map((f) => this.aLugar(f))),
      catchError(() => of([])),
    );
  }

  /** Nombre del lugar más cercano a un punto del mapa (referencia tipo Uber). */
  reversa(latitud: number, longitud: number): Observable<string | null> {
    const params = new HttpParams()
      .set('lat', String(latitud))
      .set('lon', String(longitud))
      .set('limit', '1');
    return this.http.get<RespuestaPhoton>(`${this.base}/reverse`, { params }).pipe(
      map((r) => (r.features?.[0] ? this.etiqueta(r.features[0]) : null)),
      catchError(() => of(null)),
    );
  }

  private aLugar(f: CaracteristicaPhoton): Lugar {
    // Photon devuelve 7 o más decimales: se recortan aquí para que ningún formulario mande de más
    const [longitud, latitud] = f.geometry.coordinates;
    return { nombre: this.etiqueta(f), latitud: seisDecimales(latitud), longitud: seisDecimales(longitud) };
  }

  /** Junta lo más útil del resultado en una etiqueta corta (lugar, ciudad). */
  private etiqueta(f: CaracteristicaPhoton): string {
    const p = f.properties ?? {};
    const lugar = p.name ?? p.street ?? (p.housenumber ? `#${p.housenumber}` : undefined);
    const zona = p.city ?? p.county ?? p.state;
    const partes = [...new Set([lugar, zona].filter((x): x is string => !!x))];
    return partes.join(', ') || lugar || 'Lugar sin nombre';
  }
}
