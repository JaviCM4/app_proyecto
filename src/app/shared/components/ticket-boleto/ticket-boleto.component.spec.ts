import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Venta } from '../../../core/models/venta.model';
import { ToastService } from '../../services/toast.service';
import { TicketBoletoComponent } from './ticket-boleto.component';

/**
 * Pruebas unitarias del boleto imprimible.
 * Regla: el talón lleva el código de la venta en barras y en grupos de cuatro.
 */

const VENTA_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const CODIGO = 'A1B2C3D4E5F6';
const CODIGO_ESCRITO = 'A1B2-C3D4-E5F6';
const ASIENTOS = '1, 2';
const NOMBRE_PASAJERO = 'Ana Pérez';

const VENTA: Venta = {
  ventaId: VENTA_ID,
  codigo: CODIGO,
  viajeId: 'viaje-1',
  canal: 'EN_LINEA',
  clienteNit: '1234567-8',
  clienteNombre: NOMBRE_PASAJERO,
  clienteCorreo: 'ana@pruebas.gt',
  sucursalId: 'sucursal-1',
  metodoPago: 'CARTERA',
  montoTotal: 90,
  fechaPago: '2026-10-31T10:00:00-06:00',
  estado: 'CONFIRMADA',
  motivoRechazo: null,
  motivoCancelacion: null,
  fechaCancelacion: null,
  boletos: [
    { boletoId: 'boleto-1', numeroAsiento: 1, precio: 45, estado: 'VALIDO' },
    { boletoId: 'boleto-2', numeroAsiento: 2, precio: 45, estado: 'VALIDO' },
  ],
  viaje: {
    origenNombre: 'Xela',
    destinoNombre: 'Guate',
    fechaSalida: '2026-11-01T08:00:00-06:00',
    busPlaca: 'M-123ABC',
    precioBoleto: 45,
  },
  version: 1,
};

describe('TicketBoletoComponent', () => {
  let fixture: ComponentFixture<TicketBoletoComponent>;
  let componente: TicketBoletoComponent;
  let avisos: ToastService;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [TicketBoletoComponent] });
    fixture = TestBed.createComponent(TicketBoletoComponent);
    componente = fixture.componentInstance;
    avisos = TestBed.inject(ToastService);
    fixture.componentRef.setInput('venta', VENTA);
  });

  describe('datos del boleto', () => {
    it('usa el código de la venta en las barras', () => {
      // Arrange
      const venta = VENTA;

      // Act
      const codigo = componente.codigo();

      // Assert
      expect(codigo).toBe(CODIGO);
    });

    it('separa el código en grupos de cuatro', () => {
      // Arrange
      const venta = VENTA;

      // Act
      const escrito = componente.codigoEscrito();

      // Assert
      expect(escrito).toBe(CODIGO_ESCRITO);
    });

    it('junta los números de asiento', () => {
      // Arrange
      const venta = VENTA;

      // Act
      const asientos = componente.asientos();

      // Assert
      expect(asientos).toBe(ASIENTOS);
    });

    it('muestra el estado de la venta', () => {
      // Arrange
      const esperado = 'Confirmada';

      // Act
      fixture.detectChanges();
      const estado = fixture.nativeElement.querySelector('.ticket-cajas') as HTMLElement;

      // Assert
      expect(estado.textContent).toContain(esperado);
    });
  });

  describe('imprimir', () => {
    it('marca el body y quita la marca al terminar', fakeAsync(() => {
      // Arrange
      spyOn(window, 'print');

      // Act
      componente.imprimir();
      const durante = document.body.classList.contains('imprimiendo-ticket');
      tick(1000);
      const despues = document.body.classList.contains('imprimiendo-ticket');

      // Assert
      expect(window.print).toHaveBeenCalled();
      expect(durante).toBeTrue();
      expect(despues).toBeFalse();
    }));
  });

  describe('descargarPdf', () => {
    it('avisa cuando todavía no hay ticket en pantalla', async () => {
      // Arrange
      const crear = spyOn(avisos, 'error');

      // Act
      await componente.descargarPdf();

      // Assert
      expect(crear).toHaveBeenCalledWith('No se pudo generar el PDF. Usa Imprimir.');
    });
  });

  describe('acciones', () => {
    it('oculta los botones cuando no se piden', () => {
      // Arrange
      fixture.componentRef.setInput('mostrarAcciones', false);

      // Act
      fixture.detectChanges();
      const acciones = fixture.nativeElement.querySelector('.ticket-acciones');

      // Assert
      expect(acciones).toBeNull();
    });

    it('muestra los botones de descargar e imprimir', () => {
      // Arrange
      fixture.componentRef.setInput('mostrarAcciones', true);

      // Act
      fixture.detectChanges();
      const botones = fixture.nativeElement.querySelectorAll('.ticket-acciones button');

      // Assert
      expect(botones.length).toBe(2);
    });
  });
});
