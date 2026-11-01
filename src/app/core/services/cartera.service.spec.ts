import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CarteraService } from './cartera.service';

/**
 * Pruebas unitarias de CarteraService.
 * Regla: los movimientos siempre se piden con un tamaño grande y fechas opcionales.
 */

const URL_CARTERA = `${environment.apiUrl}/wallet/cartera`;
const MONTO = 250.5;
const FECHA = '2026-10-31';
const DESDE = '2026-10-01';
const HASTA = '2026-10-31';
const TAMANO_MOVIMIENTOS = '2000';

describe('CarteraService', () => {
  let servicio: CarteraService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CarteraService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('consultar', () => {
    it('consulta el saldo de la cartera', () => {
      // Arrange
      const ruta = URL_CARTERA;

      // Act
      servicio.consultar().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ saldo: 100 });
    });
  });

  describe('recargar', () => {
    it('envía el monto y la fecha de la recarga', () => {
      // Arrange
      const monto = MONTO;
      const fecha = FECHA;

      // Act
      servicio.recargar(monto, fecha).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_CARTERA}/recargas`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ monto, fechaMovimiento: fecha });
      peticion.flush({ monto });
    });
  });

  describe('movimientos', () => {
    it('pide los movimientos con el tamaño máximo y el rango de fechas', () => {
      // Arrange
      const desde = DESDE;
      const hasta = HASTA;

      // Act
      servicio.movimientos(desde, hasta).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_CARTERA}/movimientos`);
      expect(peticion.request.params.get('size')).toBe(TAMANO_MOVIMIENTOS);
      expect(peticion.request.params.get('desde')).toBe(DESDE);
      expect(peticion.request.params.get('hasta')).toBe(HASTA);
      peticion.flush([]);
    });

    it('omite las fechas que no se indican', () => {
      // Arrange
      const ruta = `${URL_CARTERA}/movimientos`;

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
