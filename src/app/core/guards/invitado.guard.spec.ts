import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { invitadoGuard } from './invitado.guard';

/**
 * Pruebas unitarias de invitadoGuard.
 * Regla: login y registro no se muestran si la cuenta ya tiene sesión.
 */

const URL_PANEL = '/panel';
const ARBOL_PANEL = { ruta: URL_PANEL } as unknown as UrlTree;

describe('invitadoGuard', () => {
  let autenticado: boolean;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // Arrange
    autenticado = false;
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(ARBOL_PANEL);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { autenticado: () => autenticado } },
        { provide: Router, useValue: router },
      ],
    });
  });

  function ejecutar(): boolean | UrlTree {
    const ruta = {} as ActivatedRouteSnapshot;
    const estado = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => invitadoGuard(ruta, estado)) as unknown as boolean | UrlTree;
  }

  it('deja pasar cuando no hay sesión', () => {
    // Arrange
    autenticado = false;

    // Act
    const resultado = ejecutar();

    // Assert
    expect(resultado).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('manda al panel cuando ya hay sesión', () => {
    // Arrange
    autenticado = true;

    // Act
    const resultado = ejecutar();

    // Assert
    expect(resultado).toBe(ARBOL_PANEL);
    expect(router.createUrlTree).toHaveBeenCalledWith([URL_PANEL]);
  });
});
