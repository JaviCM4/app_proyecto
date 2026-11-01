import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DesafioDobleFactor, Rol, Sesion, UsuarioSesion } from '../models/auth.model';
import { AuthService } from './auth.service';

/**
 * Pruebas unitarias de AuthService.
 * Regla: la sesión se guarda en localStorage y el token viaja en cada petición autenticada.
 */

const URL_AUTH = `${environment.apiUrl}/identity/auth`;
const CLAVE_TOKEN = 'token';
const CLAVE_REFRESCO = 'tokenRefresco';
const CLAVE_USUARIO = 'usuario';
const TOKEN = 'token-acceso';
const TOKEN_REFRESCO = 'token-refresco';
const CORREO = 'ana@pruebas.gt';
const CONTRASENA = 'secreta123';
const USUARIO_ID = 'usuario-1';
const CODIGO = '123456';
const TICKET = 'ticket-google';

const USUARIO: UsuarioSesion = {
  usuarioId: USUARIO_ID,
  correo: CORREO,
  nombre: 'Ana Pérez',
  roles: ['CLIENTE'],
  sucursalId: null,
  choferId: null,
  fotoUrl: null,
  perfilCompleto: true,
};

const SESION: Sesion = {
  tokenAcceso: TOKEN,
  tipo: 'Bearer',
  expiraEn: '2026-10-31T12:00:00-06:00',
  tokenRefresco: TOKEN_REFRESCO,
  usuarioId: USUARIO_ID,
  usuario: USUARIO,
};

const DESAFIO: DesafioDobleFactor = {
  usuarioId: USUARIO_ID,
  correo: CORREO,
  expiraEn: '2026-10-31T12:10:00-06:00',
};

