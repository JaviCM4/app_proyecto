import { TestBed } from '@angular/core/testing';
import { Tema, TemaService } from './tema.service';

/**
 * Pruebas unitarias de TemaService.
 * Regla: la elección se guarda en este navegador y "sistema" sigue el modo del sistema operativo.
 */

const CLAVE = 'tema';
const TEMA_CLARO: Tema = 'claro';
const TEMA_OSCURO: Tema = 'oscuro';
const TEMA_CALIDO: Tema = 'calido';
const TEMA_SISTEMA: Tema = 'sistema';
const TEMA_INVALIDO = 'morado';

function crearMediaQuery(coincide: boolean): MediaQueryList {
  return {
    matches: coincide,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  } as unknown as MediaQueryList;
}

describe('TemaService', () => {
  beforeEach(() => {
    // Arrange
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('tema guardado', () => {
    it('usa el tema claro cuando no hay nada guardado', () => {
      // Arrange
      spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(false));

      // Act
      const servicio = TestBed.inject(TemaService);

      // Assert
      expect(servicio.tema()).toBe(TEMA_CLARO);
      expect(servicio.aplicado()).toBe(TEMA_CLARO);
    });

    it('recupera el tema guardado en el navegador', () => {
      // Arrange
      localStorage.setItem(CLAVE, TEMA_OSCURO);
      spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(false));

      // Act
      const servicio = TestBed.inject(TemaService);

      // Assert
      expect(servicio.tema()).toBe(TEMA_OSCURO);
      expect(servicio.aplicado()).toBe(TEMA_OSCURO);
    });

    it('ignora un tema guardado que no existe', () => {
      // Arrange
      localStorage.setItem(CLAVE, TEMA_INVALIDO);
      spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(false));

      // Act
      const servicio = TestBed.inject(TemaService);

      // Assert
      expect(servicio.tema()).toBe(TEMA_CLARO);
    });
  });

  describe('elegir', () => {
    it('guarda el tema elegido y lo aplica', () => {
      // Arrange
      spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(false));
      const servicio = TestBed.inject(TemaService);

      // Act
      servicio.elegir(TEMA_CALIDO);

      // Assert
      expect(servicio.tema()).toBe(TEMA_CALIDO);
      expect(servicio.aplicado()).toBe(TEMA_CALIDO);
      expect(localStorage.getItem(CLAVE)).toBe(TEMA_CALIDO);
    });
  });

  describe('tema del sistema', () => {
    it('aplica oscuro cuando el sistema está en modo oscuro', () => {
      // Arrange
      spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(true));
      const servicio = TestBed.inject(TemaService);

      // Act
      servicio.elegir(TEMA_SISTEMA);

      // Assert
      expect(servicio.tema()).toBe(TEMA_SISTEMA);
      expect(servicio.aplicado()).toBe(TEMA_OSCURO);
    });

    it('aplica claro cuando el sistema está en modo claro', () => {
      // Arrange
      spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(false));
      const servicio = TestBed.inject(TemaService);

      // Act
      servicio.elegir(TEMA_SISTEMA);

      // Assert
      expect(servicio.aplicado()).toBe(TEMA_CLARO);
    });
  });
});
