import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Sucursal } from '../../../core/models/sucursal.model';
import { EstadoVenta, Venta } from '../../../core/models/venta.model';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { VentasService } from '../../../core/services/ventas.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT } from '../../../core/utils/fechas';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { TicketBoletoComponent } from '../../../shared/components/ticket-boleto/ticket-boleto.component';
import {
  CANAL_VENTA,
  ESTADO_VENTA,
  METODO_PAGO,
  codigoBoleto,
  codigoLegible,
  ordenarVentas,
  textoMotivo,
} from '../../../shared/constants/ventas';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';

/** Qué se lista: lo que falta devolver o lo que ya se devolvió. */
type Vista = 'POR_DEVOLVER' | 'DEVUELTAS';

/**
 * Reembolsos de ventanilla. Una venta en línea se pagó con la cartera, así que al cancelarse el
 * dinero vuelve solo. Una venta presencial se pagó en efectivo: el cliente llega con su boleto
 * impreso y la sucursal le devuelve el dinero en mano, y es eso lo que se registra aquí.
 *
 * El boleto se encuentra escaneando su código de barras con la pistola USB (que escribe el código y
 * manda Enter, igual que un teclado) o escribiendo el código, el NIT, el nombre o el correo.
 */
@Component({
  selector: 'app-reembolsos',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    ModalComponent,
    ConfirmacionComponent,
    PaginadorComponent,
    TicketBoletoComponent,
  ],
  templateUrl: './reembolsos.component.html',
  styleUrl: './reembolsos.component.scss',
})
export class ReembolsosComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly servicio = inject(VentasService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);

  /** El administrador del sistema solo consulta: el efectivo lo entrega la sucursal que vendió. */
  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly puedeReembolsar = this.auth.tieneRol('CAJERO', 'ADMIN_SUCURSAL');

  readonly estadoVenta = ESTADO_VENTA;
  readonly canalVenta = CANAL_VENTA;
  readonly metodoPago = METODO_PAGO;
  readonly zona = ZONA_GT;
  /** Los motivos que son código de la saga se muestran en palabras; el resto, tal cual. */
  readonly motivo = textoMotivo;

  private readonly buscador = viewChild<ElementRef<HTMLInputElement>>('buscador');

  private readonly ventas = signal<Venta[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(true);

  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly vista = signal<Vista>('POR_DEVOLVER');
  readonly texto = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly buscandoCodigo = signal(false);

  readonly enDetalle = signal<Venta | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly confirmando = signal(false);
  readonly reembolsando = signal(false);

  readonly filtradas = computed(() => {
    const buscado = normalizar(this.texto());
    if (!buscado) return this.ventas();
    return this.ventas().filter((v) =>
      normalizar(
        `${codigoBoleto(v)} ${v.clienteNit ?? ''} ${v.clienteNombre ?? ''} ${v.clienteCorreo ?? ''}`,
      ).includes(buscado),
    );
  });

  readonly paginaActual = computed(() => paginar(this.filtradas(), this.pagina(), this.tamano()));

  readonly mensajeConfirmacion = computed(() => {
    const v = this.enDetalle();
    return v && this.enEfectivo(v)
      ? 'La compra queda reembolsada y no se puede deshacer. Entrega el efectivo al cliente y quédate con el boleto.'
      : 'Se le volverá a pedir el reembolso a la billetera digital del cliente.';
  });

  /** Total que la sucursal tiene pendiente de devolver en efectivo con los filtros actuales. */
  readonly totalEnEfectivo = computed(() =>
    this.filtradas()
      .filter((v) => v.metodoPago === 'EFECTIVO' && v.estado !== 'REEMBOLSADA')
      .reduce((suma, v) => suma + v.montoTotal, 0),
  );

  ngOnInit(): void {
    if (this.esSistema) {
      this.sucursalesServicio.listar().subscribe({
        next: (lista) => this.sucursales.set(lista),
        error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
      });
    }
    this.cargar();
  }

  /** Código de la venta tal como va en el boleto, en grupos de cuatro. */
  codigo(v: Venta): string {
    return codigoLegible(codigoBoleto(v));
  }

  /**
   * De qué viaje era el boleto. Si el viaje todavía existe se muestra su ruta; si ya se eliminó,
   * el motivo de cancelación lo dice, porque al eliminarlo se guardó ahí el origen, el destino,
   * la salida y la placa del bus.
   */
  viajeDe(v: Venta): string {
    if (v.viaje) return `${v.viaje.origenNombre} → ${v.viaje.destinoNombre}`;
    return textoMotivo(v.motivoCancelacion, 'Viaje eliminado');
  }

  /** El efectivo lo devuelve la sucursal; lo de la cartera vuelve solo y aquí solo se reintenta. */
  enEfectivo(v: Venta): boolean {
    return v.metodoPago === 'EFECTIVO';
  }

  /**
   * Solo se devuelve el dinero de una compra cancelada o rechazada. Una compra vigente se cancela
   * primero desde Ventas; al escanear su boleto se ve el detalle pero sin el botón.
   */
  sePuedeReembolsar(v: Venta): boolean {
    return this.puedeReembolsar && (v.estado === 'CANCELADA' || v.estado === 'RECHAZADA');
  }

  cambiarSucursal(id: string): void {
    this.sucursalId.set(id);
    this.cambiarVista(this.vista());
  }

  cambiarVista(vista: Vista): void {
    this.vista.set(vista);
    this.pagina.set(1);
    this.cargar();
  }

  filtrar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  cargar(): void {
    this.cargando.set(true);
    const estado: EstadoVenta = this.vista() === 'DEVUELTAS' ? 'REEMBOLSADA' : 'CANCELADA';
    this.servicio.listar({ sucursalId: this.sucursalId() || null, estado }).subscribe({
      next: (lista) => {
        this.ventas.set(ordenarVentas(lista));
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar las ventas canceladas.'));
      },
    });
  }

  /**
   * Enter en el buscador: lo que escribe la pistola al leer el código de barras. Si el texto tiene
   * los 12 caracteres del código, se busca la venta en el servicio y se abre el detalle; si no, se
   * deja como filtro de la tabla (NIT, nombre o correo).
   */
  buscar(): void {
    const limpio = this.texto().replace(/[^0-9A-Fa-f]/g, '');
    if (limpio.length < 12) {
      if (this.filtradas().length === 0) this.avisos.info('Ningún boleto coincide con esa búsqueda.');
      return;
    }
    this.buscandoCodigo.set(true);
    this.servicio.buscarPorCodigo(limpio).subscribe({
      next: (encontradas) => {
        this.buscandoCodigo.set(false);
        if (encontradas.length === 1) {
          this.abrirDetalle(encontradas[0]);
          this.limpiarBuscador();
          return;
        }
        // Dos ventas con el mismo código es rarísimo, pero si pasa se eligen a mano.
        this.ventas.set(ordenarVentas(encontradas));
        this.texto.set('');
        this.avisos.info('Hay más de un boleto con ese código: elige el del cliente.');
      },
      error: (e) => {
        this.buscandoCodigo.set(false);
        this.avisos.error(mensajeError(e, 'No se encontró ningún boleto con ese código.'));
        this.limpiarBuscador();
      },
    });
  }

  /** Deja el buscador vacío y con el foco, listo para el siguiente escaneo. */
  private limpiarBuscador(): void {
    this.texto.set('');
    this.buscador()?.nativeElement.focus();
  }

  abrirDetalle(v: Venta): void {
    this.confirmando.set(false);
    this.enDetalle.set(v);
    // El listado no trae el viaje: el detalle sí, cuando el viaje todavía existe.
    if (v.viaje) return;
    this.cargandoDetalle.set(true);
    this.servicio.detalle(v.ventaId).subscribe({
      next: (detalle) => {
        this.cargandoDetalle.set(false);
        this.enDetalle.set(detalle);
      },
      error: () => this.cargandoDetalle.set(false),      // sin detalle se muestra lo del listado
    });
  }

  cerrarDetalle(): void {
    this.enDetalle.set(null);
    this.cargandoDetalle.set(false);
    this.confirmando.set(false);
  }

  confirmarReembolso(): void {
    const v = this.enDetalle();
    if (!v) return;
    this.reembolsando.set(true);
    this.servicio.reembolsar(v.ventaId, { version: v.version }).subscribe({
      next: (actualizada) => {
        this.reembolsando.set(false);
        this.confirmando.set(false);
        this.enDetalle.set({ ...actualizada, viaje: actualizada.viaje ?? v.viaje });
        if (actualizada.estado === 'REEMBOLSADA') {
          this.avisos.exito('Reembolso registrado. Entrega el efectivo al cliente.');
          // Sale de "Por devolver" y entra en "Ya devueltas": se recarga el listado.
          this.cargar();
        } else {
          this.avisos.info('Se le pidió el reembolso a la billetera digital; se acreditará en unos momentos.');
        }
      },
      error: (e) => {
        this.reembolsando.set(false);
        this.confirmando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo registrar el reembolso.'));
      },
    });
  }
}
