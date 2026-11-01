import { ZONA_GT, ahoraGt, fechaHoraGt, hoyGt } from './fechas';

/**
 * Pruebas unitarias de las fechas de negocio.
 * Regla: todo se calcula en hora de Guatemala (UTC-6, sin horario de verano).
 */

const ZONA_ESPERADA = '-0600';
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const LOCAL_SIN_ZONA = '2026-10-25T06:00';
const LOCAL_CON_ZONA = '2026-10-25T06:00:00-06:00';
const LOCAL_UTC = '2026-10-25T12:00:00Z';
const DIAS_EXTRA = 3;

describe('Fechas de negocio (Guatemala)', () => {
  describe('ZONA_GT', () => {
    it('representa la zona de Guatemala sin horario de verano', () => {
      // Arrange
      const zonaEsperada = ZONA_ESPERADA;

      // Act
      const zona = ZONA_GT;

      // Assert
      expect(zona).toBe(zonaEsperada);
    });
  });

  describe('hoyGt', () => {
    it('devuelve la fecha de hoy con formato yyyy-MM-dd', () => {
      // Arrange
      const formato = FORMATO_FECHA;

      // Act
      const fecha = hoyGt();

      // Assert
      expect(fecha).toMatch(formato);
    });

    it('suma los dias extra que recibe', () => {
      // Arrange
      const hoy = hoyGt();
      const esperado = new Date(`${hoy}T00:00:00Z`);
      esperado.setUTCDate(esperado.getUTCDate() + DIAS_EXTRA);

      // Act
      const fecha = hoyGt(DIAS_EXTRA);

      // Assert
      expect(fecha).toBe(esperado.toISOString().slice(0, 10));
    });
  });

  describe('ahoraGt', () => {
    it('devuelve la fecha y hora actual con formato datetime-local', () => {
      // Arrange
      const formato = FORMATO_FECHA_HORA;

      // Act
      const fechaHora = ahoraGt();

      // Assert
      expect(fechaHora).toMatch(formato);
    });
  });

  describe('fechaHoraGt', () => {
    it('agrega los segundos y la zona de Guatemala a un datetime-local', () => {
      // Arrange
      const local = LOCAL_SIN_ZONA;
      const esperado = LOCAL_CON_ZONA;

      // Act
      const resultado = fechaHoraGt(local);

      // Assert
      expect(resultado).toBe(esperado);
    });

    it('deja igual un valor que ya trae zona horaria', () => {
      // Arrange
      const conZona = LOCAL_CON_ZONA;

      // Act
      const resultado = fechaHoraGt(conZona);

      // Assert
      expect(resultado).toBe(conZona);
    });

    it('deja igual un valor que ya trae la Z de UTC', () => {
      // Arrange
      const enUtc = LOCAL_UTC;

      // Act
      const resultado = fechaHoraGt(enUtc);

      // Assert
      expect(resultado).toBe(enUtc);
    });
  });
});
