import { ComponentFixture, TestBed } from '@angular/core/testing';
import { code128 } from '../../utils/codigo-barras';
import { CodigoBarrasComponent } from './codigo-barras.component';

/**
 * Pruebas unitarias del código de barras en SVG.
 * Regla: el dibujo cambia de tamaño según la orientación, pero siempre usa el mismo código.
 */

const TEXTO = 'A1B2C3D4E5F6';
const MODULO = 3;
const GROSOR = 60;

describe('CodigoBarrasComponent', () => {
  let fixture: ComponentFixture<CodigoBarrasComponent>;
  let componente: CodigoBarrasComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [CodigoBarrasComponent] });
    fixture = TestBed.createComponent(CodigoBarrasComponent);
    componente = fixture.componentInstance;
  });

  describe('dibujo', () => {
    it('calcula el ancho y el alto en horizontal', () => {
      // Arrange
      fixture.componentRef.setInput('texto', TEXTO);
      fixture.componentRef.setInput('modulo', MODULO);
      fixture.componentRef.setInput('grosor', GROSOR);
      const esperado = code128(TEXTO).modulos * MODULO;

      // Act
      const dibujo = componente.dibujo();

      // Assert
      expect(dibujo?.ancho).toBe(esperado);
      expect(dibujo?.alto).toBe(GROSOR);
    });

    it('acuesta las barras en vertical', () => {
      // Arrange
      fixture.componentRef.setInput('texto', TEXTO);
      fixture.componentRef.setInput('modulo', MODULO);
      fixture.componentRef.setInput('grosor', GROSOR);
      fixture.componentRef.setInput('orientacion', 'vertical');
      const esperado = code128(TEXTO).modulos * MODULO;

      // Act
      const dibujo = componente.dibujo();

      // Assert
      expect(dibujo?.ancho).toBe(GROSOR);
      expect(dibujo?.alto).toBe(esperado);
      expect(dibujo?.barras[0].x).toBe(0);
    });

    it('devuelve null cuando el texto no tiene caracteres válidos', () => {
      // Arrange
      fixture.componentRef.setInput('texto', '');

      // Act
      const dibujo = componente.dibujo();

      // Assert
      expect(dibujo).toBeNull();
    });
  });

  describe('plantilla', () => {
    it('dibuja el SVG con una barra por rectángulo', () => {
      // Arrange
      fixture.componentRef.setInput('texto', TEXTO);

      // Act
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
      const barras = svg.querySelectorAll('.barra');

      // Assert
      expect(barras.length).toBe(code128(TEXTO).barras.length);
    });

    it('no dibuja nada cuando el texto está vacío', () => {
      // Arrange
      fixture.componentRef.setInput('texto', '');

      // Act
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg');

      // Assert
      expect(svg).toBeNull();
    });
  });
});
