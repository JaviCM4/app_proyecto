import { Rol } from '../../core/models/auth.model';
import { MENU, menuPara, puedeVer } from './menu.config';

/**
 * Pruebas unitarias del menú lateral.
 * Regla: cada cuenta ve la suma de las opciones de todos sus roles.
 */

const SIN_ROLES: Rol[] = [];
const ROL_CLIENTE: Rol[] = ['CLIENTE'];
const ROL_CAJERO: Rol[] = ['CAJERO'];
const ROL_SUCURSAL: Rol[] = ['ADMIN_SUCURSAL'];
const ROL_SISTEMA: Rol[] = ['ADMIN_SISTEMA'];
const ROL_CHOFER: Rol[] = ['CHOFER'];

function opcionDe(ruta: string) {
  return MENU.flatMap((g) => g.opciones).find((o) => o.ruta === ruta)!;
}

describe('menu.config', () => {
  describe('puedeVer', () => {
    it('deja ver las opciones sin roles a cualquier cuenta con sesión', () => {
      // Arrange
      const opcion = opcionDe('/panel');

      // Act
      const visible = puedeVer(opcion, SIN_ROLES);

      // Assert
      expect(visible).toBeTrue();
    });

    it('deja ver una opción cuando la cuenta tiene uno de sus roles', () => {
      // Arrange
      const opcion = opcionDe('/panel/sucursales');

      // Act
      const visible = puedeVer(opcion, ROL_SISTEMA);

      // Assert
      expect(visible).toBeTrue();
    });

    it('oculta una opción cuando la cuenta no tiene ninguno de sus roles', () => {
      // Arrange
      const opcion = opcionDe('/panel/sucursales');

      // Act
      const visible = puedeVer(opcion, ROL_CLIENTE);

      // Assert
      expect(visible).toBeFalse();
    });

    it('oculta la opción cuando la cuenta está en la lista de excepciones', () => {
      // Arrange
      const opcion = { texto: 'Prueba', ruta: '/panel/prueba', icono: 'inicio', roles: SIN_ROLES, excepto: ROL_CLIENTE };

      // Act
      const visible = puedeVer(opcion, ROL_CLIENTE);

      // Assert
      expect(visible).toBeFalse();
    });

    it('deja ver la opción solo si el rol principal está en la lista', () => {
      // Arrange
      const opcion = { texto: 'Prueba', ruta: '/panel/prueba', icono: 'inicio', roles: SIN_ROLES, soloPrincipales: ROL_CAJERO };

      // Act
      const conCajero = puedeVer(opcion, ROL_CAJERO);
      const conCliente = puedeVer(opcion, ROL_CLIENTE);

      // Assert
      expect(conCajero).toBeTrue();
      expect(conCliente).toBeFalse();
    });
  });

  describe('menuPara', () => {
    it('muestra al cliente solo sus grupos', () => {
      // Arrange
      const roles = ROL_CLIENTE;

      // Act
      const grupos = menuPara(roles);

      // Assert
      const titulos = grupos.map((g) => g.titulo);
      expect(titulos).toContain('General');
      expect(titulos).toContain('Mis compras');
      expect(titulos).not.toContain('Administración');
      expect(titulos).not.toContain('Operación');
    });

    it('muestra al administrador del sistema las opciones de administración', () => {
      // Arrange
      const roles = ROL_SISTEMA;

      // Act
      const grupos = menuPara(roles);

      // Assert
      const rutas = grupos.flatMap((g) => g.opciones.map((o) => o.ruta));
      expect(rutas).toContain('/panel/usuarios');
      expect(rutas).toContain('/panel/sucursales');
      expect(rutas).toContain('/panel/reportes');
    });

    it('muestra al cajero la ventanilla', () => {
      // Arrange
      const roles = ROL_CAJERO;

      // Act
      const grupos = menuPara(roles);

      // Assert
      const rutas = grupos.flatMap((g) => g.opciones.map((o) => o.ruta));
      expect(rutas).toContain('/panel/mostrador');
      expect(rutas).toContain('/panel/ordenes');
    });

    it('muestra al administrador de sucursal la operación y el taller', () => {
      // Arrange
      const roles = ROL_SUCURSAL;

      // Act
      const grupos = menuPara(roles);

      // Assert
      const titulos = grupos.map((g) => g.titulo);
      expect(titulos).toContain('Operación');
      expect(titulos).toContain('Taller');
      expect(titulos).toContain('Ventanilla');
    });

    it('muestra al piloto sus viajes', () => {
      // Arrange
      const roles = ROL_CHOFER;

      // Act
      const grupos = menuPara(roles);

      // Assert
      const rutas = grupos.flatMap((g) => g.opciones.map((o) => o.ruta));
      expect(rutas).toContain('/panel/mis-viajes');
    });

    it('no devuelve grupos vacíos', () => {
      // Arrange
      const roles = ROL_CHOFER;

      // Act
      const grupos = menuPara(roles);

      // Assert
      expect(grupos.every((g) => g.opciones.length > 0)).toBeTrue();
    });
  });
});
