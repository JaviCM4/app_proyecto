import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginadorComponent } from './paginador.component';

/**
 * Pruebas unitarias del paginador.
 * Regla: la página pedida siempre cae dentro del rango y solo se avisa cuando cambia.
 */

const PAGINA = 3;
const TAMANO = 10;
const TOTAL = 42;
const TAMANO_NUEVO = 20;

describe('PaginadorComponent', () => {
  let fixture: ComponentFixture<PaginadorComponent>;
  let componente: PaginadorComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [PaginadorComponent] });
    fixture = TestBed.createComponent(PaginadorComponent);
    componente = fixture.componentInstance;
  });

  function configurar(pagina = PAGINA, tamano = TAMANO, total = TOTAL): void {
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('tamano', tamano);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
  }

  describe('cálculos', () => {
    it('calcula el total de páginas, el desde y el hasta', () => {
      // Arrange
      configurar();

      // Act
      const totalPaginas = componente.totalPaginas();
      const desde = componente.desde();
      const hasta = componente.hasta();

      // Assert
      expect(totalPaginas).toBe(5);
      expect(desde).toBe(21);
      expect(hasta).toBe(30);
    });

    it('muestra cero elementos cuando no hay resultados', () => {
      // Arrange
      configurar(1, TAMANO, 0);

      // Act
      const desde = componente.desde();
      const hasta = componente.hasta();

      // Assert
      expect(desde).toBe(0);
      expect(hasta).toBe(0);
      expect(componente.totalPaginas()).toBe(1);
    });

    it('limita la ventana a cinco números de página', () => {
      // Arrange
      configurar(3, TAMANO, 200);

      // Act
      const paginas = componente.paginas();

      // Assert
      expect(paginas).toEqual([1, 2, 3, 4, 5]);
    });

    it('corre la ventana al acercarse al final', () => {
      // Arrange
      configurar(19, TAMANO, 200);

      // Act
      const paginas = componente.paginas();

      // Assert
      expect(paginas).toEqual([16, 17, 18, 19, 20]);
    });
  });

  describe('ir', () => {
    it('emite la página cuando es válida y distinta', () => {
      // Arrange
      configurar();
      let emitida = 0;
      componente.cambioPagina.subscribe((p) => (emitida = p));

      // Act
      componente.ir(4);

      // Assert
      expect(emitida).toBe(4);
    });

    it('no emite la página actual', () => {
      // Arrange
      configurar();
      let emitida = 0;
      componente.cambioPagina.subscribe((p) => (emitida = p));

      // Act
      componente.ir(PAGINA);

      // Assert
      expect(emitida).toBe(0);
    });

    it('no emite una página fuera del rango', () => {
      // Arrange
      configurar();
      let emitida = 0;
      componente.cambioPagina.subscribe((p) => (emitida = p));

      // Act
      componente.ir(0);
      componente.ir(99);

      // Assert
      expect(emitida).toBe(0);
    });
  });

  describe('alCambiarTamano', () => {
    it('emite el tamaño elegido como número', () => {
      // Arrange
      configurar();
      let emitido = 0;
      componente.cambioTamano.subscribe((t) => (emitido = t));
      const evento = { target: { value: String(TAMANO_NUEVO) } } as unknown as Event;

      // Act
      componente.alCambiarTamano(evento);

      // Assert
      expect(emitido).toBe(TAMANO_NUEVO);
    });
  });

  describe('plantilla', () => {
    it('muestra el resumen y los controles', () => {
      // Arrange
      configurar();

      // Act
      const resumen = fixture.nativeElement.querySelector('.resumen') as HTMLElement;
      const numeros = fixture.nativeElement.querySelectorAll('.numero');

      // Assert
      expect(resumen.textContent).toContain('Mostrando 21–30 de 42');
      expect(numeros.length).toBe(5);
    });

    it('desactiva Anterior en la primera página', () => {
      // Arrange
      configurar(1);

      // Act
      const botones = fixture.nativeElement.querySelectorAll('.controles > button') as NodeListOf<HTMLButtonElement>;

      // Assert
      expect(botones[0].disabled).toBeTrue();
    });
  });
});
