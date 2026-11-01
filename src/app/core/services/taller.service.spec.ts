import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TallerService } from './taller.service';

/**
 * Pruebas unitarias de TallerService.
 * Regla: las categorías las administra el sistema y los servicios son de la sucursal del token.
 */

const API = `${environment.apiUrl}/maintenance`;
const CATEGORIA_ID = 'categoria-1';
const SERVICIO_ID = 'servicio-1';
const VERSION = 2;

describe('TallerService', () => {
  let servicio: TallerService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(TallerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('categorias', () => {
    it('filtra por categorías activas', () => {
      // Arrange
      const activa = true;

      // Act
      servicio.categorias(activa).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${API}/categorias`);
      expect(peticion.request.params.get('activa')).toBe('true');
      peticion.flush([]);
    });

    it('no envía el filtro cuando no se indica', () => {
      // Arrange
      const ruta = `${API}/categorias`;

      // Act
      servicio.categorias().subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.keys().length).toBe(0);
      peticion.flush([]);
    });

    it('crea una categoría', () => {
      // Arrange
      const datos = { nombre: 'Frenos', descripcion: 'Cambio de pastillas' };

      // Act
      servicio.crearCategoria(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/categorias`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ categoriaId: CATEGORIA_ID });
    });

    it('actualiza una categoría con su versión', () => {
      // Arrange
      const datos = { nombre: 'Frenos', activa: false, version: VERSION };

      // Act
      servicio.actualizarCategoria(CATEGORIA_ID, datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/categorias/${CATEGORIA_ID}`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ categoriaId: CATEGORIA_ID });
    });
  });

  describe('busesDisponibles', () => {
    it('pide solo los buses activos', () => {
      // Arrange
      const activo = true;

      // Act
      servicio.busesDisponibles(activo).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${API}/buses`);
      expect(peticion.request.params.get('activo')).toBe('true');
      peticion.flush([]);
    });
  });

  describe('servicios', () => {
    it('registra un servicio de taller', () => {
      // Arrange
      const datos = { busId: 'bus-1', categoriaId: CATEGORIA_ID, fecha: '2026-10-31', costo: 350 };

      // Act
      servicio.registrar(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/servicios`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ servicioId: SERVICIO_ID });
    });

    it('lista los servicios con los filtros con valor', () => {
      // Arrange
      const filtro = { busId: 'bus-1', categoriaId: null, desde: '' };

      // Act
      servicio.listar(filtro as never).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${API}/servicios`);
      expect(peticion.request.params.get('busId')).toBe('bus-1');
      expect(peticion.request.params.has('categoriaId')).toBeFalse();
      expect(peticion.request.params.has('desde')).toBeFalse();
      peticion.flush([]);
    });

    it('consulta el detalle de un servicio', () => {
      // Arrange
      const ruta = `${API}/servicios/${SERVICIO_ID}`;

      // Act
      servicio.detalle(SERVICIO_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ servicioId: SERVICIO_ID });
    });
  });
});
