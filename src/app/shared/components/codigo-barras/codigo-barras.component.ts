import { Component, computed, input } from '@angular/core';
import { code128 } from '../../utils/codigo-barras';

/**
 * Código de barras Code 128 dibujado en SVG (sin librerías ni imágenes externas, para que entre en
 * el PDF del boleto tal como se ve). Lo lee la pistola USB de la sucursal.
 *
 * `orientacion="vertical"` acuesta las barras: el talón del boleto es alto y angosto, y así el código
 * cabe sin rotar nada con CSS (las rotaciones se pierden al capturar el ticket para el PDF).
 */
@Component({
  selector: 'app-codigo-barras',
  standalone: true,
  templateUrl: './codigo-barras.component.html',
  styleUrl: './codigo-barras.component.scss',
})
export class CodigoBarrasComponent {
  readonly texto = input.required<string>();
  readonly orientacion = input<'horizontal' | 'vertical'>('horizontal');
  /** Ancho de cada módulo en píxeles. Menos de 2 ya no se lee bien en papel. */
  readonly modulo = input(3);
  /** Largo de las barras en píxeles: el alto si es horizontal, el ancho si es vertical. */
  readonly grosor = input(60);

  readonly dibujo = computed(() => {
    const { barras, modulos } = code128(this.texto());
    if (modulos === 0) return null;
    const vertical = this.orientacion() === 'vertical';
    const largo = modulos * this.modulo();
    const ancho = vertical ? this.grosor() : largo;
    const alto = vertical ? largo : this.grosor();
    return {
      ancho,
      alto,
      vistas: `0 0 ${ancho} ${alto}`,
      barras: barras.map((b) =>
        vertical
          ? { x: 0, y: b.desde * this.modulo(), ancho: this.grosor(), alto: b.ancho * this.modulo() }
          : { x: b.desde * this.modulo(), y: 0, ancho: b.ancho * this.modulo(), alto: this.grosor() },
      ),
    };
  });
}
