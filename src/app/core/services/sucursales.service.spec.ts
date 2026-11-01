import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SucursalesService } from './sucursales.service';

/**
 * Pruebas unitarias de SucursalesService.
 * Regla: el listado es público y acepta el filtro de activas; el resto exige sesión.
 */

const URL_SUCURSALES = `${environment.apiUrl}/fleet/sucursales`;
const SUCURSAL_ID = 'sucursal-1';
const CODIGO = 'XELA';
const VERSION = 2;

describe('SucursalesService', () => {
  let servicio: SucursalesService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(SucursalesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listar', () => {
    it('lista todas las sucursales cuando no se indica estado', () => {
      // Arrange
      const ruta = URL_SUCURSALES;

      // Act
      servicio.listar().subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.has('activa')).toBeFalse();
      peticion.flush([]);
    });

    it('filtra por sucursales activas', () => {
      // Arrange
      const activa = true;

      // Act
      servicio.listar(activa).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_SUCURSALES);
      expect(peticion.request.params.get('activa')).toBe('true');
      peticion.flush([]);
    });

    it('filtra por sucursales inactivas', () => {
      // Arrange
      const activa = false;

      // Act
      servicio.listar(activa).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_SUCURSALES);
      expect(peticion.request.params.get('activa')).toBe('false');
      peticion.flush([]);
    });
  });

  describe('obtener', () => {
    it('consulta una sucursal por su id', () => {
      // Arrange
      const ruta = `${URL_SUCURSALES}/${SUCURSAL_ID}`;

      // Act
      servicio.obtener(SUCURSAL_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ sucursalId: SUCURSAL_ID });
    });
  });

  describe('crear', () => {
    it('envía los datos de la sucursal y de su administrador', () => {
      // Arrange
      const datos = { codigo: CODIGO, nombre: 'Quetzaltenango' };

      // Act
      servicio.crear(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(URL_SUCURSALES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ sucursalId: SUCURSAL_ID });
    });
  });

  describe('actualizar', () => {
    it('actualiza los datos de la sucursal', () => {
      // Arrange
      const datos = { nombre: 'Quetzaltenango', version: VERSION };

      // Act
      servicio.actualizar(SUCURSAL_ID, datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_SUCURSALES}/${SUCURSAL_ID}`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ sucursalId: SUCURSAL_ID });
    });
  });

  describe('cambiarEstado', () => {
    it('activa o desactiva la sucursal con su versión', () => {
      // Arrange
      const activa = false;
      const version = VERSION;

      // Act
      servicio.cambiarEstado(SUCURSAL_ID, activa, version).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_SUCURSALES}/${SUCURSAL_ID}/estado`);
      expect(peticion.request.method).toBe('PATCH');
      expect(peticion.request.body).toEqual({ activa, version });
      peticion.flush({ sucursalId: SUCURSAL_ID });
    });
  });
});
