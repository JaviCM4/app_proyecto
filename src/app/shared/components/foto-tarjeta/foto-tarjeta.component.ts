import { Component, input } from '@angular/core';

/**
 * Foto con su pie, para reconocer de un vistazo un bus o a un piloto. Se usa al elegirlos (programar
 * un viaje, asignar un alquiler), al ver el detalle de un viaje y en la compra de boletos, donde el
 * pasajero necesita el color del bus para ubicarlo en la terminal.
 *
 * Sin foto muestra el mensaje de `vacio` en lugar de un hueco.
 */
@Component({
  selector: 'app-foto-tarjeta',
  standalone: true,
  templateUrl: './foto-tarjeta.component.html',
  styleUrl: './foto-tarjeta.component.scss',
})
export class FotoTarjetaComponent {
  readonly url = input<string | null>(null);
  /** Pie de la foto: la placa del bus o el nombre del piloto. */
  readonly titulo = input('');
  /** Qué decir cuando no hay foto (o todavía no se elige nada). */
  readonly vacio = input('Sin foto');
  /** Alto de la foto en píxeles. */
  readonly alto = input(150);
  /** Texto alternativo; si no se indica se usa el título. */
  readonly descripcion = input('');
  /** Abre la foto completa en otra pestaña al hacer clic. */
  readonly ampliable = input(false);
}
