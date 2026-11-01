import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ChoferesService } from './choferes.service';

/**
 * Pruebas unitarias de ChoferesService.
 * Regla: el alta crea la cuenta del piloto y la foto se sube como FormData.
 */

const URL_CHOFERES = `${environment.apiUrl}/fleet/choferes`;
const URL_ARCHIVOS = `${environment.apiUrl}/fleet/archivos`;
const CHOFER_ID = 'chofer-1';
const SUCURSAL_ID = 'sucursal-1';
const LICENCIA = 'A-12345';
const FECHA = '2026-10-31';
const VERSION = 2;
const FOTO = new File(['foto'], 'piloto.png', { type: 'image/png' });

describe('ChoferesService', () => {
  let servicio: ChoferesService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ChoferesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listar', () => {
    it('envía la sucursal y el estado cuando se indican', () => {
      // Arrange
      const sucursalId = SUCURSAL_ID;
      const estado = 'ACTIVO' as const;

      // Act
      servicio.listar(sucursalId, estado).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_CHOFERES);
      expect(peticion.request.params.get('sucursalId')).toBe(SUCURSAL_ID);
      expect(peticion.request.params.get('estado')).toBe(estado);
      peticion.flush([]);
    });

    it('no envía filtros vacíos', () => {
      // Arrange
      const ruta = URL_CHOFERES;

      // Act
      servicio.listar().subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.keys().length).toBe(0);
      peticion.flush([]);
    });
  });

  describe('detalle', () => {
    it('consulta un piloto por su id', () => {
      // Arrange
      const ruta = `${URL_CHOFERES}/${CHOFER_ID}`;

      // Act
      servicio.detalle(CHOFER_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ choferId: CHOFER_ID });
    });
  });

  describe('crear', () => {
    it('registra al piloto y su cuenta', () => {
      // Arrange
      const datos = { numeroLicencia: LICENCIA, tipoLicencia: 'B', fechaVencimientoLicencia: '2027-10-31' };

      // Act
      servicio.crear(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(URL_CHOFERES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ choferId: CHOFER_ID });
    });
  });

  describe('actualizar', () => {
    it('actualiza los datos laborales del piloto', () => {
      // Arrange
      const datos = { salarioBase: 250, version: VERSION };

      // Act
      servicio.actualizar(CHOFER_ID, datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_CHOFERES}/${CHOFER_ID}`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ choferId: CHOFER_ID });
    });

    it('actualiza la licencia del piloto', () => {
      // Arrange
      const datos = { numeroLicencia: LICENCIA, tipoLicencia: 'A', fechaVencimientoLicencia: '2028-10-31', version: VERSION };

      // Act
      servicio.actualizarLicencia(CHOFER_ID, datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_CHOFERES}/${CHOFER_ID}/licencia`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ choferId: CHOFER_ID });
    });
  });

  describe('desactivar', () => {
    it('retira al piloto con la fecha y la versión', () => {
      // Arrange
      const fecha = FECHA;
      const version = VERSION;

      // Act
      servicio.desactivar(CHOFER_ID, fecha, version).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_CHOFERES}/${CHOFER_ID}/desactivar`);
      expect(peticion.request.method).toBe('PATCH');
      expect(peticion.request.body).toEqual({ fecha, version });
      peticion.flush({ choferId: CHOFER_ID });
    });
  });

  describe('subirFoto', () => {
    it('sube la foto del piloto como FormData', () => {
      // Arrange
      const archivo = FOTO;

      // Act
      servicio.subirFoto(archivo).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${URL_ARCHIVOS}/fotos`);
      expect(peticion.request.params.get('tipo')).toBe('CHOFER');
      expect(peticion.request.body instanceof FormData).toBeTrue();
      peticion.flush({ fotoUrl: 'https://fotos/piloto.png' });
    });
  });
});
