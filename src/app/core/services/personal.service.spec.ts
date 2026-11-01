import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PersonalService } from './personal.service';

/**
 * Pruebas unitarias de PersonalService.
 * Regla: el personal pertenece a una sucursal y se retira, reintegra o traslada con su versión.
 */

const API = `${environment.apiUrl}/fleet`;
const SUCURSAL_ID = 'sucursal-1';
const PERSONAL_ID = 'personal-1';
const FECHA = '2026-10-31';
const VERSION = 2;
const ROL = 'CAJERO' as const;

describe('PersonalService', () => {
  let servicio: PersonalService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PersonalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listar', () => {
    it('envía el rol y el estado activo', () => {
      // Arrange
      const rol = ROL;
      const activo = true;

      // Act
      servicio.listar(SUCURSAL_ID, rol, activo).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${API}/sucursales/${SUCURSAL_ID}/personal`);
      expect(peticion.request.params.get('rol')).toBe(ROL);
      expect(peticion.request.params.get('activo')).toBe('true');
      peticion.flush([]);
    });

    it('no envía filtros cuando no se indican', () => {
      // Arrange
      const ruta = `${API}/sucursales/${SUCURSAL_ID}/personal`;

      // Act
      servicio.listar(SUCURSAL_ID).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.keys().length).toBe(0);
      peticion.flush([]);
    });
  });

  describe('agregar', () => {
    it('agrega a una persona a la sucursal', () => {
      // Arrange
      const datos = { rol: ROL, fechaAsignacion: FECHA };

      // Act
      servicio.agregar(SUCURSAL_ID, datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/sucursales/${SUCURSAL_ID}/personal`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ personalId: PERSONAL_ID });
    });
  });

  describe('desactivar', () => {
    it('retira a la persona de la sucursal', () => {
      // Arrange
      const fechaDesasignacion = FECHA;
      const version = VERSION;

      // Act
      servicio.desactivar(PERSONAL_ID, fechaDesasignacion, version).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/personal/${PERSONAL_ID}/desactivar`);
      expect(peticion.request.method).toBe('PATCH');
      expect(peticion.request.body).toEqual({ fechaDesasignacion, version });
      peticion.flush({ personalId: PERSONAL_ID });
    });
  });

  describe('reintegrar', () => {
    it('vuelve a asignar a la persona con su cuenta', () => {
      // Arrange
      const datos = { sucursalId: SUCURSAL_ID, rol: ROL, fechaAsignacion: FECHA };

      // Act
      servicio.reintegrar(PERSONAL_ID, SUCURSAL_ID, ROL, FECHA).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/personal/${PERSONAL_ID}/reintegro`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ personalId: PERSONAL_ID });
    });
  });

  describe('trasladar', () => {
    it('mueve a la persona a otra sucursal', () => {
      // Arrange
      const datos = { sucursalDestinoId: 'sucursal-2', fechaTraslado: FECHA, version: VERSION };

      // Act
      servicio.trasladar(PERSONAL_ID, 'sucursal-2', FECHA, VERSION).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/personal/${PERSONAL_ID}/traslado`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ personalId: PERSONAL_ID });
    });
  });
});
