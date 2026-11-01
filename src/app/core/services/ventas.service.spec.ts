import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NuevaVentaEnLinea, NuevaVentaMostrador } from '../models/venta.model';
import { VentasService } from './ventas.service';

/**
 * Pruebas unitarias de VentasService.
 * Regla: cada operación usa su ruta, su método HTTP y envía solo los filtros con valor.
 */

const URL_VENTAS = `${environment.apiUrl}/sales/ventas`;
const URL_HISTORIAL = `${environment.apiUrl}/sales/historial`;
const VENTA_ID = 'venta-1';
const VIAJE_ID = 'viaje-1';
const CODIGO = 'A1B2C3D4E5F6';
const NIT = '1234567-8';
const FECHA = '2026-10-31T10:00:00-06:00';

const NUEVA_EN_LINEA: NuevaVentaEnLinea = {
  viajeId: VIAJE_ID,
  asientos: [1, 2],
  fechaPago: FECHA,
};

const NUEVA_MOSTRADOR: NuevaVentaMostrador = {
  viajeId: VIAJE_ID,
  asientos: [3],
  clienteNit: NIT,
  clienteNombre: 'Ana Pérez',
  clienteCorreo: 'ana@pruebas.gt',
  fechaPago: FECHA,
};

describe('VentasService', () => {
  let servicio: VentasService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(VentasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('venderEnLinea', () => {
    it('envía la compra a la ruta en línea', () => {
      // Arrange
      const datos = NUEVA_EN_LINEA;

      // Act
      servicio.venderEnLinea(datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VENTAS}/en-linea`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ ventaId: VENTA_ID, estado: 'PENDIENTE_PAGO' });
    });
  });

  describe('venderEnMostrador', () => {
    it('envía la venta presencial a la ruta de mostrador', () => {
      // Arrange
      const datos = NUEVA_MOSTRADOR;

      // Act
      servicio.venderEnMostrador(datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VENTAS}/mostrador`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ ventaId: VENTA_ID, estado: 'CONFIRMADA' });
    });
  });

  describe('detalle', () => {
    it('consulta una venta por su id', () => {
      // Arrange
      const id = VENTA_ID;

      // Act
      servicio.detalle(id).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VENTAS}/${id}`);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ ventaId: id });
    });
  });

  describe('listar', () => {
    it('agrega solo los filtros que tienen valor', () => {
      // Arrange
      const filtro = { estado: 'CONFIRMADA' as const, canal: 'EN_LINEA' as const, desde: null };

      // Act
      servicio.listar(filtro).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_VENTAS);
      expect(peticion.request.params.get('estado')).toBe('CONFIRMADA');
      expect(peticion.request.params.get('canal')).toBe('EN_LINEA');
      expect(peticion.request.params.has('desde')).toBeFalse();
      peticion.flush([]);
    });

    it('no envía parámetros cuando el filtro está vacío', () => {
      // Arrange
      const filtro = {};

      // Act
      servicio.listar(filtro).subscribe();

      // Assert
      const peticion = http.expectOne(URL_VENTAS);
      expect(peticion.request.params.keys().length).toBe(0);
      peticion.flush([]);
    });
  });

  describe('cancelar y reembolsar', () => {
    it('cancela una venta con su motivo, fecha y versión', () => {
      // Arrange
      const id = VENTA_ID;
      const datos = { motivo: 'Cancelación del cliente', fechaCancelacion: FECHA, version: 2 };

      // Act
      servicio.cancelar(id, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VENTAS}/${id}/cancelar`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ ventaId: id });
    });

    it('reembolsa una venta cancelada', () => {
      // Arrange
      const id = VENTA_ID;
      const datos = { version: 3 };

      // Act
      servicio.reembolsar(id, datos).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_VENTAS}/${id}/reembolsar`);
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ ventaId: id });
    });
  });

  describe('búsquedas', () => {
    it('busca la venta del boleto por su código', () => {
      // Arrange
      const codigo = CODIGO;

      // Act
      servicio.buscarPorCodigo(codigo).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_VENTAS}/boleto`);
      expect(peticion.request.params.get('codigo')).toBe(CODIGO);
      peticion.flush([]);
    });

    it('consulta el historial del cliente del token', () => {
      // Arrange
      const ruta = `${URL_HISTORIAL}/mio`;

      // Act
      servicio.miHistorial().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ nit: NIT, ventas: [], alquileres: [] });
    });

    it('consulta el historial de un NIT', () => {
      // Arrange
      const nit = NIT;

      // Act
      servicio.historialPorNit(nit).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_HISTORIAL);
      expect(peticion.request.params.get('nit')).toBe(NIT);
      peticion.flush({ nit: NIT, ventas: [], alquileres: [] });
    });
  });
});
