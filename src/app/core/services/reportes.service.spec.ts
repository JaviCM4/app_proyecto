import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ReportesService } from './reportes.service';

/**
 * Pruebas unitarias de ReportesService.
 * Regla: el mismo recurso responde JSON para pantalla y PDF para descargar.
 */

const URL_REPORTES = `${environment.apiUrl}/reports`;
const RUTA_VENTAS = '/ventas';
const NOMBRE_POR_DEFECTO = 'reporte.pdf';
const NOMBRE_ARCHIVO = 'ventas-octubre.pdf';
const DESDE = '2026-10-01';

describe('ReportesService', () => {
  let servicio: ReportesService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ReportesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('datos', () => {
    it('pide el reporte en JSON con los filtros con valor', () => {
      // Arrange
      const filtros = { desde: DESDE, sucursalId: null, estado: '' };

      // Act
      servicio.datos(RUTA_VENTAS, filtros).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_REPORTES}${RUTA_VENTAS}`);
      expect(peticion.request.method).toBe('GET');
      expect(peticion.request.params.get('format')).toBe('json');
      expect(peticion.request.params.get('desde')).toBe(DESDE);
      expect(peticion.request.params.has('sucursalId')).toBeFalse();
      expect(peticion.request.params.has('estado')).toBeFalse();
      peticion.flush({ total: 0 });
    });

    it('funciona sin filtros', () => {
      // Arrange
      const ruta = `${URL_REPORTES}${RUTA_VENTAS}`;

      // Act
      servicio.datos(RUTA_VENTAS).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.get('format')).toBe('json');
      peticion.flush({ total: 0 });
    });
  });

  describe('pdf', () => {
    it('pide el PDF y toma el nombre del encabezado de descarga', () => {
      // Arrange
      const filtros = { desde: DESDE };

      // Act
      let nombre = '';
      servicio.pdf(RUTA_VENTAS, filtros, NOMBRE_POR_DEFECTO).subscribe((pdf) => (nombre = pdf.nombre));

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_REPORTES}${RUTA_VENTAS}`);
      expect(peticion.request.params.get('format')).toBe('pdf');
      expect(peticion.request.responseType).toBe('blob');
      peticion.flush(new Blob(['pdf']), {
        headers: { 'Content-Disposition': `attachment; filename="${NOMBRE_ARCHIVO}"` },
      });
      expect(nombre).toBe(NOMBRE_ARCHIVO);
    });

    it('usa el nombre por defecto cuando el encabezado no lo trae', () => {
      // Arrange
      const filtros = {};

      // Act
      let nombre = '';
      servicio.pdf(RUTA_VENTAS, filtros, NOMBRE_POR_DEFECTO).subscribe((pdf) => (nombre = pdf.nombre));

      // Assert
      http.expectOne((r) => r.url === `${URL_REPORTES}${RUTA_VENTAS}`).flush(new Blob(['pdf']));
      expect(nombre).toBe(NOMBRE_POR_DEFECTO);
    });
  });

  describe('guardar', () => {
    it('crea el enlace de descarga y lo abre', () => {
      // Arrange
      const pdf = { blob: new Blob(['pdf']), nombre: NOMBRE_ARCHIVO };
      spyOn(URL, 'createObjectURL').and.returnValue('blob:reporte');
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click');

      // Act
      servicio.guardar(pdf);

      // Assert
      expect(URL.createObjectURL).toHaveBeenCalledWith(pdf.blob);
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });
  });
});
