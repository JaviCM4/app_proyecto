import { code128 } from './codigo-barras';

/**
 * Pruebas unitarias del generador Code 128.
 * Regla: cada carácter ocupa 11 módulos y la parada 13; hay 10 módulos de margen a cada lado.
 */

const MARGEN = 10;
const MODULOS_SIMBOLO = 11;
const MODULOS_PARADA = 13;
const BARRAS_UN_CARACTER = 13;
const BARRAS_DOS_CARACTERES = 16;
const TEXTO_UNO = 'A';
const TEXTO_DOS = 'AB';
const TEXTO_NO_ASCII = 'ñ';
const TEXTO_MEZCLADO = 'Añ';

describe('codigo-barras', () => {
  describe('code128', () => {
    it('devuelve un dibujo vacío cuando el texto está vacío', () => {
      // Arrange
      const texto = '';

      // Act
      const codigo = code128(texto);

      // Assert
      expect(codigo.barras).toEqual([]);
      expect(codigo.modulos).toBe(0);
    });

    it('dibuja inicio, carácter, control y parada para un solo carácter', () => {
      // Arrange
      const texto = TEXTO_UNO;
      const modulosEsperados = MARGEN + MODULOS_SIMBOLO * 3 + MODULOS_PARADA + MARGEN;

      // Act
      const codigo = code128(texto);

      // Assert
      expect(codigo.barras.length).toBe(BARRAS_UN_CARACTER);
      expect(codigo.modulos).toBe(modulosEsperados);
      expect(codigo.barras[0].desde).toBe(MARGEN);
    });

    it('agrega tres barras por cada carácter adicional', () => {
      // Arrange
      const texto = TEXTO_DOS;

      // Act
      const codigo = code128(texto);

      // Assert
      expect(codigo.barras.length).toBe(BARRAS_DOS_CARACTERES);
    });

    it('descarta los caracteres que no existen en el juego B', () => {
      // Arrange
      const texto = TEXTO_NO_ASCII;

      // Act
      const codigo = code128(texto);

      // Assert
      expect(codigo.barras).toEqual([]);
      expect(codigo.modulos).toBe(0);
    });

    it('dibuja igual un texto con caracteres descartados', () => {
      // Arrange
      const limpio = code128(TEXTO_UNO);

      // Act
      const mezclado = code128(TEXTO_MEZCLADO);

      // Assert
      expect(mezclado.modulos).toBe(limpio.modulos);
      expect(mezclado.barras.length).toBe(limpio.barras.length);
    });

    it('todas las barras quedan dentro del ancho total', () => {
      // Arrange
      const texto = TEXTO_DOS;

      // Act
      const codigo = code128(texto);

      // Assert
      const dentro = codigo.barras.every((b) => b.desde >= MARGEN && b.desde + b.ancho <= codigo.modulos - MARGEN);
      expect(dentro).toBeTrue();
    });
  });
});
