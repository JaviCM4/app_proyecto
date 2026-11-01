import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { BusesService } from './buses.service';

/**
 * Pruebas unitarias de BusesService.
 * Regla: la foto se sube como FormData y el estado se cambia con la versión del registro.
 */

const URL_BUSES = `${environment.apiUrl}/fleet/buses`;
const URL_ARCHIVOS = `${environment.apiUrl}/fleet/archivos`;
const BUS_ID = 'bus-1';
const SUCURSAL_ID = 'sucursal-1';
const PLACA = 'M-123ABC';
const FECHA = '2026-10-31';
const VERSION = 2;
const ESTADO = 'EN_TALLER' as const;
const FOTO = new File(['foto'], 'bus.png', { type: 'image/png' });

describe('BusesService', () => {
  let servicio: BusesService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(BusesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listar', () => {
    it('envía la sucursal y el estado cuando se indican', () => {
      // Arrange
      const sucursalId = SUCURSAL_ID;
      const estado = 'ACTIVO';

      // Act
      servicio.listar(sucursalId, estado).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_BUSES);
      expect(peticion.request.params.get('sucursalId')).toBe(SUCURSAL_ID);
      expect(peticion.request.params.get('estado')).toBe(estado);
      peticion.flush([]);
    });

    it('no envía filtros vacíos', () => {
      // Arrange
      const ruta = URL_BUSES;

      // Act
      servicio.listar(null, null).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.keys().length).toBe(0);
      peticion.flush([]);
    });
  });

  describe('detalle', () => {
    it('consulta un bus por su id', () => {
      // Arrange
      const ruta = `${URL_BUSES}/${BUS_ID}`;

      // Act
      servicio.detalle(BUS_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ busId: BUS_ID });
    });
  });

  describe('crear y actualizar', () => {
    it('registra un bus nuevo', () => {
      // Arrange
      const datos = { placa: PLACA, marca: 'Mercedes', modelo: 'Sprinter', anio: 2020, capacidad: 40, fotoUrl: 'x' };

      // Act
      servicio.crear(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(URL_BUSES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ busId: BUS_ID });
    });

    it('actualiza los datos del bus con su versión', () => {
      // Arrange
      const datos = { marca: 'Mercedes', modelo: 'Sprinter', anio: 2021, capacidad: 42, version: VERSION };

      // Act
      servicio.actualizar(BUS_ID, datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_BUSES}/${BUS_ID}`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ busId: BUS_ID });
    });
  });

  describe('cambiarEstado', () => {
    it('cambia el estado con la fecha y la versión', () => {
      // Arrange
      const estado = ESTADO;
      const fecha = FECHA;
      const version = VERSION;

      // Act
      servicio.cambiarEstado(BUS_ID, estado, fecha, version).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_BUSES}/${BUS_ID}/estado`);
      expect(peticion.request.method).toBe('PATCH');
      expect(peticion.request.body).toEqual({ estado, fecha, version });
      peticion.flush({ busId: BUS_ID });
    });
  });

  describe('bitacora', () => {
    it('consulta la bitácora con el rango de fechas', () => {
      // Arrange
      const desde = '2026-10-01';
      const hasta = '2026-10-31';

      // Act
      servicio.bitacora(BUS_ID, desde, hasta).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_BUSES}/${BUS_ID}/bitacora`);
      expect(peticion.request.params.get('desde')).toBe(desde);
      expect(peticion.request.params.get('hasta')).toBe(hasta);
      peticion.flush([]);
    });

    it('consulta la bitácora sin fechas', () => {
      // Arrange
      const ruta = `${URL_BUSES}/${BUS_ID}/bitacora`;

      // Act
      servicio.bitacora(BUS_ID).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.keys().length).toBe(0);
      peticion.flush([]);
    });
  });

  describe('subirFoto', () => {
    it('sube la foto como FormData con el tipo de archivo', () => {
      // Arrange
      const tipo = 'BUS' as const;
      const archivo = FOTO;

      // Act
      servicio.subirFoto(tipo, archivo).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_ARCHIVOS}/fotos`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.params.get('tipo')).toBe(tipo);
      expect(peticion.request.body instanceof FormData).toBeTrue();
      peticion.flush({ fotoUrl: 'https://fotos/bus.png' });
    });
  });
});
