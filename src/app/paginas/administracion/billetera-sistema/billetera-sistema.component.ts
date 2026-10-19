import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarteraSistema, MovimientoCartera, ordenarMovimientos } from '../../../core/models/cartera.model';
import { CarteraSistemaService } from '../../../core/services/cartera-sistema.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT } from '../../../core/utils/fechas';
import { IconoComponent } from '../../../shared/components/icono/icono.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

type FiltroTipo = '' | 'COBRO' | 'DEVOLUCION';

/**
 * Billetera del sistema (administrador del sistema): el dinero de las compras en línea entra aquí y los
 * reembolsos salen de aquí. Solo consulta: el retiro a una cuenta bancaria queda indicado para integrarse.
 */
@Component({
  selector: 'app-billetera-sistema',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, PaginadorComponent, ModalComponent, IconoComponent],
  templateUrl: './billetera-sistema.component.html',
  styleUrl: './billetera-sistema.component.scss',
})
export class BilleteraSistemaComponent implements OnInit {
  private readonly servicio = inject(CarteraSistemaService);
  private readonly avisos = inject(ToastService);

  readonly billetera = signal<CarteraSistema | null>(null);
  readonly zona = ZONA_GT;
  private readonly movimientos = signal<MovimientoCartera[]>([]);
  readonly cargando = signal(true);
  readonly mostrandoRetiro = signal(false);

  desde = '';
  hasta = '';
  readonly tipo = signal<FiltroTipo>('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly filtrados = computed(() => this.movimientos().filter((m) => !this.tipo() || m.tipo === this.tipo()));
  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  /** Totales del rango consultado (los de la tarjeta principal son de toda la historia). */
  readonly resumenRango = computed(() => {
    const suma = (t: FiltroTipo) => this.movimientos().filter((m) => m.tipo === t).reduce((a, m) => a + Number(m.monto), 0);
    return { cobros: suma('COBRO'), devoluciones: suma('DEVOLUCION'), cantidad: this.movimientos().length };
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.consultar().subscribe({
      next: (b) => this.billetera.set(b),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudo consultar la billetera del sistema.')),
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

  descripcion(m: MovimientoCartera): string {
    const que = m.tipoReferencia === 'ALQUILER' ? 'alquiler de bus' : 'boletos en línea';
    return m.tipo === 'COBRO' ? `Cobro de ${que}` : `Reembolso de ${que}`;
  }

  /** Primeros caracteres del id de la venta u orden, para reconocerla en Ventas u Órdenes. */
  referencia(m: MovimientoCartera): string {
    return m.referenciaId ? m.referenciaId.slice(0, 8).toUpperCase() : '—';
  }
}
