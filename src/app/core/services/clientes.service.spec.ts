import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ClientesService } from './clientes.service';

/**
 * Pruebas unitarias de ClientesService.
 * Regla: la ventanilla busca clientes por NIT, nombre o correo.
 */

const URL_CLIENTES = `${environment.apiUrl}/sales/clientes`;
const BUSQUEDA = '1234567-8';

describe('ClientesService', () => {
  let servicio: ClientesService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ClientesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('buscar', () => {
    it('envía el texto de búsqueda', () => {
      // Arrange
      const busqueda = BUSQUEDA;

      // Act
      servicio.buscar(busqueda).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === URL_CLIENTES);
      expect(peticion.request.params.get('busqueda')).toBe(BUSQUEDA);
      peticion.flush([]);
    });

    it('no envía parámetros cuando no hay texto', () => {
      // Arrange
      const ruta = URL_CLIENTES;

      // Act
      servicio.buscar().subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === ruta);
      expect(peticion.request.params.keys().length).toBe(0);
      peticion.flush([]);
    });
  });
});
