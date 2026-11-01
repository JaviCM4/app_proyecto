import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TarifasService } from './tarifas.service';

/**
 * Pruebas unitarias de TarifasService.
 * Regla: las tarifas de depreciación no se editan ni se borran, solo se consultan y se crean.
 */

const URL_TARIFAS = `${environment.apiUrl}/identity/tarifas-depreciacion`;
const MONTO_POR_KM = 1.25;
const VIGENTE_DESDE = '2026-11-01';
const TAMANO = '2000';

describe('TarifasService', () => {
  let servicio: TarifasService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(TarifasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listar', () => {
    it('pide el historial completo en una sola página', () => {
      // Arrange
      const ruta = URL_TARIFAS;

      // Act
      servicio.listar().subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.get('size')).toBe(TAMANO);
      peticion.flush([]);
    });
  });

  describe('vigenteEn', () => {
    it('consulta la tarifa vigente en una fecha', () => {
      // Arrange
      const fecha = VIGENTE_DESDE;

      // Act
      servicio.vigenteEn(fecha).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_TARIFAS);
      expect(peticion.request.params.get('vigenteEn')).toBe(VIGENTE_DESDE);
      peticion.flush({ montoPorKm: MONTO_POR_KM });
    });
  });

  describe('crear', () => {
    it('registra el monto por kilómetro y su fecha de vigencia', () => {
      // Arrange
      const montoPorKm = MONTO_POR_KM;
      const vigenteDesde = VIGENTE_DESDE;

      // Act
      servicio.crear(montoPorKm, vigenteDesde).subscribe();

      // Assert
      const peticion = http.expectOne(URL_TARIFAS);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ montoPorKm, vigenteDesde });
      peticion.flush({ montoPorKm, vigenteDesde });
    });
  });
});
