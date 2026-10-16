import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { MapaAsientos, Viaje } from '../../../core/models/viaje.model';
import { ViajesService } from '../../../core/services/viajes.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/** Modal con el mapa de asientos de un viaje (dato público). */
@Component({
  selector: 'app-asientos-viaje',
  standalone: true,
  imports: [ModalComponent, DatePipe, CurrencyPipe],
  templateUrl: './asientos-viaje.component.html',
  styleUrl: './asientos-viaje.component.scss',
})
export class AsientosViajeComponent {
  private readonly servicio = inject(ViajesService);
  readonly zona = ZONA_GT;

  readonly viaje = input<Viaje | null>(null);
  readonly cerrar = output<void>();

  readonly mapa = signal<MapaAsientos | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  constructor() {
    // Cada vez que se abre con un viaje, carga su mapa.
    effect(() => {
      const v = this.viaje();
      if (v) this.cargar(v.viajeId);
    });
  }

  private cargar(viajeId: string): void {
    this.mapa.set(null);
    this.error.set('');
    this.cargando.set(true);
    this.servicio.asientos(viajeId).subscribe({
      next: (m) => {
        this.mapa.set(m);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los asientos.'));
        this.cargando.set(false);
      },
    });
  }
}