describe('AuthService', () => {
  let servicio: AuthService;
  let http: HttpTestingController;

  /** Crea el servicio con una sesión ya guardada en localStorage. */
  function crearServicioConSesion(): AuthService {
    TestBed.resetTestingModule();
    localStorage.setItem(CLAVE_TOKEN, TOKEN);
    localStorage.setItem(CLAVE_REFRESCO, TOKEN_REFRESCO);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(USUARIO));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    // Arrange
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('guarda la sesión cuando el backend responde con tokens', () => {
      // Arrange
      const sesion = SESION;

      // Act
      let resultado: string | undefined;
      servicio.login(CORREO, CONTRASENA).subscribe((r) => (resultado = r.tipo));

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/login`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ correo: CORREO, contrasena: CONTRASENA });
      peticion.flush(sesion);
      expect(resultado).toBe('SESION');
      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(TOKEN);
      expect(localStorage.getItem(CLAVE_REFRESCO)).toBe(TOKEN_REFRESCO);
      expect(servicio.autenticado()).toBeTrue();
    });

    it('deja el desafío pendiente cuando la cuenta usa doble factor', () => {
      // Arrange
      const desafio = DESAFIO;

      // Act
      let resultado: string | undefined;
      servicio.login(CORREO, CONTRASENA).subscribe((r) => (resultado = r.tipo));

      // Assert
      http.expectOne(`${URL_AUTH}/login`).flush(desafio);
      expect(resultado).toBe('DOBLE_FACTOR');
      expect(servicio.desafio).toEqual(DESAFIO);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
    });
  });

  describe('Google', () => {
    it('pide la URL de Google al backend', () => {
      // Arrange
      const respuesta = { url: 'https://accounts.google.com/o/oauth2/auth', state: 'estado' };

      // Act
      servicio.urlGoogle().subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/oauth2/google/url`);
      expect(peticion.request.method).toBe('GET');
      peticion.flush(respuesta);
    });

    it('canjea el ticket de Google por una sesión', () => {
      // Arrange
      const ticket = TICKET;

      // Act
      let resultado: string | undefined;
      servicio.canjearTicketGoogle(ticket).subscribe((r) => (resultado = r.tipo));

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/oauth2/canjear`);
      expect(peticion.request.body).toEqual({ ticket });
      peticion.flush(SESION);
      expect(resultado).toBe('SESION');
      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(TOKEN);
    });
  });

  describe('verificarCodigo', () => {
    it('guarda la sesión cuando el código es correcto', () => {
      // Arrange
      const codigo = CODIGO;

      // Act
      servicio.verificarCodigo(CORREO, codigo).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/login/verificar`);
      expect(peticion.request.body).toEqual({ correo: CORREO, codigo });
      peticion.flush(SESION);
      expect(servicio.autenticado()).toBeTrue();
    });
  });

  describe('registro y recuperación', () => {
    it('envía los datos del registro y devuelve void', () => {
      // Arrange
      const datos = {
        correo: CORREO,
        contrasena: CONTRASENA,
        nombres: 'Ana',
        apellidos: 'Pérez',
        nit: '1234567-8',
        dpi: '1234567890101',
        telefono: '55555555',
        direccion: 'Calle 1',
      };

      // Act
      let resultado: unknown = 'pendiente';
      servicio.registrar(datos).subscribe((r) => (resultado = r));

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/registro`);
      expect(peticion.request.body).toEqual(datos);
      peticion.flush({});
      expect(resultado).toBeUndefined();
    });

    it('pide el enlace de recuperación', () => {
      // Arrange
      const correo = CORREO;

      // Act
      servicio.recuperar(correo).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/recuperar`);
      expect(peticion.request.body).toEqual({ correo });
      peticion.flush(null);
    });

    it('restablece la contraseña con el token del correo', () => {
      // Arrange
      const token = TICKET;
      const nuevaContrasena = CONTRASENA;

      // Act
      servicio.restablecer(token, nuevaContrasena).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/restablecer`);
      expect(peticion.request.body).toEqual({ token, nuevaContrasena });
      peticion.flush(null);
    });
  });

  describe('refrescar', () => {
    it('usa el token de refresco guardado y actualiza la sesión', () => {
      // Arrange
      localStorage.setItem(CLAVE_REFRESCO, TOKEN_REFRESCO);

      // Act
      servicio.refrescar().subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/refrescar`);
      expect(peticion.request.body).toEqual({ tokenRefresco: TOKEN_REFRESCO });
      peticion.flush(SESION);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBe(TOKEN);
    });
  });

  describe('cerrarSesion', () => {
    it('avisa al backend y limpia la sesión', () => {
      // Arrange
      localStorage.setItem(CLAVE_TOKEN, TOKEN);
      localStorage.setItem(CLAVE_REFRESCO, TOKEN_REFRESCO);

      // Act
      servicio.cerrarSesion().subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/cerrar-sesion`);
      expect(peticion.request.body).toEqual({ tokenRefresco: TOKEN_REFRESCO });
      peticion.flush(null);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(servicio.autenticado()).toBeFalse();
    });

    it('limpia la sesión aunque el backend falle', () => {
      // Arrange
      localStorage.setItem(CLAVE_TOKEN, TOKEN);
      localStorage.setItem(CLAVE_REFRESCO, TOKEN_REFRESCO);

      // Act
      servicio.cerrarSesion().subscribe();

      // Assert
      http.expectOne(`${URL_AUTH}/cerrar-sesion`).flush(null, { status: 500, statusText: 'Error' });
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
    });

    it('no llama al backend cuando no hay token de refresco', () => {
      // Arrange
      localStorage.setItem(CLAVE_TOKEN, TOKEN);

      // Act
      servicio.cerrarSesion().subscribe();

      // Assert
      http.expectNone(`${URL_AUTH}/cerrar-sesion`);
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
    });
  });

  describe('seguridad de la cuenta', () => {
    it('cambia la contraseña', () => {
      // Arrange
      const actual = CONTRASENA;
      const nueva = 'nueva123';

      // Act
      servicio.cambiarContrasena(actual, nueva).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/contrasena`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual({ contrasenaActual: actual, nuevaContrasena: nueva });
      peticion.flush(null);
    });

    it('activa o desactiva la verificación en dos pasos', () => {
      // Arrange
      const activado = true;

      // Act
      servicio.cambiarDobleFactor(activado).subscribe();

      // Assert
      const peticion = http.expectOne(`${URL_AUTH}/doble-factor`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual({ activado });
      peticion.flush(null);
    });
  });

  describe('datos de la sesión', () => {
    it('actualiza el usuario guardado', () => {
      // Arrange
      const servicioConSesion = crearServicioConSesion();

      // Act
      servicioConSesion.actualizarUsuario({ nombre: 'Ana María' });

      // Assert
      expect(servicioConSesion.usuario()?.nombre).toBe('Ana María');
      const guardado = JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? '{}') as UsuarioSesion;
      expect(guardado.nombre).toBe('Ana María');
    });

    it('no actualiza nada cuando no hay sesión', () => {
      // Arrange
      const servicioSinSesion = TestBed.inject(AuthService);

      // Act
      servicioSinSesion.actualizarUsuario({ nombre: 'Ana María' });

      // Assert
      expect(servicioSinSesion.usuario()).toBeNull();
    });

    it('limpiar borra tokens, usuario y desafío', () => {
      // Arrange
      const servicioConSesion = crearServicioConSesion();

      // Act
      servicioConSesion.limpiar();

      // Assert
      expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull();
      expect(localStorage.getItem(CLAVE_REFRESCO)).toBeNull();
      expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
      expect(servicioConSesion.desafio).toBeNull();
      expect(servicioConSesion.autenticado()).toBeFalse();
    });

    it('devuelve el token y si hay token de refresco', () => {
      // Arrange
      const servicioConSesion = crearServicioConSesion();

      // Act
      const token = servicioConSesion.token();
      const tieneRefresco = servicioConSesion.tieneRefresco();

      // Assert
      expect(token).toBe(TOKEN);
      expect(tieneRefresco).toBeTrue();
    });

    it('reconoce cualquiera de los roles indicados', () => {
      // Arrange
      const servicioConSesion = crearServicioConSesion();
      const roles: Rol[] = ['CAJERO', 'CLIENTE'];

      // Act
      const tieneRol = servicioConSesion.tieneRol(...roles);
      const noTieneRol = servicioConSesion.tieneRol('ADMIN_SISTEMA');

      // Assert
      expect(tieneRol).toBeTrue();
      expect(noTieneRol).toBeFalse();
    });
  });
});
