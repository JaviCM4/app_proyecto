import {
  CANAL_VENTA,
  ESTADO_ORDEN_ALQUILER,
  ESTADO_VENTA,
  ESTADO_VIAJE,
  METODO_PAGO,
  TIPO_VIAJE,
  VIAJE_BORRADO,
  codigoBoleto,
  codigoLegible,
  ordenarVentas,
  porProximaSalida,
  textoMotivo,
  textoViaje,
} from './ventas';

/**
 * Pruebas unitarias de las etiquetas y utilidades de ventas y viajes.
 * Regla: al usuario se le muestra texto en español, nunca el código interno.
 */

const MOTIVO_SALDO = 'SALDO_INSUFICIENTE';
const MOTIVO_TIEMPO = 'tiempo_agotado';
const MOTIVO_ESCRITO = 'El cliente pidió cancelar en ventanilla.';
const MOTIVO_VACIO = '   ';
const MENSAJE_POR_DEFECTO = 'Sin motivo registrado.';
const VENTA_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const CODIGO_VENTA = 'A1B2C3D4E5F6';
const CODIGO_CON_GUIONES = 'A1B2-C3D4-E5F6';
const ORIGEN = 'Xela';
const DESTINO = 'Guate';
const SALIDA = '2026-10-19T14:00:00Z';
const FECHA_PAGO_VIEJA = '2026-10-01T10:00:00-06:00';
const FECHA_PAGO_NUEVA = '2026-10-20T10:00:00-06:00';
const FECHA_REGISTRO_UNO = '2026-10-20T10:00:01-06:00';
const FECHA_REGISTRO_DOS = '2026-10-20T10:00:02-06:00';

