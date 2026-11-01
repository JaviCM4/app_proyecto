import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

/**
 * Pruebas unitarias del modal.
 * Regla: se cierra con la X, con el fondo o con Escape, pero no al hacer clic dentro.
 */

const TITULO = 'Nueva sucursal';
const SUBTITULO = 'Datos generales';

describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalComponent>;
  let componente: ModalComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [ModalComponent] });
    fixture = TestBed.createComponent(ModalComponent);
    componente = fixture.componentInstance;
  });

  function abrir(): void {
    fixture.componentRef.setInput('abierto', true);
    fixture.componentRef.setInput('titulo', TITULO);
    fixture.componentRef.setInput('subtitulo', SUBTITULO);
    fixture.detectChanges();
  }

  describe('visibilidad', () => {
    it('no dibuja nada cuando está cerrado', () => {
      // Arrange
      fixture.componentRef.setInput('abierto', false);

      // Act
      fixture.detectChanges();
      const fondo = fixture.nativeElement.querySelector('.modal-fondo');

      // Assert
      expect(fondo).toBeNull();
    });

    it('dibuja el título y el subtítulo cuando está abierto', () => {
      // Arrange
      abrir();

      // Act
      const titulo = fixture.nativeElement.querySelector('h2') as HTMLElement;
      const subtitulo = fixture.nativeElement.querySelector('.modal-encabezado p') as HTMLElement;

      // Assert
      expect(titulo.textContent).toContain(TITULO);
      expect(subtitulo.textContent).toContain(SUBTITULO);
    });
  });

  describe('cerrar', () => {
    it('emite cerrar al hacer clic en el fondo', () => {
      // Arrange
      abrir();
      let cerrado = false;
      componente.cerrar.subscribe(() => (cerrado = true));

      // Act
      (fixture.nativeElement.querySelector('.modal-fondo') as HTMLElement).click();

      // Assert
      expect(cerrado).toBeTrue();
    });

    it('no emite cerrar al hacer clic dentro del modal', () => {
      // Arrange
      abrir();
      let cerrado = false;
      componente.cerrar.subscribe(() => (cerrado = true));

      // Act
      (fixture.nativeElement.querySelector('.modal') as HTMLElement).click();

      // Assert
      expect(cerrado).toBeFalse();
    });

    it('emite cerrar con el botón de la X', () => {
      // Arrange
      abrir();
      let cerrado = false;
      componente.cerrar.subscribe(() => (cerrado = true));

      // Act
      (fixture.nativeElement.querySelector('.cerrar') as HTMLButtonElement).click();

      // Assert
      expect(cerrado).toBeTrue();
    });

    it('emite cerrar al presionar Escape cuando está abierto', () => {
      // Arrange
      abrir();
      let cerrado = false;
      componente.cerrar.subscribe(() => (cerrado = true));

      // Act
      componente.alPresionarEscape();

      // Assert
      expect(cerrado).toBeTrue();
    });

    it('ignora Escape cuando está cerrado', () => {
      // Arrange
      fixture.componentRef.setInput('abierto', false);
      let cerrado = false;
      componente.cerrar.subscribe(() => (cerrado = true));

      // Act
      componente.alPresionarEscape();

      // Assert
      expect(cerrado).toBeFalse();
    });
  });
});
