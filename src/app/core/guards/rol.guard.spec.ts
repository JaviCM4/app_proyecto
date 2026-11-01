import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Rol, UsuarioSesion } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { rolGuard } from './rol.guard';

/**
 * Pruebas unitarias de rolGuard.
 * Regla: sin el rol pedido, la cuenta regresa al inicio del panel.
 */

const URL_PANEL = '/panel';
const ARBOL_PANEL = { ruta: URL_PANEL } as unknown as UrlTree;

function usuarioCon(roles: Rol[]): UsuarioSesion {
  return {
    usuarioId: 'usuario-1',
    correo: 'ana@pruebas.gt',
    nombre: 'Ana Pérez',
    roles,
    sucursalId: null,
    choferId: null,
    fotoUrl: null,
    perfilCompleto: true,
  };
}

describe('rolGuard', () => {
  let usuario: UsuarioSesion | null;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // Arrange
    usuario = usuarioCon(['CAJERO']);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(ARBOL_PANEL);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            usuario: () => usuario,
            tieneRol: (...roles: Rol[]) => !!usuario?.roles.some((rol) => roles.includes(rol)),
          },
        },
        { provide: Router, useValue: router },
      ],
    });
  });

  function ejecutar(data: Record<string, unknown>): boolean | UrlTree {
    const ruta = { data } as unknown as ActivatedRouteSnapshot;
    const estado = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => rolGuard(ruta, estado)) as unknown as boolean | UrlTree;
  }

  it('deja pasar cuando la ruta no pide roles', () => {
    // Arrange
    const data = {};

    // Act
    const resultado = ejecutar(data);

    // Assert
    expect(resultado).toBeTrue();
  });

  it('deja pasar cuando la cuenta tiene uno de los roles pedidos', () => {
    // Arrange
    const data = { roles: ['CAJERO', 'ADMIN_SUCURSAL'] };

    // Act
    const resultado = ejecutar(data);

    // Assert
    expect(resultado).toBeTrue();
  });

  it('regresa al panel cuando la cuenta no tiene el rol pedido', () => {
    // Arrange
    const data = { roles: ['ADMIN_SISTEMA'] };

    // Act
    const resultado = ejecutar(data);

    // Assert
    expect(resultado).toBe(ARBOL_PANEL);
  });

  it('deja pasar cuando el rol principal está en la lista', () => {
    // Arrange
    const data = { rolesPrincipales: ['CAJERO', 'CLIENTE'] };

    // Act
    const resultado = ejecutar(data);

    // Assert
    expect(resultado).toBeTrue();
  });

  it('regresa al panel cuando el rol principal no está en la lista', () => {
    // Arrange
    const data = { rolesPrincipales: ['ADMIN_SUCURSAL'] };

    // Act
    const resultado = ejecutar(data);

    // Assert
    expect(resultado).toBe(ARBOL_PANEL);
  });

  it('deja pasar solo al cliente cuando la ruta es soloCliente', () => {
    // Arrange
    usuario = usuarioCon(['CLIENTE']);
    const data = { soloCliente: true };

    // Act
    const resultado = ejecutar(data);

    // Assert
    expect(resultado).toBeTrue();
  });

  it('regresa al panel cuando la ruta es soloCliente y no es cliente', () => {
    // Arrange
    const data = { soloCliente: true };

    // Act
    const resultado = ejecutar(data);

    // Assert
    expect(resultado).toBe(ARBOL_PANEL);
  });
});
