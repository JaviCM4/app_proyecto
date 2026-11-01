import { Rol } from '../../core/models/auth.model';
import { RolTextoPipe } from './rol-texto.pipe';

/**
 * Pruebas unitarias del pipe que convierte roles en texto.
 * Regla: el rol Cliente se omite cuando la cuenta tiene otro rol.
 */

const ROL_SISTEMA: Rol = 'ADMIN_SISTEMA';
const ROL_SUCURSAL: Rol = 'ADMIN_SUCURSAL';
const ROL_CAJERO: Rol = 'CAJERO';
const ROL_CLIENTE: Rol = 'CLIENTE';
const ROL_DESCONOCIDO = 'SUPERVISOR' as Rol;

describe('RolTextoPipe', () => {
  let pipe: RolTextoPipe;

  beforeEach(() => {
    // Arrange
    pipe = new RolTextoPipe();
  });

  describe('un solo rol', () => {
    it('traduce el rol a su nombre visible', () => {
      // Arrange
      const rol = ROL_SUCURSAL;

      // Act
      const texto = pipe.transform(rol);

      // Assert
      expect(texto).toBe('Administrador de sucursal');
    });

    it('devuelve el código si el rol no está en la tabla', () => {
      // Arrange
      const rol = ROL_DESCONOCIDO;

      // Act
      const texto = pipe.transform(rol);

      // Assert
      expect(texto).toBe(ROL_DESCONOCIDO);
    });

    it('devuelve texto vacío cuando no hay rol', () => {
      // Arrange
      const rol = null;

      // Act
      const texto = pipe.transform(rol);

      // Assert
      expect(texto).toBe('');
    });
  });

  describe('lista de roles', () => {
    it('ordena los roles y los une con coma', () => {
      // Arrange
      const roles: Rol[] = [ROL_CAJERO, ROL_SISTEMA];

      // Act
      const texto = pipe.transform(roles);

      // Assert
      expect(texto).toBe('Administrador del sistema, Cajero');
    });

    it('omite el rol Cliente cuando hay otro rol', () => {
      // Arrange
      const roles: Rol[] = [ROL_CLIENTE, ROL_CAJERO];

      // Act
      const texto = pipe.transform(roles);

      // Assert
      expect(texto).toBe('Cajero');
    });

    it('muestra Cliente cuando es el único rol', () => {
      // Arrange
      const roles: Rol[] = [ROL_CLIENTE];

      // Act
      const texto = pipe.transform(roles);

      // Assert
      expect(texto).toBe('Cliente');
    });

    it('devuelve texto vacío cuando la lista está vacía', () => {
      // Arrange
      const roles: Rol[] = [];

      // Act
      const texto = pipe.transform(roles);

      // Assert
      expect(texto).toBe('');
    });
  });
});
