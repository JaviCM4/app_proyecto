import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TarifasReembolsoService } from './tarifas-reembolso.service';

/**
 * Pruebas unitarias de TarifasReembolsoService.
 * Regla: el porcentaje devuelto depende del estado del alquiler y de las horas antes de la salida.
 */

const URL_TARIFAS = `${environment.apiUrl}/sales/tarifas-reembolso`;
const TARIFA_ID = 'tarifa-1';
const HORAS_CON_DECIMALES = 35.9;
const HORAS_ENTERAS = '35';

describe('TarifasReembolsoService', () => {
  let servicio: TarifasReembolsoService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(TarifasReembolsoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listar', () => {
    it('consulta todas las reglas de reembolso', () => {
      // Arrange
      const ruta = URL_TARIFAS;

      // Act
      servicio.listar().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush([]);
    });
  });

  describe('aplicable', () => {
    it('consulta la regla con el estado y las horas enteras', () => {
      // Arrange
      const estado = 'PAGADO' as const;

      // Act
      servicio.aplicable(estado, HORAS_CON_DECIMALES).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_TARIFAS}/aplicable`);
      expect(peticion.request.params.get('estado')).toBe(estado);
      expect(peticion.request.params.get('horasAntes')).toBe(HORAS_ENTERAS);
      peticion.flush({ porcentajeReembolso: 50 });
    });
  });

  describe('crear', () => {
    it('registra una regla nueva', () => {
      // Arrange
      const datos = { estado: 'PAGADO', horasAntes: 48, porcentajeReembolso: 80 };

      // Act
      servicio.crear(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(URL_TARIFAS);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ tarifaId: TARIFA_ID });
    });
  });

  describe('actualizar', () => {
    it('actualiza el porcentaje de una regla', () => {
      // Arrange
      const datos = { porcentajeReembolso: 70, version: 2 };

      // Act
      servicio.actualizar(TARIFA_ID, datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_TARIFAS}/${TARIFA_ID}`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ tarifaId: TARIFA_ID });
    });
  });
});
