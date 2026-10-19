import { Component, HostListener, input, output } from '@angular/core';

/**
 * Ventana modal genérica.
 * Uso:
 *   <app-modal [abierto]="mostrar" titulo="Nueva sucursal" (cerrar)="mostrar = false">
 *     ...contenido...
 *     <div pie> botones </div>
 *   </app-modal>
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  readonly abierto = input(false);
  readonly titulo = input('');
  readonly subtitulo = input('');
  /** amplio: casi todo el ancho en PC (resúmenes con mapa); en celular ocupa la pantalla igual que los demás. */
  readonly ancho = input<'chico' | 'mediano' | 'grande' | 'amplio'>('mediano');
  readonly cerrar = output<void>();

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.abierto()) this.cerrar.emit();
  }
}