describe('ventas y viajes', () => {
  describe('etiquetas de estado', () => {
    it('traduce el estado de una venta confirmada', () => {
      // Arrange
      const estado = 'CONFIRMADA';

      // Act
      const etiqueta = ESTADO_VENTA[estado];

      // Assert
      expect(etiqueta).toEqual({ texto: 'Confirmada', clase: 'exito' });
    });

    it('traduce el canal de una venta en línea', () => {
      // Arrange
      const canal = 'EN_LINEA';

      // Act
      const etiqueta = CANAL_VENTA[canal];

      // Assert
      expect(etiqueta).toBe('En línea');
    });

    it('traduce el método de pago con cartera', () => {
      // Arrange
      const metodo = 'CARTERA';

      // Act
      const etiqueta = METODO_PAGO[metodo];

      // Assert
      expect(etiqueta).toBe('Cartera digital');
    });

    it('traduce el estado de una orden de alquiler pagada', () => {
      // Arrange
      const estado = 'PAGADA';

      // Act
      const etiqueta = ESTADO_ORDEN_ALQUILER[estado];

      // Assert
      expect(etiqueta).toEqual({ texto: 'Pagada', clase: 'exito' });
    });

    it('traduce el tipo de viaje privado', () => {
      // Arrange
      const tipo = 'PRIVADO';

      // Act
      const etiqueta = TIPO_VIAJE[tipo];

      // Assert
      expect(etiqueta).toEqual({ texto: 'Privado', clase: 'aviso' });
    });

    it('ordena los estados del viaje para mostrarlos', () => {
      // Arrange
      const estado = 'EN_RUTA';

      // Act
      const etiqueta = ESTADO_VIAJE[estado];

      // Assert
      expect(etiqueta.orden).toBe(0);
      expect(etiqueta.texto).toBe('En ruta');
    });

    it('tiene un texto para el viaje eliminado', () => {
      // Arrange
      const texto = VIAJE_BORRADO;

      // Act
      const etiqueta = texto;

      // Assert
      expect(etiqueta).toBe('Viaje eliminado');
    });
  });

  describe('porProximaSalida', () => {
    it('ordena los viajes del más próximo al más lejano', () => {
      // Arrange
      const viajes = [
        { fechaSalidaProgramada: '2026-10-20T08:00:00-06:00', nombre: 'segundo' },
        { fechaSalidaProgramada: '2026-10-19T08:00:00-06:00', nombre: 'primero' },
      ];

      // Act
      const ordenados = porProximaSalida(viajes);

      // Assert
      expect(ordenados.map((v) => v.nombre)).toEqual(['primero', 'segundo']);
    });

    it('no modifica la lista original', () => {
      // Arrange
      const viajes = [
        { fechaSalidaProgramada: '2026-10-20T08:00:00-06:00' },
        { fechaSalidaProgramada: '2026-10-19T08:00:00-06:00' },
      ];
      const primeroOriginal = viajes[0];

      // Act
      porProximaSalida(viajes);

      // Assert
      expect(viajes[0]).toBe(primeroOriginal);
    });
  });

  describe('textoMotivo', () => {
    it('traduce un motivo conocido', () => {
      // Arrange
      const motivo = MOTIVO_SALDO;

      // Act
      const texto = textoMotivo(motivo);

      // Assert
      expect(texto).toBe('La billetera digital no tenía saldo suficiente.');
    });

    it('traduce un motivo aunque venga en minúsculas', () => {
      // Arrange
      const motivo = MOTIVO_TIEMPO;

      // Act
      const texto = textoMotivo(motivo);

      // Assert
      expect(texto).toBe('Se agotó el tiempo para pagar y los asientos se liberaron.');
    });

    it('devuelve tal cual un motivo escrito por una persona', () => {
      // Arrange
      const motivo = MOTIVO_ESCRITO;

      // Act
      const texto = textoMotivo(motivo);

      // Assert
      expect(texto).toBe(MOTIVO_ESCRITO);
    });

    it('devuelve el texto por defecto cuando el motivo está vacío', () => {
      // Arrange
      const motivo = MOTIVO_VACIO;

      // Act
      const texto = textoMotivo(motivo, MENSAJE_POR_DEFECTO);

      // Assert
      expect(texto).toBe(MENSAJE_POR_DEFECTO);
    });

    it('usa el texto por defecto cuando no se recibe un motivo', () => {
      // Arrange
      const motivo = undefined;

      // Act
      const texto = textoMotivo(motivo, MENSAJE_POR_DEFECTO);

      // Assert
      expect(texto).toBe(MENSAJE_POR_DEFECTO);
    });
  });

  describe('codigoBoleto', () => {
    it('usa el código que ya trae la venta', () => {
      // Arrange
      const venta = { codigo: CODIGO_VENTA, ventaId: VENTA_ID };

      // Act
      const codigo = codigoBoleto(venta);

      // Assert
      expect(codigo).toBe(CODIGO_VENTA);
    });

    it('calcula el código con el id cuando la venta no lo trae', () => {
      // Arrange
      const venta = { codigo: null, ventaId: VENTA_ID };

      // Act
      const codigo = codigoBoleto(venta);

      // Assert
      expect(codigo).toBe('A1B2C3D4E5F6');
    });

    it('pasa el código a mayúsculas', () => {
      // Arrange
      const venta = { codigo: 'abc123', ventaId: VENTA_ID };

      // Act
      const codigo = codigoBoleto(venta);

      // Assert
      expect(codigo).toBe('ABC123');
    });
  });

  describe('codigoLegible', () => {
    it('separa el código en grupos de cuatro', () => {
      // Arrange
      const codigo = CODIGO_VENTA;

      // Act
      const legible = codigoLegible(codigo);

      // Assert
      expect(legible).toBe(CODIGO_CON_GUIONES);
    });
  });

  describe('ordenarVentas', () => {
    it('muestra primero la venta pagada más recientemente', () => {
      // Arrange
      const ventas = [
        { id: 'vieja', fechaPago: FECHA_PAGO_VIEJA },
        { id: 'nueva', fechaPago: FECHA_PAGO_NUEVA },
      ];

      // Act
      const ordenadas = ordenarVentas(ventas);

      // Assert
      expect(ordenadas.map((v) => v.id)).toEqual(['nueva', 'vieja']);
    });

    it('desempata por la fecha de registro cuando el pago es el mismo día', () => {
      // Arrange
      const ventas = [
        { id: 'primera', fechaPago: FECHA_PAGO_NUEVA, fechaRegistro: FECHA_REGISTRO_UNO },
        { id: 'segunda', fechaPago: FECHA_PAGO_NUEVA, fechaRegistro: FECHA_REGISTRO_DOS },
      ];

      // Act
      const ordenadas = ordenarVentas(ventas);

      // Assert
      expect(ordenadas.map((v) => v.id)).toEqual(['segunda', 'primera']);
    });

    it('deja al final las ventas sin fecha de pago', () => {
      // Arrange
      const ventas = [
        { id: 'sin-pago', fechaPago: null },
        { id: 'pagada', fechaPago: FECHA_PAGO_NUEVA },
      ];

      // Act
      const ordenadas = ordenarVentas(ventas);

      // Assert
      expect(ordenadas.map((v) => v.id)).toEqual(['pagada', 'sin-pago']);
    });

    it('mantiene el orden cuando ninguna venta tiene fecha de pago ni de registro', () => {
      // Arrange
      const ventas = [
        { id: 'primera', fechaPago: null, fechaRegistro: null },
        { id: 'segunda', fechaPago: null },
      ];

      // Act
      const ordenadas = ordenarVentas(ventas);

      // Assert
      expect(ordenadas.map((v) => v.id)).toEqual(['primera', 'segunda']);
    });
  });

  describe('textoViaje', () => {
    it('arma origen, destino y fecha de salida', () => {
      // Arrange
      const origen = ORIGEN;
      const destino = DESTINO;
      const salida = SALIDA;

      // Act
      const texto = textoViaje(origen, destino, salida);

      // Assert
      expect(texto).toContain('Xela → Guate');
      expect(texto).toContain('19/10/2026');
    });

    it('arma solo la ruta cuando no hay fecha', () => {
      // Arrange
      const origen = ORIGEN;
      const destino = DESTINO;

      // Act
      const texto = textoViaje(origen, destino, null);

      // Assert
      expect(texto).toBe('Xela → Guate');
    });

    it('avisa que el viaje fue eliminado cuando no hay origen ni destino', () => {
      // Arrange
      const origen = null;
      const destino = null;

      // Act
      const texto = textoViaje(origen, destino, SALIDA);

      // Assert
      expect(texto).toBe(VIAJE_BORRADO);
    });

    it('arma solo la ruta cuando la fecha no es válida', () => {
      // Arrange
      const origen = ORIGEN;
      const destino = DESTINO;
      const salida = 'no-es-una-fecha';

      // Act
      const texto = textoViaje(origen, destino, salida);

      // Assert
      expect(texto).toBe('Xela → Guate');
    });

    it('muestra un guion cuando falta el origen o el destino', () => {
      // Arrange
      const origenAusente = textoViaje(null, DESTINO, null);
      const destinoAusente = textoViaje(ORIGEN, undefined, null);

      // Act
      const textos = [origenAusente, destinoAusente];

      // Assert
      expect(textos).toEqual(['— → Guate', 'Xela → —']);
    });
  });
});
