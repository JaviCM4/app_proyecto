import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

/** Pregunta de confirmación antes de una acción (desactivar, eliminar, cancelar...). */
@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './confirmacion.component.html',
})
export class ConfirmacionComponent {
  readonly abierto = input(false);
  readonly titulo = input('¿Confirmar?');
  readonly mensaje = input('');
  readonly textoAceptar = input('Aceptar');
  readonly peligro = input(false);
  readonly procesando = input(false);

  readonly aceptar = output<void>();
  readonly cancelar = output<void>();
}
