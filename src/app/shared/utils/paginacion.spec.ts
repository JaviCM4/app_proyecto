import { normalizar, paginar } from './paginacion';

/**
 * Pruebas unitarias de la paginación en el navegador y de la búsqueda sin tildes.
 * Regla: la página pedida siempre cae dentro del rango válido.
 */

const TAMANO = 2;
const PAGINA_INICIAL = 1;
const ELEMENTOS = ['Ana', 'Beto', 'Carla', 'Diego', 'Elena'];
const VACIA: string[] = [];
const TEXTO_CON_TILDES = '  Quetzaltenango ';
const TEXTO_SIN_TILDES = 'quetzaltenango';
const TEXTO_NULO = null;

describe('paginacion', () => {
  describe('paginar', () => {
    it('devuelve la primera página con el tamaño indicado', () => {
      // Arrange
      const lista = ELEMENTOS;
      const pagina = PAGINA_INICIAL;
      const tamano = TAMANO;

      // Act
      const resultado = paginar(lista, pagina, tamano);

      // Assert
      expect(resultado.elementos).toEqual(['Ana', 'Beto']);
      expect(resultado.pagina).toBe(1);
      expect(resultado.total).toBe(ELEMENTOS.length);
      expect(resultado.totalPaginas).toBe(3);
    });

    it('devuelve la última página aunque no esté completa', () => {
      // Arrange
      const lista = ELEMENTOS;
      const pagina = 3;
      const tamano = TAMANO;

      // Act
      const resultado = paginar(lista, pagina, tamano);

      // Assert
      expect(resultado.elementos).toEqual(['Elena']);
      expect(resultado.pagina).toBe(3);
    });

    it('ajusta la página cuando se pide una menor que uno', () => {
      // Arrange
      const lista = ELEMENTOS;
      const pagina = 0;
      const tamano = TAMANO;

      // Act
      const resultado = paginar(lista, pagina, tamano);

      // Assert
      expect(resultado.pagina).toBe(1);
      expect(resultado.elementos).toEqual(['Ana', 'Beto']);
    });

    it('ajusta la página cuando se pide una mayor que el total', () => {
      // Arrange
      const lista = ELEMENTOS;
      const pagina = 99;
      const tamano = TAMANO;

      // Act
      const resultado = paginar(lista, pagina, tamano);

      // Assert
      expect(resultado.pagina).toBe(3);
      expect(resultado.elementos).toEqual(['Elena']);
    });

    it('devuelve una página vacía cuando la lista no tiene elementos', () => {
      // Arrange
      const lista = VACIA;
      const pagina = PAGINA_INICIAL;
      const tamano = TAMANO;

      // Act
      const resultado = paginar(lista, pagina, tamano);

      // Assert
      expect(resultado.elementos).toEqual([]);
      expect(resultado.total).toBe(0);
      expect(resultado.totalPaginas).toBe(1);
    });
  });

  describe('normalizar', () => {
    it('quita tildes, mayúsculas y espacios de los extremos', () => {
      // Arrange
      const texto = TEXTO_CON_TILDES;
      const esperado = TEXTO_SIN_TILDES;

      // Act
      const resultado = normalizar(texto);

      // Assert
      expect(resultado).toBe(esperado);
    });

    it('devuelve texto vacío cuando el valor es nulo', () => {
      // Arrange
      const texto = TEXTO_NULO;

      // Act
      const resultado = normalizar(texto);

      // Assert
      expect(resultado).toBe('');
    });
  });
});
