import { limpiarRegreso, recordarRegreso, regresoPendiente, rutaSegura } from './regreso';

/**
 * Pruebas unitarias del destino de regreso después de iniciar sesión.
 * Regla: solo se aceptan rutas internas para evitar redirecciones a otros sitios.
 */

const CLAVE = 'transporte.volver';
const RUTA_PANEL = '/panel';
const RUTA_INTERNA = '/panel/mis-compras';
const RUTA_EXTERNA = 'https://otro-sitio.com';
const RUTA_PROTOCOLO_RELATIVO = '//otro-sitio.com';

describe('regreso', () => {
  beforeEach(() => {
    // Arrange
    sessionStorage.clear();
  });

  describe('rutaSegura', () => {
    it('acepta una ruta interna', () => {
      // Arrange
      const url = RUTA_INTERNA;

      // Act
      const resultado = rutaSegura(url);

      // Assert
      expect(resultado).toBe(RUTA_INTERNA);
    });

    it('manda al panel cuando no hay ruta', () => {
      // Arrange
      const url = null;

      // Act
      const resultado = rutaSegura(url);

      // Assert
      expect(resultado).toBe(RUTA_PANEL);
    });

    it('rechaza una ruta externa', () => {
      // Arrange
      const url = RUTA_EXTERNA;

      // Act
      const resultado = rutaSegura(url);

      // Assert
      expect(resultado).toBe(RUTA_PANEL);
    });

    it('rechaza una ruta que empieza con doble barra', () => {
      // Arrange
      const url = RUTA_PROTOCOLO_RELATIVO;

      // Act
      const resultado = rutaSegura(url);

      // Assert
      expect(resultado).toBe(RUTA_PANEL);
    });
  });

  describe('recordarRegreso y regresoPendiente', () => {
    it('guarda el destino y lo devuelve después', () => {
      // Arrange
      const url = RUTA_INTERNA;

      // Act
      recordarRegreso(url);
      const resultado = regresoPendiente();

      // Assert
      expect(sessionStorage.getItem(CLAVE)).toBe(RUTA_INTERNA);
      expect(resultado).toBe(RUTA_INTERNA);
    });

    it('devuelve el panel cuando no hay destino guardado', () => {
      // Arrange
      sessionStorage.clear();

      // Act
      const resultado = regresoPendiente();

      // Assert
      expect(resultado).toBe(RUTA_PANEL);
    });

    it('no guarda una ruta externa', () => {
      // Arrange
      const url = RUTA_EXTERNA;

      // Act
      recordarRegreso(url);
      const resultado = regresoPendiente();

      // Assert
      expect(resultado).toBe(RUTA_PANEL);
    });
  });

  describe('limpiarRegreso', () => {
    it('borra el destino guardado', () => {
      // Arrange
      recordarRegreso(RUTA_INTERNA);

      // Act
      limpiarRegreso();

      // Assert
      expect(sessionStorage.getItem(CLAVE)).toBeNull();
      expect(regresoPendiente()).toBe(RUTA_PANEL);
    });
  });
});
