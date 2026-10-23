import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, timeout } from 'rxjs';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface RutaCalculada {
  /** Puntos [latitud, longitud], en el orden que espera Leaflet. */
  puntos: [number, number][];
  /** Distancia real por carretera, en kilómetros (2 decimales). */
  kilometros: number;
  /** Duración estimada, en minutos. */
  minutos: number;
}

interface RespuestaOsrm {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
}

/**
 * Ruteo por calles con OSRM (servidor público de demostración, sin API key).
 * Devuelve la geometría real de la carretera entre dos puntos, o `null` si el servicio no
 * responde: quien lo usa dibuja la línea recta como respaldo. Las respuestas se guardan en
 * memoria para no pedir dos veces el mismo par de puntos durante la sesión.
 */
@Injectable({ providedIn: 'root' })
export class RuteoService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, RutaCalculada>();
  private readonly enCurso = new Map<string, Observable<RutaCalculada | null>>();

  private static readonly URL = 'https://router.project-osrm.org/route/v1/driving';
  private static readonly ESPERA_MAXIMA_MS = 6000;

  calcular(origen: Coordenadas, destino: Coordenadas): Observable<RutaCalculada | null> {
    const clave = this.clave(origen, destino);
    const guardada = this.cache.get(clave);
    if (guardada) return of(guardada);

    const pendiente = this.enCurso.get(clave);
    if (pendiente) return pendiente;

    const url = `${RuteoService.URL}/${origen.longitud},${origen.latitud};${destino.longitud},${destino.latitud}`
      + '?overview=simplified&geometries=geojson&alternatives=false&steps=false';

    const peticion = this.http.get<RespuestaOsrm>(url).pipe(
      timeout(RuteoService.ESPERA_MAXIMA_MS),
      map((respuesta) => this.convertir(respuesta)),
      tap((ruta) => {
        if (ruta) this.cache.set(clave, ruta);
      }),
      catchError(() => of(null)),
      finalize(() => this.enCurso.delete(clave)),
      shareReplay(1),
    );
    this.enCurso.set(clave, peticion);
    return peticion;
  }

  private convertir(respuesta: RespuestaOsrm): RutaCalculada | null {
    const ruta = respuesta.code === 'Ok' ? respuesta.routes?.[0] : undefined;
    const coordenadas = ruta?.geometry?.coordinates;
    if (!ruta || !coordenadas?.length) return null;

    const kilometros = Math.round((ruta.distance / 1000) * 100) / 100;
    if (!(kilometros > 0)) return null;

    return {
      // OSRM entrega [longitud, latitud]; Leaflet espera [latitud, longitud].
      puntos: coordenadas.map(([longitud, latitud]) => [latitud, longitud] as [number, number]),
      kilometros,
      minutos: Math.max(1, Math.round(ruta.duration / 60)),
    };
  }

  /** Clave con 5 decimales (≈ 1 m): dos clics casi iguales comparten la misma ruta. */
  private clave(origen: Coordenadas, destino: Coordenadas): string {
    const punto = (c: Coordenadas) => `${c.latitud.toFixed(5)},${c.longitud.toFixed(5)}`;
    return `${punto(origen)};${punto(destino)}`;
  }
}
