import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PoliticaCancelacion } from '../../../core/models/viaje.model';
import { AvisoCancelacionComponent } from './aviso-cancelacion.component';

/**
 * Pruebas unitarias del aviso de cancelación.
 * Regla: al cliente se le dice cuánto se le devuelve y en cuánto tiempo, en palabras.
 */

const JUSTIFICACION = 'Cancelación con más de 48 horas de anticipación.';

function politica(parcial: Partial<PoliticaCancelacion> = {}): PoliticaCancelacion {
  return {
    tarifaId: 'tarifa-1',
    permiteCancelacion: true,
    porcentajeReembolso: 50,
    justificacion: JUSTIFICACION,
    horasAntesDeSalida: 72,
    montoEstimadoReembolso: 500,
    ...parcial,
  };
}

describe('AvisoCancelacionComponent', () => {
  let fixture: ComponentFixture<AvisoCancelacionComponent>;
  let componente: AvisoCancelacionComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [AvisoCancelacionComponent] });
    fixture = TestBed.createComponent(AvisoCancelacionComponent);
    componente = fixture.componentInstance;
  });

  describe('plazo', () => {
    it('avisa que el viaje ya debió salir', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ horasAntesDeSalida: -1 }));

      // Act
      const plazo = componente.plazo();

      // Assert
      expect(plazo).toBe('el viaje ya debió salir');
    });

    it('avisa que falta menos de una hora', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ horasAntesDeSalida: 0 }));

      // Act
      const plazo = componente.plazo();

      // Assert
      expect(plazo).toBe('falta menos de una hora para la salida');
    });

    it('usa el singular con una hora', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ horasAntesDeSalida: 1 }));

      // Act
      const plazo = componente.plazo();

      // Assert
      expect(plazo).toBe('faltan 1 hora para la salida');
    });

    it('usa horas cuando faltan menos de dos días', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ horasAntesDeSalida: 35 }));

      // Act
      const plazo = componente.plazo();

      // Assert
      expect(plazo).toBe('faltan 35 horas para la salida');
    });

    it('usa días cuando faltan dos días o más', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ horasAntesDeSalida: 72 }));

      // Act
      const plazo = componente.plazo();

      // Assert
      expect(plazo).toBe('faltan 3 días para la salida');
    });

    it('no muestra plazo sin política', () => {
      // Arrange
      fixture.componentRef.setInput('politica', null);

      // Act
      const plazo = componente.plazo();

      // Assert
      expect(plazo).toBe('');
    });
  });

  describe('devolución', () => {
    it('hay devolución cuando se permite, hay porcentaje y monto', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica());

      // Act
      const hay = componente.hayDevolucion();

      // Assert
      expect(hay).toBeTrue();
    });

    it('no hay devolución sin monto estimado', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ montoEstimadoReembolso: null }));

      // Act
      const hay = componente.hayDevolucion();
      const sinPago = componente.sinPago();

      // Assert
      expect(hay).toBeFalse();
      expect(sinPago).toBeTrue();
    });

    it('no hay devolución cuando el porcentaje es cero', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ porcentajeReembolso: 0 }));

      // Act
      const hay = componente.hayDevolucion();

      // Assert
      expect(hay).toBeFalse();
    });
  });

  describe('plantilla', () => {
    it('muestra que se está consultando la política', () => {
      // Arrange
      fixture.componentRef.setInput('cargando', true);

      // Act
      fixture.detectChanges();
      const aviso = fixture.nativeElement.querySelector('.cargando') as HTMLElement;

      // Assert
      expect(aviso.textContent).toContain('Consultando la política');
    });

    it('muestra el porcentaje y el monto cuando hay devolución', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica());

      // Act
      fixture.detectChanges();
      const aviso = fixture.nativeElement.querySelector('.politica') as HTMLElement;

      // Assert
      expect(aviso.textContent).toContain('Se te devuelve 50%');
      expect(aviso.textContent).toContain('Q500.00');
    });

    it('avisa cuando ya no se puede cancelar', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ permiteCancelacion: false }));

      // Act
      fixture.detectChanges();
      const aviso = fixture.nativeElement.querySelector('.politica') as HTMLElement;

      // Assert
      expect(aviso.textContent).toContain('Ya no se puede cancelar');
    });

    it('avisa cuando no hay nada que devolver', () => {
      // Arrange
      fixture.componentRef.setInput('politica', politica({ montoEstimadoReembolso: null }));

      // Act
      fixture.detectChanges();
      const aviso = fixture.nativeElement.querySelector('.politica') as HTMLElement;

      // Assert
      expect(aviso.textContent).toContain('Sin cobro');
    });
  });
});
