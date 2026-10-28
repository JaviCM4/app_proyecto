import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Alquiler, EstadoAlquiler, EstadoViaje } from '../../../core/models/viaje.model';
import { OrdenAlquiler } from '../../../core/models/venta.model';
import { AlquileresService } from '../../../core/services/alquileres.service';
import { AuthService } from '../../../core/services/auth.service';
import { OrdenesAlquilerService } from '../../../core/services/ordenes-alquiler.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, ahoraGt, fechaHoraGt, hoyGt } from '../../../core/utils/fechas';
import { FotoTarjetaComponent } from '../../../shared/components/foto-tarjeta/foto-tarjeta.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ESTADO_ORDEN_ALQUILER, textoMotivo } from '../../../shared/constants/ventas';
import { AvisosMenuService } from '../../../shared/services/avisos-menu.service';
import { ToastService } from '../../../shared/services/toast.service';
import { pantallaGrande } from '../../../shared/utils/pantalla';
import { paginar } from '../../../shared/utils/paginacion';

type FiltroEstado = 'TODAS' | EstadoAlquiler;

const TEXTO: Record<EstadoAlquiler, string> = {
  SOLICITADO: 'Solicitado',
  COTIZADO: 'Cotizado',
  PAGADO: 'Pagado',
  ASIGNADO: 'Asignado',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

const CLASE: Record<EstadoAlquiler, string> = {
  SOLICITADO: 'aviso',
  COTIZADO: 'primario',
  PAGADO: 'info',
  ASIGNADO: 'info',
  COMPLETADO: 'exito',
  CANCELADO: 'peligro',
};

const TEXTO_VIAJE: Record<EstadoViaje, string> = {
  PROGRAMADO: 'Programado',
  EN_RUTA: 'En ruta',
  COMPLETADO: 'Completado',
};

/** Alquileres del cliente: seguimiento de cada solicitud y cancelación mientras esté pendiente. */
@Component({
  selector: 'app-mis-alquileres',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, CurrencyPipe, ModalComponent, PaginadorComponent, RouterLink,
    MapaRecorridoComponent, FotoTarjetaComponent],
  templateUrl: './mis-alquileres.component.html',
  styleUrl: './mis-alquileres.component.scss',
})
export class MisAlquileresComponent implements OnInit {
  private readonly servicio = inject(AlquileresService);
  private readonly ordenesServicio = inject(OrdenesAlquilerService);
  private readonly avisos = inject(ToastService);
  private readonly avisosMenu = inject(AvisosMenuService);
  private readonly fb = inject(FormBuilder);

  /** En el backend, un alquiler que solicita un cajero es de mostrador: no lo puede pedir como cliente. */
  /** Cualquier cuenta con rol Cliente (también cajeros y administradores) puede pedir otro alquiler. */
  readonly puedeSolicitar = inject(AuthService).tieneRol('CLIENTE');
  readonly zona = ZONA_GT;
  /** El motivo del rechazo viene como código del backend: aquí se muestra en palabras. */
  readonly motivo = textoMotivo;
  readonly estadoOrden = ESTADO_ORDEN_ALQUILER;
  /** En PC el detalle se abre amplio, con el mapa grande al lado de los datos. */
  readonly pantallaGrande = pantallaGrande();

  private readonly alquileres = signal<Alquiler[]>([]);
  /** Órdenes de pago pendientes, indexadas por alquiler, para pagar aquí mismo con la cartera. */
  private readonly ordenes = signal<Map<string, OrdenAlquiler>>(new Map());
  readonly cargando = signal(true);
  readonly estado = signal<FiltroEstado>('TODAS');
  readonly pagina = signal(1);
  readonly tamano = signal(9);

  readonly enDetalle = signal<Alquiler | null>(null);
  /** Pestaña del detalle: el alquiler, el bus asignado o la orden de pago (las dos últimas si aplican). */
  readonly pestana = signal<'alquiler' | 'bus' | 'orden'>('alquiler');

  verDetalle(a: Alquiler): void {
    this.pestana.set('alquiler');
    this.enDetalle.set(a);
  }
  readonly porCancelar = signal<Alquiler | null>(null);
  readonly enviando = signal(false);
  readonly pagandoId = signal<string | null>(null);

  /**
   * Lo que respondió el servidor si rechazó la cancelación: es la justificación de la tarifa que
   * aplicó. Se muestra dentro del modal, que queda abierto para poder cambiar la fecha y reintentar.
   */
  readonly errorCancelar = signal<string | null>(null);

