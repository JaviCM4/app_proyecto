import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Viaje } from '../../../core/models/viaje.model';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';
import { AsientosViajeComponent } from '../../publico/asientos-viaje/asientos-viaje.component';

/** Compra de boletos en línea: busca viajes y abre el mapa de asientos para elegir y pagar. */
@Component({
  selector: 'app-comprar',
  standalone: true,
  imports: [FormsModule, PaginadorComponent, DatePipe, CurrencyPipe, AsientosViajeComponent],
  templateUrl: './comprar.component.html',
  styleUrl: './comprar.component.scss',
})
export class ComprarComponent implements OnInit {
  private readonly viajesServicio = inject(ViajesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);

  readonly zona = ZONA_GT;

  readonly sucursales = signal<Sucursal[]>([]);
  readonly origenId = signal('');
  readonly destinoId = signal('');
  readonly desde = signal(hoyGt());
  readonly hasta = signal('');

  private readonly viajes = signal<Viaje[]>([]);
  readonly buscando = signal(false);
  readonly buscoAlgunaVez = signal(false);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly paginaActual = computed(() => paginar(this.viajes(), this.pagina(), this.tamano()));

  readonly viajeSeleccionado = signal<Viaje | null>(null);

  /** Viaje a reabrir al volver del login (?abrirViaje=ID). */
  readonly abrirViaje = input<string>();
  private readonly autoAbierto = signal(false);

  constructor() {
    // Al volver del login con un viaje pendiente se abre otra vez su mapa de asientos.
    effect(() => {
      const id = this.abrirViaje();
      if (!id || this.autoAbierto()) return;
      const viaje = this.viajes().find((v) => v.viajeId === id);
      if (viaje) {
        this.viajeSeleccionado.set(viaje);
        this.autoAbierto.set(true);
      }
    });
  }

  ngOnInit(): void {
    this.sucursalesServicio.listar(true).subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.buscar();
  }

  buscar(): void {
    this.buscando.set(true);
    this.buscoAlgunaVez.set(true);
    this.pagina.set(1);
    const origen = this.origenId() || null;
    this.viajesServicio
      .buscar({ sucursalId: origen, desde: this.desde() || null, hasta: this.hasta() || null })
      .subscribe({
        next: (lista) => {
          const ahora = Date.now();
          const destino = this.destinoId()
            ? this.sucursales().find((s) => s.sucursalId === this.destinoId())
            : undefined;
          this.viajes.set(
            lista.filter((v) => {
              if (v.estado !== 'PROGRAMADO') return false;
              if (Number.isNaN(Date.parse(v.fechaSalidaProgramada))) return false;
              if (Date.parse(v.fechaSalidaProgramada) <= ahora) return false;
              if (destino && normalizar(v.destinoNombre) !== normalizar(destino.nombre)) return false;
              return true;
            }),
          );
          this.buscando.set(false);
        },
        error: (e) => {
          this.buscando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron buscar los viajes.'));
        },
      });
  }

  /** Duración estimada del viaje para la tarjeta. */
  duracion(v: Viaje): string {
    const minutos = Math.round((Date.parse(v.fechaLlegadaEstimada) - Date.parse(v.fechaSalidaProgramada)) / 60000);
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  }
}
