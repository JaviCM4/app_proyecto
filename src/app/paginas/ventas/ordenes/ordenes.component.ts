import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Sucursal } from '../../../core/models/sucursal.model';
import { EstadoOrdenAlquiler, OrdenAlquiler } from '../../../core/models/venta.model';
import { AuthService } from '../../../core/services/auth.service';
import { OrdenesAlquilerService } from '../../../core/services/ordenes-alquiler.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ESTADO_ORDEN_ALQUILER } from '../../../shared/constants/ventas';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

type FiltroEstado = 'TODAS' | EstadoOrdenAlquiler;

/** Órdenes de pago de alquileres: listado, detalle y cobro en efectivo. */
@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    ModalComponent,
    ConfirmacionComponent,
    PaginadorComponent,
  ],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.scss',
})
export class OrdenesComponent implements OnInit {
  readonly estadoOrden = ESTADO_ORDEN_ALQUILER;
  private readonly auth = inject(AuthService);
  private readonly servicio = inject(OrdenesAlquilerService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');

  readonly estados: FiltroEstado[] = ['TODAS', ...this.servicio.estados()];

  private readonly ordenes = signal<OrdenAlquiler[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(true);

  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly estado = signal<FiltroEstado>('TODAS');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly enDetalle = signal<OrdenAlquiler | null>(null);
  readonly cargandoDetalle = signal(false);

  /** Orden a cobrar en efectivo (abre la confirmación con la fecha de hoy). */
  readonly porPagar = signal<OrdenAlquiler | null>(null);
  readonly confirmando = signal(false);
  readonly pagando = signal(false);

  readonly formPago = this.fb.nonNullable.group({
    fechaPago: [hoyGt(), Validators.required],
  });

  readonly paginaActual = computed(() => paginar(this.ordenes(), this.pagina(), this.tamano()));

  /** Nombre claro del estado de la orden (PENDIENTE_PAGO = alquiler ya cotizado, por cobrar). */
  estadoTexto(estado: EstadoOrdenAlquiler): string {
    switch (estado) {
      case 'PENDIENTE_PAGO':
        return 'Por cobrar';
      case 'PAGADA':
        return 'Pagada';
      case 'RECHAZADA':
        return 'Rechazada';
      case 'REEMBOLSADA':
        return 'Reembolsada';
    }
  }

  textoFiltro(estado: FiltroEstado): string {
    return estado === 'TODAS' ? 'Todos' : this.estadoTexto(estado);
  }

  ngOnInit(): void {
    if (this.esSistema) {
      this.sucursalesServicio.listar().subscribe({
        next: (lista) => this.sucursales.set(lista),
        error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
      });
    }
    this.cargar();
  }

  cambiarFiltro(): void {
    this.pagina.set(1);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .listar({
        sucursalId: this.sucursalId() || null,
        estado: this.estado() === 'TODAS' ? null : (this.estado() as EstadoOrdenAlquiler),
      })
      .subscribe({
        next: (lista) => {
          this.ordenes.set(lista);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron cargar las órdenes.'));
        },
      });
  }

  verDetalle(o: OrdenAlquiler): void {
    this.cargandoDetalle.set(true);
    this.enDetalle.set(o);
    this.servicio.detalle(o.ordenId).subscribe({
      next: (detalle) => {
        this.cargandoDetalle.set(false);
        this.enDetalle.set(detalle);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle de la orden.'));
      },
    });
  }

  abrirPagar(o: OrdenAlquiler): void {
    this.formPago.reset({ fechaPago: hoyGt() });
    this.confirmando.set(false);
    this.porPagar.set(o);
  }

  pedirConfirmacion(): void {
    if (this.formPago.invalid) {
      this.formPago.markAllAsTouched();
      return;
    }
    this.confirmando.set(true);
  }

  confirmarPagar(): void {
    const o = this.porPagar();
    if (!o) return;
    if (this.formPago.invalid) {
      this.formPago.markAllAsTouched();
      return;
    }
    this.pagando.set(true);
    this.servicio.pagarEfectivo(o.ordenId, this.formPago.getRawValue().fechaPago).subscribe({
      next: (actualizada) => {
        this.ordenes.update((lista) =>
          lista.map((x) => (x.ordenId === actualizada.ordenId ? actualizada : x)),
        );
        if (this.enDetalle()?.ordenId === actualizada.ordenId) this.enDetalle.set(actualizada);
        this.avisos.exito('Orden pagada en efectivo.');
        this.pagando.set(false);
        this.porPagar.set(null);
        this.confirmando.set(false);
      },
      error: (e) => {
        this.pagando.set(false);
        this.confirmando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo registrar el pago.'));
      },
    });
  }
}
