import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cartera, MovimientoCartera, TipoMovimiento, ordenarMovimientos } from '../../../core/models/cartera.model';
import { CarteraService } from '../../../core/services/cartera.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT } from '../../../core/utils/fechas';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';
import { RecargaComponent } from '../recarga/recarga.component';

/** Cartera digital: saldo, recargas y movimientos. */
@Component({
  selector: 'app-cartera',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, PaginadorComponent, RecargaComponent],
  templateUrl: './cartera.component.html',
  styleUrl: './cartera.component.scss',
})
export class CarteraComponent implements OnInit {
  private readonly servicio = inject(CarteraService);
  private readonly avisos = inject(ToastService);

  readonly cartera = signal<Cartera | null>(null);
  readonly zona = ZONA_GT;
  private readonly movimientos = signal<MovimientoCartera[]>([]);
  readonly cargando = signal(true);
  readonly recargando = signal(false);

  desde = '';
  hasta = '';
  readonly tipo = signal<TipoMovimiento | ''>('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly filtrados = computed(() => this.movimientos().filter((m) => !this.tipo() || m.tipo === this.tipo()));
  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  /** Totales del rango consultado. */
  readonly resumen = computed(() => {
    const suma = (t: TipoMovimiento) => this.movimientos().filter((m) => m.tipo === t).reduce((a, m) => a + Number(m.monto), 0);
    return { recargas: suma('RECARGA'), pagos: suma('DEBITO'), reembolsos: suma('REEMBOLSO') };
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.consultar().subscribe({
      next: (c) => this.cartera.set(c),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudo consultar tu saldo.')),
    });
    this.servicio.movimientos(this.desde, this.hasta).subscribe({
      next: (lista) => {
        this.movimientos.set(ordenarMovimientos(lista));
        this.pagina.set(1);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar los movimientos.'));
      },
    });
  }

  limpiarFechas(): void {
    this.desde = '';
    this.hasta = '';
    this.cargar();
  }

  alRecargar(): void {
    this.recargando.set(false);
    this.cargar();
  }

  /** Descripción entendible del movimiento. */
  descripcion(m: MovimientoCartera): string {
    if (m.tipo === 'RECARGA') return 'Recarga de saldo';
    const que = m.tipoReferencia === 'ALQUILER' ? 'alquiler de bus' : 'boletos';
    return m.tipo === 'DEBITO' ? `Pago de ${que}` : `Reembolso de ${que}`;
  }

  /** Recargas y reembolsos suman; pagos restan. */
  signo(m: MovimientoCartera): number {
    return m.tipo === 'DEBITO' ? -1 : 1;
  }
}
