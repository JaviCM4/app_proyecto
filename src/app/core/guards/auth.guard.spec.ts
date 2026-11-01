import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

/**
 * Pruebas unitarias de authGuard.
 * Regla: sin sesión se manda al login recordando la página pedida.
 */

const URL_PEDIDA = '/panel/ventas';
const URL_LOGIN = '/login';
const ARBOL_LOGIN = { ruta: URL_LOGIN } as unknown as UrlTree;

describe('authGuard', () => {
  let autenticado: boolean;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // Arrange
    autenticado = false;
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(ARBOL_LOGIN);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { autenticado: () => autenticado } },
        { provide: Router, useValue: router },
      ],
    });
  });

  function ejecutar(): boolean | UrlTree {
    const ruta = {} as ActivatedRouteSnapshot;
    const estado = { url: URL_PEDIDA } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(ruta, estado)) as unknown as boolean | UrlTree;
  }

  it('deja pasar cuando hay sesión', () => {
    // Arrange
    autenticado = true;

    // Act
    const resultado = ejecutar();

    // Assert
    expect(resultado).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('manda al login con la página pedida cuando no hay sesión', () => {
    // Arrange
    autenticado = false;

    // Act
    const resultado = ejecutar();

    // Assert
    expect(resultado).toBe(ARBOL_LOGIN);
    expect(router.createUrlTree).toHaveBeenCalledWith([URL_LOGIN], { queryParams: { volver: URL_PEDIDA } });
  });
});
