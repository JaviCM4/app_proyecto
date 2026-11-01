import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UsuarioSesion } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { perfilCompletoGuard, perfilPendienteGuard } from './perfil-completo.guard';

/**
 * Pruebas unitarias de los guards de perfil completo.
 * Regla: una cuenta de Google sin DPI, teléfono ni dirección solo puede ver /completar-perfil.
 */

const URL_COMPLETAR = '/completar-perfil';
const URL_PANEL = '/panel';
const ARBOL_COMPLETAR = { ruta: URL_COMPLETAR } as unknown as UrlTree;
const ARBOL_PANEL = { ruta: URL_PANEL } as unknown as UrlTree;

const USUARIO_INCOMPLETO: UsuarioSesion = {
  usuarioId: 'usuario-1',
  correo: 'ana@pruebas.gt',
  nombre: 'Ana Pérez',
  roles: ['CLIENTE'],
  sucursalId: null,
  choferId: null,
  fotoUrl: null,
  perfilCompleto: false,
};

const USUARIO_COMPLETO: UsuarioSesion = { ...USUARIO_INCOMPLETO, perfilCompleto: true };

describe('guards de perfil completo', () => {
  let usuario: UsuarioSesion | null;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    // Arrange
    usuario = null;
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.callFake((ruta: unknown[]) => ({ ruta: ruta[0] }) as unknown as UrlTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { usuario: () => usuario } },
        { provide: Router, useValue: router },
      ],
    });
  });

  describe('perfilCompletoGuard', () => {
    function ejecutar(): boolean | UrlTree {
      const ruta = {} as ActivatedRouteSnapshot;
      const estado = {} as RouterStateSnapshot;
      return TestBed.runInInjectionContext(() => perfilCompletoGuard(ruta, estado)) as unknown as boolean | UrlTree;
    }

    it('deja pasar cuando no hay sesión', () => {
      // Arrange
      usuario = null;

      // Act
      const resultado = ejecutar();

      // Assert
      expect(resultado).toBeTrue();
    });

    it('deja pasar cuando el perfil está completo', () => {
      // Arrange
      usuario = USUARIO_COMPLETO;

      // Act
      const resultado = ejecutar();

      // Assert
      expect(resultado).toBeTrue();
    });

    it('manda a completar el perfil cuando falta información', () => {
      // Arrange
      usuario = USUARIO_INCOMPLETO;

      // Act
      const resultado = ejecutar();

      // Assert
      expect(resultado).toEqual(ARBOL_COMPLETAR);
      expect(router.createUrlTree).toHaveBeenCalledWith([URL_COMPLETAR]);
    });
  });

  describe('perfilPendienteGuard', () => {
    function ejecutar(): boolean | UrlTree {
      const ruta = {} as ActivatedRouteSnapshot;
      const estado = {} as RouterStateSnapshot;
      return TestBed.runInInjectionContext(() => perfilPendienteGuard(ruta, estado)) as unknown as boolean | UrlTree;
    }

    it('deja pasar cuando el perfil está pendiente', () => {
      // Arrange
      usuario = USUARIO_INCOMPLETO;

      // Act
      const resultado = ejecutar();

      // Assert
      expect(resultado).toBeTrue();
    });

    it('manda al panel cuando el perfil ya está completo', () => {
      // Arrange
      usuario = USUARIO_COMPLETO;

      // Act
      const resultado = ejecutar();

      // Assert
      expect(resultado).toEqual(ARBOL_PANEL);
      expect(router.createUrlTree).toHaveBeenCalledWith([URL_PANEL]);
    });
  });
});
