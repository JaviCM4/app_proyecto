import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RuteoService } from './ruteo.service';

/**
 * Pruebas unitarias de RuteoService.
 * Regla: OSRM entrega [longitud, latitud] y Leaflet espera [latitud, longitud].
 */

const URL_OSRM = 'https://router.project-osrm.org/route/v1/driving';
const ORIGEN = { latitud: 14.8347, longitud: -91.5181 };
const DESTINO = { latitud: 14.6349, longitud: -90.5069 };
const DISTANCIA_METROS = 150000;
const DURACION_SEGUNDOS = 7200;

function respuestaOk() {
  return {
    code: 'Ok',
    routes: [
      {
        distance: DISTANCIA_METROS,
        duration: DURACION_SEGUNDOS,
        geometry: { coordinates: [[-91.5181, 14.8347], [-90.5069, 14.6349]] },
      },
    ],
  };
}

describe('RuteoService', () => {
  let servicio: RuteoService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(RuteoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('calcular', () => {
    it('convierte la ruta a kilómetros, minutos y puntos de Leaflet', () => {
      // Arrange
      const origen = ORIGEN;
      const destino = DESTINO;

      // Act
      let kilometros = 0;
      let minutos = 0;
      let puntos: [number, number][] = [];
      servicio.calcular(origen, destino).subscribe((ruta) => {
        kilometros = ruta?.kilometros ?? 0;
        minutos = ruta?.minutos ?? 0;
        puntos = ruta?.puntos ?? [];
      });

      // Assert
      const peticion = http.expectOne((r) => r.url.startsWith(URL_OSRM));
      peticion.flush(respuestaOk());
      expect(kilometros).toBe(150);
      expect(minutos).toBe(120);
      expect(puntos[0]).toEqual([14.8347, -91.5181]);
    });

    it('guarda la ruta en memoria y no repite la petición', () => {
      // Arrange
      servicio.calcular(ORIGEN, DESTINO).subscribe();
      http.expectOne((r) => r.url.startsWith(URL_OSRM)).flush(respuestaOk());

      // Act
      let kilometros = 0;
      servicio.calcular(ORIGEN, DESTINO).subscribe((ruta) => (kilometros = ruta?.kilometros ?? 0));

      // Assert
      http.expectNone((r) => r.url.startsWith(URL_OSRM));
      expect(kilometros).toBe(150);
    });

    it('comparte la petición mientras está en curso', () => {
      // Arrange
      let primera = 0;
      let segunda = 0;

      // Act
      servicio.calcular(ORIGEN, DESTINO).subscribe((ruta) => (primera = ruta?.kilometros ?? 0));
      servicio.calcular(ORIGEN, DESTINO).subscribe((ruta) => (segunda = ruta?.kilometros ?? 0));

      // Assert
      http.expectOne((r) => r.url.startsWith(URL_OSRM)).flush(respuestaOk());
      expect(primera).toBe(150);
      expect(segunda).toBe(150);
    });

    it('devuelve null cuando el servicio responde con error', () => {
      // Arrange
      let resultado: unknown = 'pendiente';

      // Act
      servicio.calcular(ORIGEN, DESTINO).subscribe((ruta) => (resultado = ruta));

      // Assert
      http.expectOne((r) => r.url.startsWith(URL_OSRM)).flush(null, { status: 500, statusText: 'Error' });
      expect(resultado).toBeNull();
    });

    it('devuelve null cuando el código no es Ok', () => {
      // Arrange
      let resultado: unknown = 'pendiente';

      // Act
      servicio.calcular(ORIGEN, DESTINO).subscribe((ruta) => (resultado = ruta));

      // Assert
      http.expectOne((r) => r.url.startsWith(URL_OSRM)).flush({ code: 'NoRoute', routes: [] });
      expect(resultado).toBeNull();
    });

    it('devuelve null cuando la distancia es cero', () => {
      // Arrange
      const respuesta = respuestaOk() as { routes: Array<{ distance: number }> };
      respuesta.routes[0].distance = 0;
      let resultado: unknown = 'pendiente';

      // Act
      servicio.calcular(ORIGEN, DESTINO).subscribe((ruta) => (resultado = ruta));

      // Assert
      http.expectOne((r) => r.url.startsWith(URL_OSRM)).flush(respuesta);
      expect(resultado).toBeNull();
    });
  });
});
