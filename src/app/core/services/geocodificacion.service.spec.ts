import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GeocodificacionService, seisDecimales } from './geocodificacion.service';

/**
 * Pruebas unitarias de GeocodificacionService.
 * Regla: la búsqueda de lugares es opcional; si Photon falla, el usuario escribe a mano.
 */

const URL_PHOTON = 'https://photon.komoot.io';
const TEXTO_CORTO = 'Xe';
const TEXTO_BUSQUEDA = '  Quetzaltenango  ';
const CONSULTA_LIMPIA = 'Quetzaltenango';
const LATITUD = 14.834712345;
const LONGITUD = -91.518112345;
const LATITUD_REDONDEADA = 14.834712;
const LONGITUD_REDONDEADA = -91.518112;

function caracteristica(propiedades: Record<string, string | undefined>): unknown {
  return {
    geometry: { coordinates: [LONGITUD, LATITUD] },
    properties: propiedades,
  };
}

describe('GeocodificacionService', () => {
  let servicio: GeocodificacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(GeocodificacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('seisDecimales', () => {
    it('recorta la coordenada a seis decimales', () => {
      // Arrange
      const valor = LATITUD;

      // Act
      const resultado = seisDecimales(valor);

      // Assert
      expect(resultado).toBe(LATITUD_REDONDEADA);
    });
  });

  describe('buscar', () => {
    it('devuelve una lista vacía sin llamar al servicio cuando el texto es corto', () => {
      // Arrange
      const texto = TEXTO_CORTO;

      // Act
      let resultado: unknown[] = ['pendiente'];
      servicio.buscar(texto).subscribe((lugares) => (resultado = lugares));

      // Assert
      http.expectNone((r) => r.url.startsWith(URL_PHOTON));
      expect(resultado).toEqual([]);
    });

    it('busca lugares dentro de Guatemala', () => {
      // Arrange
      const texto = TEXTO_BUSQUEDA;

      // Act
      servicio.buscar(texto).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_PHOTON}/api`);
      expect(peticion.request.params.get('q')).toBe(CONSULTA_LIMPIA);
      expect(peticion.request.params.get('limit')).toBe('6');
      expect(peticion.request.params.get('bbox')).toBe('-92.6,13.4,-88.0,18.1');
      peticion.flush({ features: [] });
    });

    it('arma el nombre con el lugar y la ciudad', () => {
      // Arrange
      let nombre = '';
      let latitud = 0;

      // Act
      servicio.buscar(CONSULTA_LIMPIA).subscribe((lugares) => {
        nombre = lugares[0]?.nombre ?? '';
        latitud = lugares[0]?.latitud ?? 0;
      });

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/api`).flush({
        features: [caracteristica({ name: 'Parque Central', city: 'Quetzaltenango' })],
      });
      expect(nombre).toBe('Parque Central, Quetzaltenango');
      expect(latitud).toBe(LATITUD_REDONDEADA);
    });

    it('usa la calle cuando no hay nombre', () => {
      // Arrange
      let nombre = '';

      // Act
      servicio.buscar(CONSULTA_LIMPIA).subscribe((lugares) => (nombre = lugares[0]?.nombre ?? ''));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/api`).flush({
        features: [caracteristica({ street: 'Calle Real', county: 'Quetzaltenango' })],
      });
      expect(nombre).toBe('Calle Real, Quetzaltenango');
    });

    it('usa el número de casa cuando no hay nombre ni calle', () => {
      // Arrange
      let nombre = '';

      // Act
      servicio.buscar(CONSULTA_LIMPIA).subscribe((lugares) => (nombre = lugares[0]?.nombre ?? ''));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/api`).flush({
        features: [caracteristica({ housenumber: '12', state: 'Quetzaltenango' })],
      });
      expect(nombre).toBe('#12, Quetzaltenango');
    });

    it('devuelve una lista vacía cuando el servicio falla', () => {
      // Arrange
      let resultado: unknown[] = ['pendiente'];

      // Act
      servicio.buscar(CONSULTA_LIMPIA).subscribe((lugares) => (resultado = lugares));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/api`).flush(null, { status: 500, statusText: 'Error' });
      expect(resultado).toEqual([]);
    });

    it('devuelve una lista vacía si la respuesta no incluye características', () => {
      // Arrange
      let resultado: unknown[] = ['pendiente'];

      // Act
      servicio.buscar(CONSULTA_LIMPIA).subscribe((lugares) => (resultado = lugares));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/api`).flush({});
      expect(resultado).toEqual([]);
    });

    it('usa una etiqueta de respaldo si el lugar no incluye propiedades', () => {
      // Arrange
      let nombre = '';

      // Act
      servicio.buscar(CONSULTA_LIMPIA).subscribe((lugares) => (nombre = lugares[0]?.nombre ?? ''));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/api`).flush({
        features: [{ geometry: { coordinates: [LONGITUD, LATITUD] }, properties: {} }],
      });
      expect(nombre).toBe('Lugar sin nombre');
    });

    it('usa una etiqueta de respaldo cuando las propiedades son nulas', () => {
      // Arrange
      let nombre = '';

      // Act
      servicio.buscar(CONSULTA_LIMPIA).subscribe((lugares) => (nombre = lugares[0]?.nombre ?? ''));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/api`).flush({
        features: [{ geometry: { coordinates: [LONGITUD, LATITUD] }, properties: null }],
      });
      expect(nombre).toBe('Lugar sin nombre');
    });
  });

  describe('reversa', () => {
    it('devuelve el nombre del lugar más cercano', () => {
      // Arrange
      let nombre: string | null = 'pendiente';

      // Act
      servicio.reversa(LATITUD, LONGITUD).subscribe((lugar) => (nombre = lugar));

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_PHOTON}/reverse`);
      expect(peticion.request.params.get('lat')).toBe(String(LATITUD));
      expect(peticion.request.params.get('lon')).toBe(String(LONGITUD));
      peticion.flush({ features: [caracteristica({ name: 'Parque Central', city: 'Quetzaltenango' })] });
      expect(nombre).toBe('Parque Central, Quetzaltenango');
    });

    it('devuelve null cuando no hay resultados', () => {
      // Arrange
      let nombre: string | null = 'pendiente';

      // Act
      servicio.reversa(LATITUD, LONGITUD).subscribe((lugar) => (nombre = lugar));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/reverse`).flush({ features: [] });
      expect(nombre).toBeNull();
    });

    it('devuelve null si la respuesta no incluye características', () => {
      // Arrange
      let nombre: string | null = 'pendiente';

      // Act
      servicio.reversa(LATITUD, LONGITUD).subscribe((lugar) => (nombre = lugar));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/reverse`).flush({});
      expect(nombre).toBeNull();
    });

    it('devuelve null cuando el servicio falla', () => {
      // Arrange
      let nombre: string | null = 'pendiente';

      // Act
      servicio.reversa(LATITUD, LONGITUD).subscribe((lugar) => (nombre = lugar));

      // Assert
      http.expectOne((r) => r.url === `${URL_PHOTON}/reverse`).flush(null, { status: 500, statusText: 'Error' });
      expect(nombre).toBeNull();
    });
  });
});
