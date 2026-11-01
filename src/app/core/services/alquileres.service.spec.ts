import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NuevoAlquiler } from '../models/viaje.model';
import { AlquileresService } from './alquileres.service';

/**
 * Pruebas unitarias de AlquileresService.
 * Regla: la solicitud la crea el cliente o el cajero; cotizar y asignar es del administrador.
 */

const URL_ALQUILERES = `${environment.apiUrl}/trips/alquileres`;
const URL_CONFIG = `${environment.apiUrl}/trips/configuracion-alquiler`;
const ALQUILER_ID = 'alquiler-1';
const SUCURSAL_ID = 'sucursal-1';
const BUS_ID = 'bus-1';
const CHOFER_ID = 'chofer-1';
const FECHA_SALIDA = '2026-11-01T08:00:00-06:00';
const FECHA_LLEGADA = '2026-11-01T12:00:00-06:00';
const CUANDO = '2026-10-31T10:00:00-06:00';
const NIT = '1234567-8';

const NUEVO_ALQUILER: NuevoAlquiler = {
  sucursalId: SUCURSAL_ID,
  clienteNit: NIT,
  clienteNombre: 'Ana Pérez',
  origen: 'Xela',
  destino: 'Guate',
  fechaSalida: FECHA_SALIDA,
  cantidadPasajeros: 40,
  kmEstimados: 210,
  fechaSolicitud: '2026-10-31',
};

describe('AlquileresService', () => {
  let servicio: AlquileresService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AlquileresService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('solicitar', () => {
    it('envía la solicitud de alquiler', () => {
      // Arrange
      const datos = NUEVO_ALQUILER;

      // Act
      servicio.solicitar(datos).subscribe();

      // Assert
      const peticion = http.expectOne(URL_ALQUILERES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ alquilerId: ALQUILER_ID });
    });
  });

  describe('mios', () => {
    it('consulta los alquileres del cliente del token', () => {
      // Arrange
      const ruta = `${URL_ALQUILERES}/mios`;

      // Act
      servicio.mios().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush([]);
    });
  });

  describe('listar', () => {
    it('envía los filtros con valor', () => {
      // Arrange
      const filtro = { sucursalId: SUCURSAL_ID, estado: 'PAGADO' as const, desde: null };

      // Act
      servicio.listar(filtro).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_ALQUILERES);
      expect(peticion.request.params.get('sucursalId')).toBe(SUCURSAL_ID);
      expect(peticion.request.params.get('estado')).toBe('PAGADO');
      expect(peticion.request.params.has('desde')).toBeFalse();
      peticion.flush([]);
    });

    it('lista todos los alquileres cuando no se especifican filtros', () => {
      // Arrange
      const filtros = undefined;

      // Act
      servicio.listar(filtros).subscribe();

      // Assert
      const peticion = http.expectOne(URL_ALQUILERES);
      expect(peticion.request.method).toBe('GET');
      expect(peticion.request.params.keys()).toEqual([]);
      peticion.flush([]);
    });
  });

  describe('detalle', () => {
    it('consulta un alquiler por su id', () => {
      // Arrange
      const ruta = `${URL_ALQUILERES}/${ALQUILER_ID}`;

      // Act
      servicio.detalle(ALQUILER_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ alquilerId: ALQUILER_ID });
    });
  });

  describe('cotizar', () => {
    it('confirma el precio con la versión del alquiler', () => {
      // Arrange
      const datos = { precioConfirmado: 9500, version: 2 };

      // Act
      servicio.cotizar(ALQUILER_ID, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_ALQUILERES}/${ALQUILER_ID}/cotizacion`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ alquilerId: ALQUILER_ID });
    });
  });

  describe('cancelar', () => {
    it('cancela el alquiler con motivo, fecha y versión', () => {
      // Arrange
      const datos = { motivo: 'El cliente cambió de planes', fechaHoraCancelacion: CUANDO, version: 3 };

      // Act
      servicio.cancelar(ALQUILER_ID, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_ALQUILERES}/${ALQUILER_ID}/cancelar`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ alquilerId: ALQUILER_ID });
    });
  });

  describe('politicaCancelacion', () => {
    it('consulta la política en un momento concreto', () => {
      // Arrange
      const cuando = CUANDO;

      // Act
      servicio.politicaCancelacion(ALQUILER_ID, cuando).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_ALQUILERES}/${ALQUILER_ID}/politica-cancelacion`);
      expect(peticion.request.params.get('cuando')).toBe(CUANDO);
      peticion.flush({ permiteCancelacion: true });
    });

    it('consulta la política sin fecha', () => {
      // Arrange
      const ruta = `${URL_ALQUILERES}/${ALQUILER_ID}/politica-cancelacion`;

      // Act
      servicio.politicaCancelacion(ALQUILER_ID).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.has('cuando')).toBeFalse();
      peticion.flush({ permiteCancelacion: true });
    });
  });

  describe('asignar', () => {
    it('asigna bus y piloto al alquiler pagado', () => {
      // Arrange
      const datos = { busId: BUS_ID, choferId: CHOFER_ID, fechaLlegadaEstimada: FECHA_LLEGADA, version: 4 };

      // Act
      servicio.asignar(ALQUILER_ID, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_ALQUILERES}/${ALQUILER_ID}/asignacion`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ viajeId: 'viaje-1' });
    });
  });

  describe('precio por kilómetro', () => {
    it('consulta el historial de precios', () => {
      // Arrange
      const ruta = URL_CONFIG;

      // Act
      servicio.historialPrecio().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush([]);
    });

    it('registra un precio nuevo desde una fecha', () => {
      // Arrange
      const datos = { precioPorKm: 12.5, vigenteDesde: '2026-11-01' };

      // Act
      servicio.registrarPrecio(datos).subscribe();

      // Assert
      const peticion = http.expectOne(URL_CONFIG);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ precioPorKm: 12.5 });
    });
  });
});
