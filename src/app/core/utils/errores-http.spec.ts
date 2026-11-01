import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { ErrorApi } from '../models/error.model';
import { errorApi, marcarErroresServidor, mensajeError } from './errores-http';

/**
 * Pruebas unitarias del manejo de errores HTTP.
 * Regla: al usuario se le muestra un mensaje en español y nunca rutas ni códigos técnicos.
 */

const MENSAJE_POR_DEFECTO = 'No se pudo completar la operación.';
const MENSAJE_PERSONALIZADO = 'No se pudo guardar el bus.';
const MENSAJE_BACKEND = 'El correo ya está registrado.';
const MENSAJE_CAMPO = 'El DPI debe tener 13 dígitos.';
const MENSAJE_FORMULARIO = 'Revisa los datos marcados en el formulario.';
const SIN_CONEXION = 'No hay conexión con el servidor. Intenta de nuevo en unos minutos.';
const SESION_TERMINADA = 'Tu sesión terminó. Vuelve a entrar.';
const SIN_PERMISO = 'No tienes permiso para realizar esta acción.';
const NO_ENCONTRADO = 'No se encontró la información solicitada.';
const ERROR_SERVIDOR = 'Ocurrió un problema en el servidor. Intenta de nuevo.';

const CODIGO_API = 'VALIDACION';
const CAMPO_DPI = 'adminInicial.dpi';
const CAMPO_NOMBRE = 'nombre';

function cuerpoError(parcial: Partial<ErrorApi> = {}): ErrorApi {
  return {
    status: 400,
    codigo: CODIGO_API,
    mensaje: MENSAJE_BACKEND,
    errores: [],
    ...parcial,
  };
}

function errorHttp(status: number, cuerpo: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: cuerpo });
}

describe('errores-http', () => {
  describe('errorApi', () => {
    it('devuelve el cuerpo cuando es un error del backend', () => {
      // Arrange
      const cuerpo = cuerpoError();

      // Act
      const resultado = errorApi(errorHttp(400, cuerpo));

      // Assert
      expect(resultado).toEqual(cuerpo);
    });

    it('devuelve null cuando el error no trae el código del backend', () => {
      // Arrange
      const error = errorHttp(400, { mensaje: MENSAJE_BACKEND });

      // Act
      const resultado = errorApi(error);

      // Assert
      expect(resultado).toBeNull();
    });

    it('devuelve null cuando el error no es de Angular', () => {
      // Arrange
      const error = new Error('fallo');

      // Act
      const resultado = errorApi(error);

      // Assert
      expect(resultado).toBeNull();
    });
  });

  describe('mensajeError', () => {
    it('pide revisar el formulario cuando el backend marca campos', () => {
      // Arrange
      const cuerpo = cuerpoError({ errores: [{ campo: CAMPO_DPI, mensaje: MENSAJE_CAMPO }] });

      // Act
      const mensaje = mensajeError(errorHttp(400, cuerpo));

      // Assert
      expect(mensaje).toBe(MENSAJE_FORMULARIO);
    });

    it('usa el mensaje del backend cuando no hay campos marcados', () => {
      // Arrange
      const cuerpo = cuerpoError();

      // Act
      const mensaje = mensajeError(errorHttp(400, cuerpo));

      // Assert
      expect(mensaje).toBe(MENSAJE_BACKEND);
    });

    it('avisa cuando no hay conexión con el servidor', () => {
      // Arrange
      const error = errorHttp(0);

      // Act
      const mensaje = mensajeError(error);

      // Assert
      expect(mensaje).toBe(SIN_CONEXION);
    });

    it('avisa cuando la sesión terminó', () => {
      // Arrange
      const error = errorHttp(401);

      // Act
      const mensaje = mensajeError(error);

      // Assert
      expect(mensaje).toBe(SESION_TERMINADA);
    });

    it('avisa cuando no hay permiso', () => {
      // Arrange
      const error = errorHttp(403);

      // Act
      const mensaje = mensajeError(error);

      // Assert
      expect(mensaje).toBe(SIN_PERMISO);
    });

    it('avisa cuando no se encontró la información', () => {
      // Arrange
      const error = errorHttp(404);

      // Act
      const mensaje = mensajeError(error);

      // Assert
      expect(mensaje).toBe(NO_ENCONTRADO);
    });

    it('avisa cuando el servidor falla', () => {
      // Arrange
      const error = errorHttp(500);

      // Act
      const mensaje = mensajeError(error);

      // Assert
      expect(mensaje).toBe(ERROR_SERVIDOR);
    });

    it('devuelve el mensaje por defecto para un error desconocido', () => {
      // Arrange
      const error = new Error('fallo');

      // Act
      const mensaje = mensajeError(error);

      // Assert
      expect(mensaje).toBe(MENSAJE_POR_DEFECTO);
    });

    it('usa el mensaje por defecto que recibe', () => {
      // Arrange
      const error = new Error('fallo');

      // Act
      const mensaje = mensajeError(error, MENSAJE_PERSONALIZADO);

      // Assert
      expect(mensaje).toBe(MENSAJE_PERSONALIZADO);
    });
  });

  describe('marcarErroresServidor', () => {
    it('marca el campo con el mensaje del servidor y lo deja tocado', () => {
      // Arrange
      const formulario = new FormGroup({
        adminInicial: new FormGroup({ dpi: new FormControl('123') }),
      });
      const cuerpo = cuerpoError({ errores: [{ campo: CAMPO_DPI, mensaje: MENSAJE_CAMPO }] });

      // Act
      marcarErroresServidor(formulario, errorHttp(400, cuerpo));

      // Assert
      const control = formulario.get(CAMPO_DPI);
      expect(control?.errors?.['servidor']).toBe(MENSAJE_CAMPO);
      expect(control?.touched).toBeTrue();
    });

    it('ignora los errores que no indican campo', () => {
      // Arrange
      const formulario = new FormGroup({ nombre: new FormControl('Ana') });
      const cuerpo = cuerpoError({ errores: [{ campo: null, mensaje: MENSAJE_BACKEND }] });

      // Act
      marcarErroresServidor(formulario, errorHttp(400, cuerpo));

      // Assert
      expect(formulario.get(CAMPO_NOMBRE)?.errors).toBeNull();
    });

    it('ignora los campos que no existen en el formulario', () => {
      // Arrange
      const formulario = new FormGroup({ nombre: new FormControl('Ana') });
      const cuerpo = cuerpoError({ errores: [{ campo: CAMPO_DPI, mensaje: MENSAJE_CAMPO }] });

      // Act
      marcarErroresServidor(formulario, errorHttp(400, cuerpo));

      // Assert
      expect(formulario.get(CAMPO_NOMBRE)?.errors).toBeNull();
    });
  });
});

