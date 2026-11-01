import { Rol } from '../../core/models/auth.model';
import { NOMBRE_ROL, ORDEN_ROL, rolPrincipal } from './roles';

/**
 * Pruebas unitarias de los roles de la aplicación.
 * Regla: el rol principal se elige según el orden de importancia del negocio.
 */

const ROL_SISTEMA: Rol = 'ADMIN_SISTEMA';
const ROL_SUCURSAL: Rol = 'ADMIN_SUCURSAL';
const ROL_CAJERO: Rol = 'CAJERO';
const ROL_CHOFER: Rol = 'CHOFER';
const ROL_CLIENTE: Rol = 'CLIENTE';
const SIN_ROLES: Rol[] = [];
const TODOS_LOS_ROLES: Rol[] = [ROL_CLIENTE, ROL_CHOFER, ROL_CAJERO, ROL_SUCURSAL, ROL_SISTEMA];

describe('roles', () => {
  describe('NOMBRE_ROL', () => {
    it('traduce cada rol a su nombre visible', () => {
      // Arrange
      const esperado = 'Administrador del sistema';

      // Act
      const nombre = NOMBRE_ROL[ROL_SISTEMA];

      // Assert
      expect(nombre).toBe(esperado);
    });

    it('tiene un nombre para los cinco roles', () => {
      // Arrange
      const roles = TODOS_LOS_ROLES;

      // Act
      const nombres = roles.map((rol) => NOMBRE_ROL[rol]);

      // Assert
      expect(nombres).toEqual([
        'Cliente',
        'Piloto',
        'Cajero',
        'Administrador de sucursal',
        'Administrador del sistema',
      ]);
    });
  });

  describe('ORDEN_ROL', () => {
    it('ordena del rol de mayor alcance al cliente', () => {
      // Arrange
      const esperado = [ROL_SISTEMA, ROL_SUCURSAL, ROL_CAJERO, ROL_CHOFER, ROL_CLIENTE];

      // Act
      const orden = ORDEN_ROL;

      // Assert
      expect(orden).toEqual(esperado);
    });
  });

  describe('rolPrincipal', () => {
    it('devuelve el rol de mayor alcance de la cuenta', () => {
      // Arrange
      const roles = [ROL_CLIENTE, ROL_CAJERO];

      // Act
      const principal = rolPrincipal(roles);

      // Assert
      expect(principal).toBe(ROL_CAJERO);
    });

    it('devuelve el administrador del sistema aunque tenga todos los roles', () => {
      // Arrange
      const roles = TODOS_LOS_ROLES;

      // Act
      const principal = rolPrincipal(roles);

      // Assert
      expect(principal).toBe(ROL_SISTEMA);
    });

    it('devuelve null cuando la cuenta no tiene roles', () => {
      // Arrange
      const roles = SIN_ROLES;

      // Act
      const principal = rolPrincipal(roles);

      // Assert
      expect(principal).toBeNull();
    });
  });
});
