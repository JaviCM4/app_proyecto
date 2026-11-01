import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconoComponent } from './icono.component';

/**
 * Pruebas unitarias del icono.
 * Regla: un nombre desconocido cae en el icono de inicio para no dejar un hueco.
 */

const ICONO_CONOCIDO = 'bus';
const ICONO_DESCONOCIDO = 'no-existe';
const TAMANO = 24;

describe('IconoComponent', () => {
  let fixture: ComponentFixture<IconoComponent>;
  let componente: IconoComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [IconoComponent] });
    fixture = TestBed.createComponent(IconoComponent);
    componente = fixture.componentInstance;
  });

  describe('trazo', () => {
    it('devuelve el trazo del icono pedido', () => {
      // Arrange
      fixture.componentRef.setInput('nombre', ICONO_CONOCIDO);

      // Act
      const trazo = componente.trazo();

      // Assert
      expect(trazo).toContain('M5 17V6');
    });

    it('cae en el icono de inicio cuando el nombre no existe', () => {
      // Arrange
      fixture.componentRef.setInput('nombre', ICONO_DESCONOCIDO);

      // Act
      const trazo = componente.trazo();

      // Assert
      expect(trazo).toContain('M3 10.5');
    });
  });

  describe('plantilla', () => {
    it('dibuja el SVG con el tamaño pedido', () => {
      // Arrange
      fixture.componentRef.setInput('nombre', ICONO_CONOCIDO);
      fixture.componentRef.setInput('tamano', TAMANO);

      // Act
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg') as SVGElement;

      // Assert
      expect(svg.getAttribute('width')).toBe(String(TAMANO));
      expect(svg.getAttribute('height')).toBe(String(TAMANO));
    });
  });
});
