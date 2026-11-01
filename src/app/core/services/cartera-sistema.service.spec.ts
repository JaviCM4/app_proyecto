import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CarteraSistemaService } from './cartera-sistema.service';

/**
 * Pruebas unitarias de CarteraSistemaService.
 * Regla: la billetera del sistema es solo de consulta para el administrador del sistema.
 */

const URL_SISTEMA = `${environment.apiUrl}/wallet/sistema`;
const DESDE = '2026-10-01';
const HASTA = '2026-10-31';
const TAMANO = '2000';

describe('CarteraSistemaService', () => {
  let servicio: CarteraSistemaService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CarteraSistemaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('consultar', () => {
    it('consulta el saldo de la billetera del sistema', () => {
      // Arrange
      const ruta = URL_SISTEMA;

      // Act
      servicio.consultar().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ saldo: 1000 });
    });
  });

  describe('movimientos', () => {
    it('pide los movimientos con el rango de fechas', () => {
      // Arrange
      const desde = DESDE;
      const hasta = HASTA;

      // Act
      servicio.movimientos(desde, hasta).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_SISTEMA}/movimientos`);
      expect(peticion.request.params.get('size')).toBe(TAMANO);
      expect(peticion.request.params.get('desde')).toBe(DESDE);
      expect(peticion.request.params.get('hasta')).toBe(HASTA);
      peticion.flush([]);
    });

    it('omite las fechas que no se indican', () => {
      // Arrange
      const ruta = `${URL_SISTEMA}/movimientos`;

      // Act
      servicio.movimientos().subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.has('desde')).toBeFalse();
      expect(peticion.request.params.has('hasta')).toBeFalse();
      peticion.flush([]);
    });
  });
});