  readonly formCancelar = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(255)]],
    /**
     * Momento de la cancelación que indica el cliente. Es el que decide qué tramo de la tarifa
     * aplica, igual que la fecha de solicitud en T16, para poder probar la política sin esperar.
     */
    fechaHoraCancelacion: [ahoraGt(), Validators.required],
  });

  readonly filtrados = computed(() => {
    const estado = this.estado();
    return this.alquileres().filter((a) => estado === 'TODAS' || a.estado === estado);
  });

  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.cargarOrdenes();
    this.servicio.mios().subscribe({
      next: (lista) => {
        this.alquileres.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar tus alquileres.'));
      },
    });
  }

  /** Órdenes de pago del cliente por alquiler; si falla, el pago simplemente no se ofrece. */
  private cargarOrdenes(): void {
    this.ordenesServicio.mias().subscribe({
      next: (lista) => {
        const porAlquiler = new Map<string, OrdenAlquiler>();
        for (const o of lista) porAlquiler.set(o.alquilerId, o);
        this.ordenes.set(porAlquiler);
      },
      error: () => this.ordenes.set(new Map()),
    });
  }

  /** Tarifa aplicada: se deduce del estimado para explicar de dónde sale el precio. */
  tarifa(a: Alquiler): number | null {
    if (!a.kmEstimados) return null;
    return Math.round((a.precioEstimado / a.kmEstimados) * 100) / 100;
  }

  /** ¿El alquiler tiene puntos del mapa? Las solicitudes viejas no los tienen. */
  tieneRecorrido(a: Alquiler): boolean {
    return (a.origenLatitud !== null && a.origenLongitud !== null)
      || (a.destinoLatitud !== null && a.destinoLongitud !== null);
  }

  ordenDe(a: Alquiler): OrdenAlquiler | undefined {
    return this.ordenes().get(a.alquilerId);
  }

  /** Paga el alquiler cotizado con la cartera; el cobro se confirma de forma asíncrona (saga). */
  pagar(a: Alquiler): void {
    const orden = this.ordenDe(a);
    if (!orden || this.pagandoId()) return;
    this.pagandoId.set(orden.ordenId);
    this.ordenesServicio.pagarCartera(orden.ordenId, hoyGt()).subscribe({
      next: () => {
        this.avisos.info('Pago en proceso, confirmando el cobro a tu cartera…');
        this.seguirPago(orden.ordenId);
      },
      error: (e) => {
        this.pagandoId.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo iniciar el pago.'));
      },
    });
  }

  private seguirPago(ordenId: string): void {
    this.ordenesServicio.seguirHastaFin(ordenId).subscribe({
      next: (o) => {
        if (o.estado === 'PENDIENTE_PAGO') return;
        this.pagandoId.set(null);
        this.avisosMenu.refrescar();
        if (o.estado === 'PAGADA') {
          this.avisos.exito('Alquiler pagado con tu cartera.');
        } else {
          this.avisos.error(o.motivoRechazo ?? 'El pago fue rechazado.');
        }
        this.cargar();
      },
      error: (e) => {
        this.pagandoId.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo confirmar el pago.'));
        this.cargar();
      },
    });
  }

  cambiarEstado(valor: FiltroEstado): void {
    this.estado.set(valor);
    this.pagina.set(1);
  }

  texto(e: EstadoAlquiler): string {
    return TEXTO[e];
  }

  clase(e: EstadoAlquiler): string {
    return CLASE[e];
  }

  /** Estado del viaje privado ya asignado (bus y chofer). */
  viajeTexto(e: EstadoViaje): string {
    return TEXTO_VIAJE[e];
  }

  total(a: Alquiler): number {
    return a.precioConfirmado ?? a.precioEstimado;
  }

  /** Explica en qué momento va el alquiler; así el texto siempre tiene sentido (no se pide pagar algo ya pagado). */
  aviso(a: Alquiler): string {
    switch (a.estado) {
      case 'SOLICITADO':
        return 'La sucursal está revisando tu solicitud y confirmará el precio.';
      case 'COTIZADO':
        return 'El precio ya está confirmado: paga con tu cartera para reservar el bus y el piloto.';
      case 'PAGADO':
        return 'Pago confirmado. La sucursal asignará el bus y el piloto; aquí verás los datos.';
      case 'ASIGNADO':
        return 'Bus y piloto asignados. ¡Te esperamos en la salida!';
      case 'COMPLETADO':
        return 'Viaje completado. ¡Gracias por viajar con nosotros!';
      case 'CANCELADO':
        return this.huboCobro(a)
          ? 'Alquiler cancelado. En la pestaña de reembolso ves cuánto se devuelve y cómo.'
          : 'Solicitud cancelada. No se realizó ningún cobro.';
    }
  }

  /** ¿Se puede cancelar? Desde PAGADO el cliente también puede, aceptando la penalización. */
  sePuedeCancelar(a: Alquiler): boolean {
    return a.estado === 'SOLICITADO' || a.estado === 'COTIZADO' || a.estado === 'PAGADO' || a.estado === 'ASIGNADO';
  }

  /** La orden llegó a pagarse, así que hay dinero de por medio (cancelar implica devolver algo). */
  huboCobro(a: Alquiler): boolean {
    const orden = this.ordenDe(a);
    return !!orden && (orden.estado === 'CANCELADA' || orden.estado === 'REEMBOLSADA' || orden.estado === 'PAGADA');
  }

  /** La pestaña de la orden aparece en cuanto Sales la crea, o sea desde que el alquiler se cotiza. */
  tieneOrden(a: Alquiler): boolean {
    return this.ordenDe(a) !== undefined;
  }

  /** Dentro de la orden, el bloque del reembolso solo tiene sentido si el alquiler se canceló. */
  tieneReembolso(a: Alquiler): boolean {
    const orden = this.ordenDe(a);
    return !!orden && (orden.estado === 'CANCELADA' || orden.estado === 'REEMBOLSADA');
  }

  /** Qué le toca hacer al cliente con esta orden, en una línea. */
  avisoOrden(a: Alquiler): string {
    const orden = this.ordenDe(a);
    if (!orden) return '';
    switch (orden.estado) {
      case 'PENDIENTE_PAGO':
        return 'Pendiente de pago: puedes pagarla con tu billetera digital o en la ventanilla de la sucursal.';
      case 'PAGADA':
        return 'Pago confirmado.';
      case 'RECHAZADA':
        return 'El cobro a tu billetera no se pudo hacer. Puedes reintentarlo desde la tarjeta del alquiler.';
      case 'CANCELADA':
        return this.medioDevolucion(a);
      case 'REEMBOLSADA':
        return 'El dinero ya se devolvió.';
    }
  }

  /** Cómo le vuelve el dinero al cliente: a su billetera o en la ventanilla. */
  medioDevolucion(a: Alquiler): string {
    return this.ordenDe(a)?.metodoPago === 'CARTERA'
      ? 'Se acredita en tu billetera digital automáticamente.'
      : 'Pasa a la sucursal con tu documento: el efectivo se entrega en ventanilla.';
  }

  abrirCancelar(a: Alquiler): void {
    this.formCancelar.reset({ motivo: '', fechaHoraCancelacion: ahoraGt() });
    this.errorCancelar.set(null);
    this.porCancelar.set(a);
  }

  /** Cierra el detalle y abre la cancelación para el alquiler que se estaba viendo. */
  cancelarDesdeDetalle(): void {
    const a = this.enDetalle();
    if (!a) return;
    this.enDetalle.set(null);
    this.abrirCancelar(a);
  }

  /**
   * Se envía siempre: quien decide si la cancelación procede es el backend, que resuelve la tarifa
   * con la fecha y la hora indicadas. Si la rechaza, el mensaje que devuelve es la justificación de
   * la tarifa y se muestra dentro del modal, que queda abierto para corregir la fecha y reintentar.
   */
  cancelar(): void {
    const a = this.porCancelar();
    if (!a) return;
    if (this.formCancelar.invalid) {
      this.formCancelar.markAllAsTouched();
      return;
    }
    const f = this.formCancelar.getRawValue();
    this.errorCancelar.set(null);
    this.enviando.set(true);
    this.servicio
      .cancelar(a.alquilerId, {
        motivo: f.motivo.trim(),
        fechaHoraCancelacion: fechaHoraGt(f.fechaHoraCancelacion),
        version: a.version,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.porCancelar.set(null);
          this.avisos.exito('Alquiler cancelado. Revisa la orden de pago para ver el reembolso.');
          this.avisosMenu.refrescar();
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formCancelar, e);
          this.errorCancelar.set(mensajeError(e, 'No se pudo cancelar el alquiler.'));
        },
      });
  }
}
