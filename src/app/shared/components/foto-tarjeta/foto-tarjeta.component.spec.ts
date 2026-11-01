import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FotoTarjetaComponent } from './foto-tarjeta.component';

/**
 * Pruebas unitarias de la tarjeta con foto.
 * Regla: sin foto se muestra el mensaje de vacío en lugar de un hueco.
 */

const FOTO = 'https://fotos/bus.png';
const TITULO = 'M-123ABC';
const VACIO = 'Sin foto';
const DESCRIPCION = 'Bus de la ruta Xela - Guate';

describe('FotoTarjetaComponent', () => {
  let fixture: ComponentFixture<FotoTarjetaComponent>;
  let componente: FotoTarjetaComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [FotoTarjetaComponent] });
    fixture = TestBed.createComponent(FotoTarjetaComponent);
    componente = fixture.componentInstance;
  });

  describe('sin foto', () => {
    it('muestra el mensaje de vacío', () => {
      // Arrange
      fixture.componentRef.setInput('url', null);
      fixture.componentRef.setInput('vacio', VACIO);

      // Act
      fixture.detectChanges();
      const vacio = fixture.nativeElement.querySelector('.sin-foto') as HTMLElement;

      // Assert
      expect(vacio.textContent).toContain(VACIO);
      expect(fixture.nativeElement.querySelector('img')).toBeNull();
    });
  });

  describe('con foto', () => {
    it('dibuja la imagen con el título como texto alternativo', () => {
      // Arrange
      fixture.componentRef.setInput('url', FOTO);
      fixture.componentRef.setInput('titulo', TITULO);

      // Act
      fixture.detectChanges();
      const imagen = fixture.nativeElement.querySelector('img') as HTMLImageElement;

      // Assert
      expect(imagen.src).toContain(FOTO);
      expect(imagen.alt).toBe(TITULO);
    });

    it('usa la descripción como texto alternativo cuando se indica', () => {
      // Arrange
      fixture.componentRef.setInput('url', FOTO);
      fixture.componentRef.setInput('titulo', TITULO);
      fixture.componentRef.setInput('descripcion', DESCRIPCION);

      // Act
      fixture.detectChanges();
      const imagen = fixture.nativeElement.querySelector('img') as HTMLImageElement;

      // Assert
      expect(imagen.alt).toBe(DESCRIPCION);
    });

    it('abre la foto completa cuando es ampliable', () => {
      // Arrange
      fixture.componentRef.setInput('url', FOTO);
      fixture.componentRef.setInput('ampliable', true);

      // Act
      fixture.detectChanges();
      const enlace = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

      // Assert
      expect(enlace.target).toBe('_blank');
      expect(enlace.href).toContain(FOTO);
    });

    it('muestra el pie con el título', () => {
      // Arrange
      fixture.componentRef.setInput('url', FOTO);
      fixture.componentRef.setInput('titulo', TITULO);

      // Act
      fixture.detectChanges();
      const pie = fixture.nativeElement.querySelector('figcaption') as HTMLElement;

      // Assert
      expect(pie.textContent).toContain(TITULO);
    });
  });
});
