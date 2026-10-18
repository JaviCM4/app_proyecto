import { Component, inject } from '@angular/core';
import { Tema, TemaService } from '../../../core/services/tema.service';
import { IconoComponent } from '../icono/icono.component';

interface OpcionTema {
  valor: Tema;
  texto: string;
  icono: string;
}

/** Botones para cambiar el tema (claro, oscuro, cálido o el del sistema). */
@Component({
  selector: 'app-selector-tema',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './selector-tema.component.html',
  styleUrl: './selector-tema.component.scss',
})
export class SelectorTemaComponent {
  readonly tema = inject(TemaService);

  readonly opciones: readonly OpcionTema[] = [
    { valor: 'claro', texto: 'Claro', icono: 'sol' },
    { valor: 'oscuro', texto: 'Oscuro', icono: 'luna' },
    { valor: 'calido', texto: 'Cálido', icono: 'taza' },
    { valor: 'sistema', texto: 'Como el sistema', icono: 'monitor' },
  ];
}
