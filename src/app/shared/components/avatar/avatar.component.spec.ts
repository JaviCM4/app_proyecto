import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';

/**
 * Pruebas unitarias del avatar.
 * Regla: si la foto no carga se muestran las iniciales, nunca un hueco.
 */

const NOMBRE_COMPLETO = 'Ana Pérez';
const NOMBRE_UNO = 'Ana';
const NOMBRE_VACIO = '   ';
const FOTO = 'https://fotos/ana.png';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let componente: AvatarComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [AvatarComponent] });
    fixture = TestBed.createComponent(AvatarComponent);
    componente = fixture.componentInstance;
  });

  describe('iniciales', () => {
    it('usa la primera letra del nombre y del apellido', () => {
      // Arrange
      fixture.componentRef.setInput('nombre', NOMBRE_COMPLETO);

      // Act
      const iniciales = componente.iniciales();

      // Assert
      expect(iniciales).toBe('AP');
    });

    it('usa una sola letra cuando solo hay un nombre', () => {
      // Arrange
      fixture.componentRef.setInput('nombre', NOMBRE_UNO);

      // Act
      const iniciales = componente.iniciales();

      // Assert
      expect(iniciales).toBe('A');
    });

    it('usa un signo de pregunta cuando no hay nombre', () => {
      // Arrange
      fixture.componentRef.setInput('nombre', NOMBRE_VACIO);

      // Act
      const iniciales = componente.iniciales();

      // Assert
      expect(iniciales).toBe('?');
    });
  });

  describe('mostrarFoto', () => {
    it('muestra la foto cuando hay una URL', () => {
      // Arrange
      fixture.componentRef.setInput('foto', FOTO);

      // Act
      const mostrar = componente.mostrarFoto();

      // Assert
      expect(mostrar).toBeTrue();
    });

    it('no muestra la foto cuando no hay URL', () => {
      // Arrange
      fixture.componentRef.setInput('foto', null);

      // Act
      const mostrar = componente.mostrarFoto();

      // Assert
      expect(mostrar).toBeFalse();
    });

    it('vuelve a las iniciales cuando la foto falla', () => {
      // Arrange
      fixture.componentRef.setInput('foto', FOTO);

      // Act
      componente.fallo();

      // Assert
      expect(componente.mostrarFoto()).toBeFalse();
    });
  });

  describe('plantilla', () => {
    it('dibuja la imagen cuando hay foto', () => {
      // Arrange
      fixture.componentRef.setInput('foto', FOTO);

      // Act
      fixture.detectChanges();
      const imagen = fixture.nativeElement.querySelector('img') as HTMLImageElement;

      // Assert
      expect(imagen.src).toContain(FOTO);
    });

    it('dibuja las iniciales cuando no hay foto', () => {
      // Arrange
      fixture.componentRef.setInput('nombre', NOMBRE_COMPLETO);
      fixture.componentRef.setInput('foto', null);

      // Act
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector('span') as HTMLElement;

      // Assert
      expect(span.textContent).toContain('AP');
    });
  });
});
