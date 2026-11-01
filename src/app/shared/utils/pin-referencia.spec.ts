import { capaDeReferencias, iconoReferencia, PuntoReferencia } from './pin-referencia';

/**
 * Pruebas unitarias de los pines de referencia del mapa.
 * Regla: el ancla del pin va en la punta para que señale la coordenada exacta.
 */

const PUNTOS: PuntoReferencia[] = [
  { nombre: 'Terminal Xela', latitud: 14.8347, longitud: -91.5181 },
  { nombre: 'Terminal Guate', latitud: 14.6349, longitud: -90.5069 },
];

const ANCHO_PIN = 30;
const ALTO_PIN = 42;

describe('pin-referencia', () => {
  describe('iconoReferencia', () => {
    it('crea un pin con la clase y el tamaño del mapa', () => {
      // Arrange
      const ancho = ANCHO_PIN;
      const alto = ALTO_PIN;

      // Act
      const icono = iconoReferencia();

      // Assert
      expect(icono.options.className).toBe('punto-referencia');
      expect(icono.options.iconSize as unknown as number[]).toEqual([ancho, alto]);
    });

    it('ancla el pin en la punta de abajo', () => {
      // Arrange
      const anclaEsperada = [ANCHO_PIN / 2, ALTO_PIN];

      // Act
      const icono = iconoReferencia();

      // Assert
      expect(icono.options.iconAnchor as unknown as number[]).toEqual(anclaEsperada);
    });

    it('dibuja el pin como SVG', () => {
      // Arrange
      const html = iconoReferencia().options.html as string;

      // Act
      const esSvg = html.includes('<svg');

      // Assert
      expect(esSvg).toBeTrue();
    });
  });

  describe('capaDeReferencias', () => {
    it('crea un marcador por cada punto', () => {
      // Arrange
      const puntos = PUNTOS;

      // Act
      const capa = capaDeReferencias(puntos);

      // Assert
      expect(capa.getLayers().length).toBe(PUNTOS.length);
    });

    it('muestra el nombre de cada punto al pasar el cursor', () => {
      // Arrange
      const puntos = PUNTOS;

      // Act
      const capa = capaDeReferencias(puntos);

      // Assert
      const nombres = capa.getLayers().map((capa) => {
        const marcador = capa as unknown as { getTooltip: () => { getContent: () => string } | undefined };
        return marcador.getTooltip()?.getContent();
      });
      expect(nombres).toEqual(['Terminal Xela', 'Terminal Guate']);
    });

    it('no dibuja nada cuando no hay puntos', () => {
      // Arrange
      const puntos: PuntoReferencia[] = [];

      // Act
      const capa = capaDeReferencias(puntos);

      // Assert
      expect(capa.getLayers().length).toBe(0);
    });
  });
});
