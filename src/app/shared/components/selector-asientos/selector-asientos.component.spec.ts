import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapaAsientos } from '../../../core/models/viaje.model';
import { SelectorAsientosComponent } from './selector-asientos.component';

/**
 * Pruebas unitarias del selector de asientos.
 * Regla: no se puede elegir un asiento ocupado, bloqueado ni más de los permitidos.
 */

const PRECIO = 45;
const MAXIMO = 2;
const ASIENTOS_IMPARES = [1, 2, 3, 4, 5];
const ASIENTOS_PARES = [1, 2, 3, 4];

function mapa(asientos: number[]): MapaAsientos {
  return {
    viajeId: 'viaje-1',
    origenNombre: 'Xela',
    destinoNombre: 'Guate',
    fechaSalida: '2026-11-01T08:00:00-06:00',
    busPlaca: 'M-123ABC',
    precioBoleto: PRECIO,
    capacidad: asientos.length,
    disponibles: asientos.length,
    asientos: asientos.map((numero) => ({
      numero,
      estado: numero === 2 ? 'OCUPADO' : 'DISPONIBLE',
    })),
  };
}

describe('SelectorAsientosComponent', () => {
  let fixture: ComponentFixture<SelectorAsientosComponent>;
  let componente: SelectorAsientosComponent;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [SelectorAsientosComponent] });
    fixture = TestBed.createComponent(SelectorAsientosComponent);
    componente = fixture.componentInstance;
  });

  function configurar(asientos = ASIENTOS_PARES): void {
    fixture.componentRef.setInput('mapa', mapa(asientos));
    fixture.componentRef.setInput('maximo', MAXIMO);
    fixture.detectChanges();
  }

  describe('filas', () => {
    it('arma una fila por cada grupo de cuatro asientos', () => {
      // Arrange
      configurar();

      // Act
      const filas = componente.filas();

      // Assert
      expect(filas.length).toBe(1);
      expect(filas[0][2].tipo).toBe('pasillo');
    });

    it('deja el asiento impar solo adelante', () => {
      // Arrange
      configurar(ASIENTOS_IMPARES);

      // Act
      const filas = componente.filas();

      // Assert
      expect(filas.length).toBe(2);
      expect(filas[0][0]).toEqual({ tipo: 'asiento', numero: 1 });
      expect(filas[0][1].tipo).toBe('vacia');
    });

    it('no arma filas cuando no hay mapa', () => {
      // Arrange
      fixture.componentRef.setInput('mapa', null);

      // Act
      const filas = componente.filas();

      // Assert
      expect(filas).toEqual([]);
    });
  });

  describe('estado de los asientos', () => {
    it('reconoce un asiento ocupado', () => {
      // Arrange
      configurar();

      // Act
      const ocupado = componente.ocupado(2);
      const libre = componente.ocupado(1);

      // Assert
      expect(ocupado).toBeTrue();
      expect(libre).toBeFalse();
    });

    it('reconoce los asientos del pasajero', () => {
      // Arrange
      configurar();
      fixture.componentRef.setInput('propios', [3]);

      // Act
      const propio = componente.propio(3);
      const ajeno = componente.propio(1);

      // Assert
      expect(propio).toBeTrue();
      expect(ajeno).toBeFalse();
    });
  });

  describe('alternar', () => {
    it('agrega y quita un asiento libre', () => {
      // Arrange
      configurar();

      // Act
      componente.alternar(1);
      const elegido = componente.elegido(1);
      componente.alternar(1);
      const quitado = componente.elegido(1);

      // Assert
      expect(elegido).toBeTrue();
      expect(quitado).toBeFalse();
    });

    it('calcula la cantidad y el total', () => {
      // Arrange
      configurar();

      // Act
      componente.alternar(1);
      componente.alternar(3);

      // Assert
      expect(componente.cantidad()).toBe(2);
      expect(componente.total()).toBe(PRECIO * 2);
    });

    it('no pasa del máximo de asientos', () => {
      // Arrange
      configurar();

      // Act
      componente.alternar(1);
      componente.alternar(3);
      componente.alternar(4);

      // Assert
      expect(componente.cantidad()).toBe(MAXIMO);
    });

    it('ignora un asiento ocupado', () => {
      // Arrange
      configurar();

      // Act
      componente.alternar(2);

      // Assert
      expect(componente.cantidad()).toBe(0);
    });

    it('ignora cualquier asiento cuando está bloqueado', () => {
      // Arrange
      configurar();
      fixture.componentRef.setInput('bloqueado', true);

      // Act
      componente.alternar(1);

      // Assert
      expect(componente.cantidad()).toBe(0);
    });

    it('emite la selección al elegir', () => {
      // Arrange
      configurar();
      let seleccion: number[] = [];

      // Act
      componente.seleccion.subscribe((s) => (seleccion = s));
      componente.alternar(1);

      // Assert
      expect(seleccion).toEqual([1]);
    });
  });

  describe('limpiar', () => {
    it('quita todos los asientos elegidos', () => {
      // Arrange
      configurar();
      componente.alternar(1);

      // Act
      componente.limpiar();

      // Assert
      expect(componente.cantidad()).toBe(0);
    });
  });

  describe('plantilla', () => {
    it('dibuja un botón por asiento y desactiva el ocupado', () => {
      // Arrange
      configurar();

      // Act
      const botones = fixture.nativeElement.querySelectorAll('.asiento') as NodeListOf<HTMLButtonElement>;

      // Assert
      expect(botones.length).toBe(ASIENTOS_PARES.length);
      expect(botones[1].disabled).toBeTrue();
    });
  });
});
