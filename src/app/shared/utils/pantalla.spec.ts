import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { pantallaGrande } from './pantalla';

/**
 * Pruebas unitarias de pantallaGrande.
 * Regla: el indicador sigue el ancho de la ventana y deja de escuchar al destruirse.
 */

const MINIMO = 1024;

@Component({ standalone: true, template: '' })
class AnfitrionComponent {
  readonly grande = pantallaGrande(MINIMO);
}

function crearMediaQuery(coincide: boolean, alCambiar: { listener?: (e: MediaQueryListEvent) => void }): MediaQueryList {
  return {
    matches: coincide,
    media: `(min-width: ${MINIMO}px)`,
    addEventListener: (_tipo: string, listener: (e: MediaQueryListEvent) => void) => {
      alCambiar.listener = listener;
    },
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  } as unknown as MediaQueryList;
}

describe('pantallaGrande', () => {
  it('empieza en verdadero cuando la ventana es ancha', () => {
    // Arrange
    spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(true, {}));

    // Act
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();

    // Assert
    expect(fixture.componentInstance.grande()).toBeTrue();
    fixture.destroy();
  });

  it('empieza en falso cuando la ventana es angosta', () => {
    // Arrange
    spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(false, {}));

    // Act
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();

    // Assert
    expect(fixture.componentInstance.grande()).toBeFalse();
    fixture.destroy();
  });

  it('se actualiza cuando cambia el ancho de la ventana', () => {
    // Arrange
    const cambio: { listener?: (e: MediaQueryListEvent) => void } = {};
    spyOn(window, 'matchMedia').and.returnValue(crearMediaQuery(false, cambio));
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();

    // Act
    cambio.listener?.({ matches: true } as MediaQueryListEvent);

    // Assert
    expect(fixture.componentInstance.grande()).toBeTrue();
    fixture.destroy();
  });

  it('deja de escuchar cuando el componente se destruye', () => {
    // Arrange
    const media = crearMediaQuery(false, {});
    spyOn(media, 'removeEventListener');
    spyOn(window, 'matchMedia').and.returnValue(media);
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();

    // Act
    fixture.destroy();

    // Assert
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
