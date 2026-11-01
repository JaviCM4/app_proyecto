import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { OrdenesAlquilerService } from './ordenes-alquiler.service';

/**
 * Pruebas unitarias de OrdenesAlquilerService.
 * Regla: la orden se paga con cartera (asíncrono) o en efectivo (inmediato).
 */

const URL_ORDENES = `${environment.apiUrl}/sales/ordenes-alquiler`;
const ORDEN_ID = 'orden-1';
const FECHA = '2026-10-31T10:00:00-06:00';
const VERSION = 2;
const ESTADOS = ['PENDIENTE_PAGO', 'PAGADA', 'RECHAZADA', 'CANCELADA', 'REEMBOLSADA'];

describe('OrdenesAlquilerService', () => {
  let servicio: OrdenesAlquilerService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(OrdenesAlquilerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listar', () => {
    it('envía los filtros con valor', () => {
      // Arrange
      const filtro = { sucursalId: 'sucursal-1', estado: 'PENDIENTE_PAGO' as const };

      // Act
      servicio.listar(filtro).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_ORDENES);
      expect(peticion.request.params.get('sucursalId')).toBe('sucursal-1');
      expect(peticion.request.params.get('estado')).toBe('PENDIENTE_PAGO');
      peticion.flush([]);
    });
  });

  describe('mias', () => {
    it('consulta las órdenes del cliente del token', () => {
      // Arrange
      const ruta = `${URL_ORDENES}/mias`;

      // Act
      servicio.mias().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush([]);
    });
  });

  describe('detalle', () => {
    it('consulta una orden por su id', () => {
      // Arrange
      const ruta = `${URL_ORDENES}/${ORDEN_ID}`;

      // Act
      servicio.detalle(ORDEN_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ ordenId: ORDEN_ID });
    });
  });

  describe('pagos', () => {
    it('paga la orden con la cartera', () => {
      // Arrange
      const fechaPago = FECHA;

      // Act
      servicio.pagarCartera(ORDEN_ID, fechaPago).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_ORDENES}/${ORDEN_ID}/pago-cartera`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ fechaPago });
      peticion.flush({ ordenId: ORDEN_ID });
    });

    it('paga la orden en efectivo', () => {
      // Arrange
      const fechaPago = FECHA;

      // Act
      servicio.pagarEfectivo(ORDEN_ID, fechaPago).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_ORDENES}/${ORDEN_ID}/pago-efectivo`);
      expect(peticion.request.body).toEqual({ fechaPago });
      peticion.flush({ ordenId: ORDEN_ID });
    });

    it('registra el reembolso en efectivo con la versión', () => {
      // Arrange
      const version = VERSION;

      // Act
      servicio.reembolsar(ORDEN_ID, version).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_ORDENES}/${ORDEN_ID}/reembolso`);
      expect(peticion.request.body).toEqual({ version });
      peticion.flush({ ordenId: ORDEN_ID });
    });
  });

  describe('estados', () => {
    it('devuelve los cinco estados de la orden', () => {
      // Arrange
      const esperado = ESTADOS;

      // Act
      const estados = servicio.estados();

      // Assert
      expect(estados).toEqual(esperado as never);
    });
  });

  describe('seguirHastaFin', () => {
    it('consulta el detalle cada dos segundos hasta que la orden deja de estar pendiente', fakeAsync(() => {
      // Arrange
      let estado: string | undefined;

      // Act
      servicio.seguirHastaFin(ORDEN_ID).subscribe((o) => (estado = o.estado));
      tick(2000);
      http.expectOne(`${URL_ORDENES}/${ORDEN_ID}`).flush({ ordenId: ORDEN_ID, estado: 'PENDIENTE_PAGO' });
      tick(2000);
      http.expectOne(`${URL_ORDENES}/${ORDEN_ID}`).flush({ ordenId: ORDEN_ID, estado: 'PAGADA' });

      // Assert
      expect(estado).toBe('PAGADA');
    }));
  });
});
