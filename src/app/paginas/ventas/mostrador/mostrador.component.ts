import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Sucursal } from '../../../core/models/sucursal.model';
import { ClienteCuenta, Venta } from '../../../core/models/venta.model';
import { MapaAsientos, Ruta, Viaje } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { VentasService } from '../../../core/services/ventas.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectorAsientosComponent } from '../../../shared/components/selector-asientos/selector-asientos.component';
import { TicketBoletoComponent } from '../../../shared/components/ticket-boleto/ticket-boleto.component';
import { porProximaSalida } from '../../../shared/constants/ventas';
import { ToastService } from '../../../shared/services/toast.service';

/** Venta en mostrador: buscar viaje, elegir asientos y cobrar en efectivo (confirmada al instante). */
@Component({
  selector: 'app-mostrador',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    ModalComponent,
    SelectorAsientosComponent,
    MapaRecorridoComponent,
    TicketBoletoComponent,
  ],
  templateUrl: './mostrador.component.html',
  styleUrl: './mostrador.component.scss',
})
export class MostradorComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly viajesServicio = inject(ViajesService);
  private readonly ventasServicio = inject(VentasService);
  private readonly clientesServicio = inject(ClientesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly zona = ZONA_GT;

  readonly sucursales = signal<Sucursal[]>([]);
  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly destinoId = signal('');
  readonly fecha = signal(hoyGt());
  readonly hasta = signal(hoyGt(7));

  private readonly viajes = signal<Viaje[]>([]);
  readonly buscando = signal(false);

  /** Viaje elegido: abre el modal de asientos y cobro. */
  readonly viajeElegido = signal<Viaje | null>(null);
  readonly mapa = signal<MapaAsientos | null>(null);
  readonly cargandoMapa = signal(false);
  readonly asientosElegidos = signal<number[]>([]);
  readonly vendiendo = signal(false);

  /** Última venta confirmada en esta sesión de mostrador. */
  readonly ventaConfirmada = signal<Venta | null>(null);

  // ----- Cliente del sistema (se busca por NIT) -----

  /** Clientes que coinciden con lo que lleva escrito el cajero (máximo los que manda el backend). */
  readonly clientes = signal<ClienteCuenta[]>([]);
  /** Cliente del sistema cuyo NIT coincide con el escrito: la venta queda ligada a su cuenta. */
  readonly clienteLigado = signal<ClienteCuenta | null>(null);
  readonly buscandoCliente = signal(false);
  /** Se buscó un NIT completo y no es de nadie: la venta va a nombre de quien escriba el cajero. */
  readonly nitSinCuenta = signal(false);

  /** Sugerencias a mostrar: se ocultan en cuanto el NIT escrito ya es el de un cliente ligado. */
  readonly sugerencias = computed(() => {
    const ligado = this.clienteLigado();
    return ligado ? [] : this.clientes();
  });

  /** El correo se oculta por defecto para dejar limpia la pantalla del cajero. */
  readonly mostrarCorreo = signal(false);

  readonly formVenta = this.fb.group({
    clienteNit: [''],
    clienteNombre: [''],
    clienteCorreo: ['', Validators.email],
    fechaPago: [hoyGt(), Validators.required],
  });

  readonly filtrados = computed(() => {    const d = this.destinoId();
    if (!d) return this.viajes();
    const rutasDestino = new Set(this.rutasOrigen().filter((r) => r.sucursalDestinoId === d).map((r) => r.rutaId));
    return this.viajes().filter((v) => v.rutaId !== null && rutasDestino.has(v.rutaId));
  });

  /** Rutas que salen de la sucursal (para el combo de destino). */
  private readonly rutasOrigen = signal<Ruta[]>([]);
  /** Todas las rutas activas: permiten resolver las coordenadas del viaje elegido para el mapa. */
  private readonly rutas = signal<Ruta[]>([]);

  /** Destinos con salida desde la sucursal (para el combo). */
  readonly destinos = computed(() => {
    const vistas = new Map<string, string>();
    for (const r of this.rutasOrigen()) {
      if (!vistas.has(r.sucursalDestinoId)) vistas.set(r.sucursalDestinoId, r.destinoNombre);
    }
    return [...vistas.entries()].map(([id, nombre]) => ({ id, nombre }));
  });

  /** Nombre de la sucursal origen (fija para el cajero). */
  readonly nombreOrigen = computed(
    () => this.sucursales().find((s) => s.sucursalId === this.sucursalId())?.nombre ?? 'Mi sucursal',
  );

  readonly total = computed(() => this.asientosElegidos().length * (this.mapa()?.precioBoleto ?? 0));

  /** Coordenadas de las sucursales del viaje elegido, para el mapa del recorrido. */
  readonly recorrido = computed(() => {
    const viaje = this.viajeElegido();
    if (!viaje?.rutaId) return null;
    const ruta = this.rutas().find((r) => r.rutaId === viaje.rutaId);
    if (!ruta) return null;
    const origen = this.sucursales().find((s) => s.sucursalId === ruta.sucursalOrigenId);
    const destino = this.sucursales().find((s) => s.sucursalId === ruta.sucursalDestinoId);
    return origen && destino ? { origen, destino } : null;
  });

  constructor() {
    // El NIT es la llave del cliente: mientras se escribe se van buscando las coincidencias.
    this.formVenta.controls.clienteNit.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((nit) => this.cargarClientes(nit ?? ''));
  }

  ngOnInit(): void {
    // Destinos y nombre de origen: todos ven las sucursales (consulta pública).
    this.sucursalesServicio.listar(true).subscribe({
      next: (lista) => {
        this.sucursales.set(lista);
        this.cargarRutas();
      },
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.buscar();
  }

  cambiarSucursal(id: string): void {
    this.sucursalId.set(id);
    this.destinoId.set('');
    this.cargarRutas();
    this.buscar();
  }

  /** Rutas que salen de la sucursal elegida (para el combo de destino) y todas para el mapa. */
  private cargarRutas(): void {
    const origen = this.sucursalId();
    this.viajesServicio.rutas(true).subscribe({
      next: (todas) => {
        this.rutas.set(todas);
        this.rutasOrigen.set(origen ? todas.filter((r) => r.sucursalOrigenId === origen) : []);
      },
      error: () => {
        this.rutas.set([]);
        this.rutasOrigen.set([]);
      },
    });
  }

  buscar(): void {
    const fecha = this.fecha();
    if (!fecha) {
      this.avisos.info('Elige la fecha del viaje para buscar.');
      return;
    }
    this.buscando.set(true);
    this.viajesServicio
      // Solo REGULAR: un viaje privado sale de un alquiler y no vende boletos de mostrador.
      .buscar({
        sucursalId: this.sucursalId() || null,
        desde: fecha,
        hasta: this.hasta() || null,
        estado: 'PROGRAMADO',
        tipo: 'REGULAR',
      })
      .subscribe({
        next: (lista) => {
          this.viajes.set(porProximaSalida(lista));   // el próximo bus arriba: es el que más se vende
          this.buscando.set(false);
        },
        error: (e) => {
          this.buscando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron buscar los viajes.'));
        },
      });
  }

  // ----- Cliente del sistema -----

  /**
   * Busca los clientes que coinciden con el texto y, si alguno tiene exactamente ese NIT, lo deja
   * ligado: así el cajero ve a quién le está vendiendo antes de cobrar.
   */
  private cargarClientes(texto: string): void {
    const escrito = texto.trim();
    this.nitSinCuenta.set(false);
    this.buscandoCliente.set(true);
    this.clientesServicio.buscar(escrito || null).subscribe({
      next: (lista) => {
        this.buscandoCliente.set(false);
        this.clientes.set(lista);
        const exacto = escrito ? lista.find((c) => c.nit.toUpperCase() === escrito.toUpperCase()) : undefined;
        if (exacto) {
          this.ligar(exacto);
        } else {
          this.clienteLigado.set(null);
        }
      },
      error: () => {
        // Sin buscador la venta sigue funcionando: el cajero escribe los datos a mano.
        this.buscandoCliente.set(false);
        this.clientes.set([]);
        this.clienteLigado.set(null);
      },
    });
  }

  /** Enter o botón Buscar: avisa claramente si ese NIT no es de ninguna cuenta. */
  buscarCliente(): void {
    const escrito = (this.formVenta.controls.clienteNit.value ?? '').trim();
    if (!escrito) {
      this.avisos.info('Escribe el NIT del cliente para buscarlo.');
      return;
    }
    this.buscandoCliente.set(true);
    this.clientesServicio.buscar(escrito).subscribe({
      next: (lista) => {
        this.buscandoCliente.set(false);
        this.clientes.set(lista);
        const exacto = lista.find((c) => c.nit.toUpperCase() === escrito.toUpperCase());
        if (exacto) {
          this.ligar(exacto);
          this.nitSinCuenta.set(false);
          this.avisos.exito(`Cliente encontrado: ${exacto.nombre}.`);
          return;
        }
        this.clienteLigado.set(null);
        this.nitSinCuenta.set(true);
        this.avisos.info(
          lista.length
            ? 'Ese NIT no existe en el sistema; abajo están los clientes parecidos.'
            : 'Ese NIT no existe en el sistema. La venta se registrará con los datos que escribas.',
        );
      },
      error: (e) => {
        this.buscandoCliente.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo buscar el cliente.'));
      },
    });
  }

  /** Elegir un cliente de la lista: llena el NIT, el nombre y el correo con los de su cuenta. */
  usarCliente(c: ClienteCuenta): void {
    this.formVenta.patchValue({ clienteNit: c.nit, clienteNombre: c.nombre, clienteCorreo: c.correo });
    this.ligar(c);
    this.nitSinCuenta.set(false);
  }

  /** Deja de usar la cuenta: el cajero escribe los datos a mano (y el NIT queda en blanco). */
  quitarCliente(): void {
    this.formVenta.patchValue({ clienteNit: '', clienteNombre: '', clienteCorreo: '' });
    this.clienteLigado.set(null);
    this.nitSinCuenta.set(false);
  }

  private ligar(c: ClienteCuenta): void {
    this.clienteLigado.set(c);
    // Solo se completa lo que esté vacío: el cajero puede vender a otra persona con el mismo NIT.
    const actual = this.formVenta.getRawValue();
    this.formVenta.patchValue({
      clienteNombre: actual.clienteNombre?.trim() ? actual.clienteNombre : c.nombre,
      clienteCorreo: actual.clienteCorreo?.trim() ? actual.clienteCorreo : c.correo,
    });
  }

  elegir(v: Viaje): void {
    this.viajeElegido.set(v);
    this.mapa.set(null);
    this.asientosElegidos.set([]);
    this.mostrarCorreo.set(false);
    this.formVenta.reset({ clienteNit: '', clienteNombre: '', clienteCorreo: '', fechaPago: hoyGt() });
    this.clienteLigado.set(null);
    this.nitSinCuenta.set(false);
    this.cargarClientes('');          // los primeros clientes, para elegir sin teclear el NIT
    this.cargandoMapa.set(true);
    this.viajesServicio.asientos(v.viajeId).subscribe({
      next: (mapa) => {
        this.mapa.set(mapa);
        this.cargandoMapa.set(false);
      },
      error: (e) => {
        this.cargandoMapa.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el mapa de asientos.'));
      },
    });
  }

  cerrarModal(): void {
    if (this.vendiendo()) return;
    this.viajeElegido.set(null);
    this.mapa.set(null);
    this.asientosElegidos.set([]);
  }

  vender(): void {
    const viaje = this.viajeElegido();
    if (!viaje) return;
    if (this.asientosElegidos().length === 0) {
      this.avisos.info('Elige al menos un asiento para vender.');
      return;
    }
    if (this.formVenta.invalid) {
      this.formVenta.markAllAsTouched();
      return;
    }
    const f = this.formVenta.getRawValue();
    const correo = (f.clienteCorreo ?? '').trim();
    this.vendiendo.set(true);
    this.ventasServicio
      .venderEnMostrador({
        viajeId: viaje.viajeId,
        asientos: this.asientosElegidos(),
        clienteNit: f.clienteNit || null,
        clienteNombre: f.clienteNombre || null,
        clienteCorreo: correo || null,
        fechaPago: f.fechaPago ?? hoyGt(),
      })
      .subscribe({
        next: (venta) => {
          this.vendiendo.set(false);
          this.ventaConfirmada.set(venta);
          this.viajeElegido.set(null);
          this.mapa.set(null);
          this.asientosElegidos.set([]);
          this.avisos.exito('Venta confirmada. Cobra en efectivo.');
          this.buscar();
        },
        error: (e) => {
          this.vendiendo.set(false);
          marcarErroresServidor(this.formVenta, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la venta.'));
        },
      });
  }

  nuevaVenta(): void {
    this.ventaConfirmada.set(null);
    this.mostrarCorreo.set(false);
  }

  /** Muestra u oculta el campo de correo (solo se envía el comprobante si hay correo). */
  alternarCorreo(): void {
    this.mostrarCorreo.update((visible) => !visible);
  }
}
