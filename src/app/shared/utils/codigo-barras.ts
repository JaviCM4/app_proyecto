/**
 * Generador de códigos de barras Code 128 (juego B), sin librerías.
 *
 * Se usa en el boleto impreso: el talón lleva el código de la venta en barras para que la sucursal
 * lo lea con la pistola USB al momento de un reembolso, en lugar de teclear el código a mano.
 *
 * Code 128 dibuja cada carácter con 6 elementos (3 barras y 3 espacios alternados, empezando por
 * barra) que suman 11 módulos. El patrón de cada valor está en TRAMAS, en el orden del estándar:
 * TRAMAS[v] es el ancho de cada elemento del valor v. El último (2331112) es la parada, que lleva
 * 7 elementos y 13 módulos.
 *
 * Un símbolo completo es: inicio B (104) + un valor por carácter + dígito de control + parada.
 * El control es (104 + Σ posición × valor) módulo 103, contando la primera posición como 1.
 */

/** Patrones del estándar: 103 valores, inicios A/B/C (103, 104, 105) y la parada (106). */
const TRAMAS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const INICIO_B = 104;
const PARADA = 106;
/** Zona muda: el estándar pide al menos 10 módulos en blanco a cada lado para que el lector enganche. */
const MARGEN = 10;

export interface Barra {
  /** Posición del borde izquierdo de la barra, en módulos desde el inicio del dibujo. */
  desde: number;
  /** Ancho de la barra, en módulos. */
  ancho: number;
}

export interface CodigoBarras {
  /** Barras negras; los espacios son los huecos entre ellas. */
  barras: Barra[];
  /** Ancho total del dibujo en módulos, márgenes incluidos. */
  modulos: number;
}

/**
 * Convierte el texto en barras. Solo admite caracteres ASCII imprimibles (32 a 126), que es lo que
 * cubre el juego B; cualquier otro carácter se descarta. Con texto vacío devuelve cero barras.
 */
export function code128(texto: string): CodigoBarras {
  const valores = [...texto]
    .map((caracter) => caracter.charCodeAt(0) - 32)
    .filter((valor) => valor >= 0 && valor <= 94);
  if (valores.length === 0) return { barras: [], modulos: 0 };

  let suma = INICIO_B;
  valores.forEach((valor, indice) => (suma += valor * (indice + 1)));
  const simbolos = [INICIO_B, ...valores, suma % 103, PARADA];

  const barras: Barra[] = [];
  let posicion = MARGEN;
  for (const simbolo of simbolos) {
    [...TRAMAS[simbolo]].forEach((ancho, indice) => {
      const modulos = Number(ancho);
      // Los elementos alternan barra y espacio empezando por barra: los pares son barra.
      if (indice % 2 === 0) barras.push({ desde: posicion, ancho: modulos });
      posicion += modulos;
    });
  }
  return { barras, modulos: posicion + MARGEN };
}
