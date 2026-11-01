import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmacionComponent } from './confirmacion.component';

/**
 * Pruebas unitarias del diálogo de confirmación.
 * Regla: aceptar y cancelar se avisan al componente que lo usa.
 */

const TITULO = 'Cancelar venta';
const MENSAJE = '¿Seguro que deseas cancelar la venta?';
const TEXTO_ACEPTAR = 'Cancelar venta';

describe('ConfirmacionComponent', () => {
  let fixture: ComponentFixture<ConfirmacionComponent>;
  let componente: ConfirmacionComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [ConfirmacionComponent] });
    fixture = TestBed.createComponent(ConfirmacionComponent);
    componente = fixture.componentInstance;
  });

  function abrir(): void {
    fixture.componentRef.setInput('abierto', true);
    fixture.componentRef.setInput('titulo', TITULO);
    fixture.componentRef.setInput('mensaje', MENSAJE);
    fixture.componentRef.setInput('textoAceptar', TEXTO_ACEPTAR);
    fixture.detectChanges();
  }

  function botonAceptar(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.modal-pie .primario, .modal-pie .peligro') as HTMLButtonElement;
  }

  describe('contenido', () => {
    it('muestra el título y el mensaje', () => {
      // Arrange
      abrir();

      // Act
      const titulo = fixture.nativeElement.querySelector('h2') as HTMLElement;
      const mensaje = fixture.nativeElement.querySelector('.modal-cuerpo p') as HTMLElement;

      // Assert
      expect(titulo.textContent).toContain(TITULO);
      expect(mensaje.textContent).toContain(MENSAJE);
    });

    it('muestra el texto del botón de aceptar', () => {
      // Arrange
      abrir();

      // Act
      const boton = botonAceptar();

      // Assert
      expect(boton.textContent).toContain(TEXTO_ACEPTAR);
    });

    it('marca el botón como peligro cuando se indica', () => {
      // Arrange
      fixture.componentRef.setInput('abierto', true);
      fixture.componentRef.setInput('peligro', true);
      fixture.detectChanges();

      // Act
      const boton = botonAceptar();

      // Assert
      expect(boton.classList).toContain('peligro');
    });
  });

  describe('acciones', () => {
    it('emite aceptar al pulsar el botón principal', () => {
      // Arrange
      abrir();
      let aceptado = false;
      componente.aceptar.subscribe(() => (aceptado = true));

      // Act
      botonAceptar().click();

      // Assert
      expect(aceptado).toBeTrue();
    });

    it('emite cancelar al pulsar el botón de cancelar', () => {
      // Arrange
      abrir();
      let cancelado = false;
      componente.cancelar.subscribe(() => (cancelado = true));

      // Act
      (fixture.nativeElement.querySelector('.modal-pie .btn:not(.primario):not(.peligro)') as HTMLButtonElement).click();

      // Assert
      expect(cancelado).toBeTrue();
    });
  });

  describe('procesando', () => {
    it('desactiva el botón y avisa que está procesando', () => {
      // Arrange
      abrir();
      fixture.componentRef.setInput('procesando', true);

      // Act
      fixture.detectChanges();
      const boton = botonAceptar();

      // Assert
      expect(boton.disabled).toBeTrue();
      expect(boton.textContent).toContain('Procesando');
    });
  });
});
