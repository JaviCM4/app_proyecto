import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UsuariosService } from './usuarios.service';

/**
 * Pruebas unitarias de UsuariosService.
 * Regla: el perfil propio lo edita cualquiera; la administración de cuentas es del sistema.
 */

const API = `${environment.apiUrl}/identity`;
const USUARIO_ID = 'usuario-1';
const CORREO = 'ana@pruebas.gt';
const TAMANO = '2000';
const ORDEN = 'correo,asc';
const FOTO = new File(['foto'], 'perfil.png', { type: 'image/png' });

describe('UsuariosService', () => {
  let servicio: UsuariosService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(UsuariosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('perfil propio', () => {
    it('consulta el perfil del token', () => {
      // Arrange
      const ruta = `${API}/perfil`;

      // Act
      servicio.perfil().subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ correo: CORREO });
    });

    it('actualiza los datos del perfil', () => {
      // Arrange
      const datos = { nombre: 'Ana Pérez', telefono: '55555555' };

      // Act
      servicio.actualizarPerfil(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/perfil`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ correo: CORREO });
    });

    it('completa el perfil de una cuenta de Google', () => {
      // Arrange
      const datos = { dpi: '1234567890101', telefono: '55555555', direccion: 'Calle 1' };

      // Act
      servicio.completarPerfil(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/perfil/completar`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ correo: CORREO });
    });

    it('sube la foto como FormData', () => {
      // Arrange
      const archivo = FOTO;

      // Act
      servicio.subirFoto(archivo).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/archivos/fotos`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body instanceof FormData).toBeTrue();
      peticion.flush({ fotoUrl: 'https://fotos/perfil.png' });
    });
  });

  describe('listar', () => {
    it('pide una página grande ordenada y con los filtros con valor', () => {
      // Arrange
      const filtro = { rol: 'CAJERO', estado: 'ACTIVO', correo: '' };

      // Act
      servicio.listar(filtro as never).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${API}/usuarios`);
      expect(peticion.request.params.get('size')).toBe(TAMANO);
      expect(peticion.request.params.get('sort')).toBe(ORDEN);
      expect(peticion.request.params.get('rol')).toBe('CAJERO');
      expect(peticion.request.params.get('estado')).toBe('ACTIVO');
      expect(peticion.request.params.has('correo')).toBeFalse();
      peticion.flush([]);
    });
  });

  describe('administración', () => {
    it('consulta el detalle de una cuenta', () => {
      // Arrange
      const ruta = `${API}/usuarios/${USUARIO_ID}`;

      // Act
      servicio.detalle(USUARIO_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('GET');
      peticion.flush({ usuarioId: USUARIO_ID });
    });

    it('crea otro administrador del sistema', () => {
      // Arrange
      const datos = { correo: CORREO, nombres: 'Ana', apellidos: 'Pérez' };

      // Act
      servicio.crearAdministrador(datos as never).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/usuarios/administradores-sistema`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({ usuarioId: USUARIO_ID });
    });

    it('da el rol de administrador del sistema a una cuenta existente', () => {
      // Arrange
      const ruta = `${API}/usuarios/${USUARIO_ID}/administrador-sistema`;

      // Act
      servicio.hacerAdministradorSistema(USUARIO_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('POST');
      peticion.flush({ usuarioId: USUARIO_ID });
    });
  });

  describe('asignaciones', () => {
    it('consulta las cuentas asignables a un puesto', () => {
      // Arrange
      const puesto = 'CHOFER' as const;

      // Act
      servicio.asignables(puesto).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${API}/usuarios/asignables`);
      expect(peticion.request.params.get('puesto')).toBe(puesto);
      peticion.flush([]);
    });

    it('busca una cuenta por correo sin espacios', () => {
      // Arrange
      const correo = `  ${CORREO}  `;

      // Act
      servicio.buscarPorCorreo(correo).subscribe();

      // Assert
      const peticion = http.expectOne((r) => r.url === `${API}/usuarios/por-correo`);
      expect(peticion.request.params.get('correo')).toBe(CORREO);
      expect(peticion.request.params.get('puesto')).toBe('PERSONAL');
      peticion.flush({ correo: CORREO });
    });
  });

  describe('estado de la cuenta', () => {
    it('bloquea la cuenta con una duración', () => {
      // Arrange
      const duracionMinutos = 30;

      // Act
      servicio.cambiarEstado(USUARIO_ID, 'BLOQUEADO', duracionMinutos).subscribe();

      // Assert
      const peticion = http.expectOne(`${API}/usuarios/${USUARIO_ID}/estado`);
      expect(peticion.request.method).toBe('PATCH');
      expect(peticion.request.body).toEqual({ estado: 'BLOQUEADO', duracionMinutos });
      peticion.flush({ usuarioId: USUARIO_ID });
    });

    it('bloquea la cuenta sin duración', () => {
      // Arrange
      const ruta = `${API}/usuarios/${USUARIO_ID}/estado`;

      // Act
      servicio.cambiarEstado(USUARIO_ID, 'BLOQUEADO').subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.body).toEqual({ estado: 'BLOQUEADO' });
      peticion.flush({ usuarioId: USUARIO_ID });
    });

    it('desbloquea la cuenta', () => {
      // Arrange
      const ruta = `${API}/usuarios/${USUARIO_ID}/desbloquear`;

      // Act
      servicio.desbloquear(USUARIO_ID).subscribe();

      // Assert
      const peticion = http.expectOne(ruta);
      expect(peticion.request.method).toBe('POST');
      peticion.flush({ usuarioId: USUARIO_ID });
    });
  });
});
