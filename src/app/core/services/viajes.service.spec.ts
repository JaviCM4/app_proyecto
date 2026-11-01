import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NuevoViaje, RegistrarLlegada, RegistrarSalida } from '../models/viaje.model';
import { ViajesService } from './viajes.service';

/**
 * Pruebas unitarias de ViajesService.
 * Regla: rutas y viajes viven en Trips; el mapa de asientos lo entrega Sales.
 */

const API = environment.apiUrl;
const URL_VIAJES = `${API}/trips/viajes`;
const URL_RUTAS = `${API}/trips/rutas`;
const VIAJE_ID = 'viaje-1';
const RUTA_ID = 'ruta-1';
const BUS_ID = 'bus-1';
const CHOFER_ID = 'chofer-1';
const FECHA_SALIDA = '2026-10-31T08:00:00-06:00';
const FECHA_LLEGADA = '2026-10-31T12:00:00-06:00';
const MOTIVO = 'Viaje cancelado por lluvia';

const NUEVO_VIAJE: NuevoViaje = {
  rutaId: RUTA_ID,
  busId: BUS_ID,
  choferId: CHOFER_ID,
  fechaSalidaProgramada: FECHA_SALIDA,
  fechaLlegadaEstimada: FECHA_LLEGADA,
};

const SALIDA: RegistrarSalida = { fechaHoraSalida: FECHA_SALIDA, kmInicial: 1000 };
const LLEGADA: RegistrarLlegada = { fechaHoraLlegada: FECHA_LLEGADA, kmFinal: 1200, costoCombustible: 350 };

describe('ViajesService', () => {
  let servicio: ViajesService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ViajesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('buscar', () => {
    it('envía los filtros que tienen valor', () => {
      // Arrange
      const filtro = { sucursalId: 'sucursal-1', estado: 'PROGRAMADO' as const, desde: '' };

      // Act
      servicio.buscar(filtro).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_VIAJES);
      expect(peticion.request.params.get('sucursalId')).toBe('sucursal-1');
      expect(peticion.request.params.get('estado')).toBe('PROGRAMADO');
      expect(peticion.request.params.has('desde')).toBeFalse();
      peticion.flush([]);
    });
  });

  describe('mios', () => {
    it('consulta los viajes del piloto del token', () => {
      // Arrange
      const ruta = `${URL_VIAJES}/mios`;

      // Act
      servicio.mios({ estado: 'EN_RUTA' }).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.get('estado')).toBe('EN_RUTA');
      peticion.flush([]);
    });
  });

  describe('rutas', () => {
    it('pide solo las rutas activas por defecto', () => {
      // Arrange
      const ruta = URL_RUTAS;

      // Act
      servicio.rutas().subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.get('activa')).toBe('true');
      peticion.flush([]);
    });

    it('puede pedir las rutas inactivas', () => {
      // Arrange
      const ruta = URL_RUTAS;

      // Act
      servicio.rutas(false).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.get('activa')).toBe('false');
      peticion.flush([]);
    });

    it('crea una ruta', () => {
      // Arrange
      const datos = { sucursalOrigenId: 'origen-1', sucursalDestinoId: 'destino-1', distanciaKm: 120, precioBoleto: 45 };

      // Act
      servicio.crearRuta(datos).subscribe();

      // Assert
      const peticion = http.expectOne(URL_RUTAS);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ rutaId: RUTA_ID });
    });

    it('actualiza una ruta con su versión', () => {
      // Arrange
      const datos = { distanciaKm: 125, precioBoleto: 50, activa: true, version: 2 };

      // Act
      servicio.actualizarRuta(RUTA_ID, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_RUTAS}/${RUTA_ID}`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ rutaId: RUTA_ID });
    });

    it('elimina una ruta', () => {
      // Arrange
      const ruta = `${URL_RUTAS}/${RUTA_ID}`;

      // Act
      servicio.eliminarRuta(RUTA_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('DELETE');
      peticion.flush(null);
    });
  });

  describe('asientos', () => {
    it('consulta el mapa de asientos del viaje', () => {
      // Arrange
      const ruta = `${API}/sales/viajes/${VIAJE_ID}/asientos`;

      // Act
      servicio.asientos(VIAJE_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ viajeId: VIAJE_ID, asientos: [] });
    });
  });

  describe('viajes regulares', () => {
    it('consulta el detalle de un viaje', () => {
      // Arrange
      const ruta = `${URL_VIAJES}/${VIAJE_ID}`;

      // Act
      servicio.detalleViaje(VIAJE_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ viajeId: VIAJE_ID });
    });

    it('programa un viaje con bus, piloto y horario', () => {
      // Arrange
      const datos = NUEVO_VIAJE;

      // Act
      servicio.programarViaje(datos).subscribe();

      // Assert
      const peticion = http.expectOne(URL_VIAJES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ viajeId: VIAJE_ID });
    });

    it('actualiza un viaje programado', () => {
      // Arrange
      const datos = { ...NUEVO_VIAJE, version: 3 };

      // Act
      servicio.actualizarViaje(VIAJE_ID, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VIAJES}/${VIAJE_ID}`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ viajeId: VIAJE_ID });
    });

    it('elimina un viaje con su motivo', () => {
      // Arrange
      const motivo = MOTIVO;

      // Act
      servicio.eliminarViaje(VIAJE_ID, motivo).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_VIAJES}/${VIAJE_ID}`);
      expect(peticion.request.method).toBe('DELETE');
      expect(peticion.request.params.get('motivo')).toBe(MOTIVO);
      peticion.flush(null);
    });

    it('elimina un viaje sin motivo', () => {
      // Arrange
      const ruta = `${URL_VIAJES}/${VIAJE_ID}`;

      // Act
      servicio.eliminarViaje(VIAJE_ID).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.has('motivo')).toBeFalse();
      peticion.flush(null);
    });

    it('registra la salida del viaje', () => {
      // Arrange
      const datos = SALIDA;

      // Act
      servicio.registrarSalida(VIAJE_ID, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VIAJES}/${VIAJE_ID}/salida`);
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ viajeId: VIAJE_ID });
    });

    it('registra la llegada del viaje', () => {
      // Arrange
      const datos = LLEGADA;

      // Act
      servicio.registrarLlegada(VIAJE_ID, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VIAJES}/${VIAJE_ID}/llegada`);
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ viajeId: VIAJE_ID });
    });
  });
});
