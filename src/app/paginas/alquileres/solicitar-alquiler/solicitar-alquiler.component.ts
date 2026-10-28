import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Sucursal } from '../../../core/models/sucursal.model';
import { ClienteCuenta, TarifaReembolso } from '../../../core/models/venta.model';
import { Alquiler } from '../../../core/models/viaje.model';
import { AlquileresService } from '../../../core/services/alquileres.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { TarifasReembolsoService } from '../../../core/services/tarifas-reembolso.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, ahoraGt, fechaHoraGt, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import {
  Coordenadas,
  PuntoReferencia,
  SelectorRecorridoComponent,
} from '../../../shared/components/selector-recorrido/selector-recorrido.component';
import { ToastService } from '../../../shared/services/toast.service';
import { pantallaGrande } from '../../../shared/utils/pantalla';

/** Distancia en línea recta entre dos puntos (fórmula del semiverseno), solo para comparar cuál queda más cerca. */
function kilometros(desde: Coordenadas, hasta: { latitud: number; longitud: number }): number {
  const RADIO_TIERRA_KM = 6371;
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const dLat = radianes(hasta.latitud - desde.latitud);
  const dLon = radianes(hasta.longitud - desde.longitud);
  const a = Math.sin(dLat / 2) ** 2
      + Math.cos(radianes(desde.latitud)) * Math.cos(radianes(hasta.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Solicitud de alquiler de un bus (T16).
 * - CLIENTE: siempre a su nombre; NIT, nombre y correo salen de su perfil y no se editan aquí.
 * - VENTANILLA (cajero y administrador de sucursal): pide a nombre de quien llega al mostrador, que
 *   puede ser cualquiera, incluso el propio empleado. El NIT es la llave, igual que al vender boletos:
 *   si es de una cuenta del sistema, el alquiler queda ligado a ella y le aparece al cliente en
 *   "Mis alquileres" para pagarlo con su billetera; si no, queda sin cuenta y solo se cobra en efectivo.
 *   La sucursal es libre: el alquiler lo atiende la que sale en el viaje, no donde trabaja quien lo pide.
 */
@Component({
  selector: 'app-solicitar-alquiler',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, CurrencyPipe, ModalComponent, RouterLink, SelectorRecorridoComponent, MapaRecorridoComponent],
  templateUrl: './solicitar-alquiler.component.html',
  styleUrl: './solicitar-alquiler.component.scss',
})
export class SolicitarAlquilerComponent implements OnInit {
  private readonly alquileres = inject(AlquileresService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly tarifasServicio = inject(TarifasReembolsoService);
  private readonly usuarios = inject(UsuariosService);
  private readonly clientesServicio = inject(ClientesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly zona = ZONA_GT;
  /**
   * El modo lo decide la ruta, no el rol: un cajero también es cliente. Desde "Mis compras" el
   * alquiler es suyo y sus datos salen del perfil; desde "Ventanilla" puede ser para cualquiera.
   */
  readonly esVentanilla = inject(ActivatedRoute).snapshot.data['ventanilla'] === true;
  readonly hoy = hoyGt();

  // ----- Cliente del sistema (la ventanilla lo busca por NIT) -----

  readonly clientes = signal<ClienteCuenta[]>([]);
  /** Cliente cuya cuenta coincide con el NIT escrito: el alquiler queda ligado a ella. */
  readonly clienteLigado = signal<ClienteCuenta | null>(null);
  readonly buscandoCliente = signal(false);
  /** Se buscó un NIT completo y no es de nadie: el alquiler queda sin cuenta (solo efectivo). */
  readonly nitSinCuenta = signal(false);

  /**
   * La lista de clientes ya no vive dentro del formulario: se abre con "Seleccionar cliente" en un
   * modal aparte, con su propio buscador por NIT, nombre o correo.
   */
  readonly selectorAbierto = signal(false);
  readonly buscador = this.fb.nonNullable.control('');

  readonly sucursales = signal<Sucursal[]>([]);
  /** Tramos de la política de cancelación que aplican ya pagado el alquiler (aviso del paso 2). */
  readonly politicaCancelacion = signal<TarifaReembolso[]>([]);
  readonly enviando = signal(false);
  readonly calculandoKm = signal(false);
  readonly creado = signal<Alquiler | null>(null);
  /** En PC el resumen de la solicitud se abre amplio, con el mapa grande al lado. */
  readonly pantallaGrande = pantallaGrande();

  /** Puntos marcados en el mapa (null = todavía no se marca). */
  readonly origenMapa = signal<Coordenadas | null>(null);
  readonly destinoMapa = signal<Coordenadas | null>(null);

  /**
   * La solicitud va en dos pasos: primero quién la pide y por dónde va el recorrido, y después,
   * ya sabiendo de dónde sale, qué sucursal la atiende y el resto de los datos.
   */
  readonly paso = signal<1 | 2>(1);
  /** El usuario ya eligió sucursal a mano: entonces no se le vuelve a imponer la más cercana. */
  private readonly sucursalElegidaAMano = signal(false);

  /** Las sucursales dibujadas sobre el mapa, para elegir el origen sabiendo de dónde sale el bus. */
  readonly referenciasSucursales = computed<PuntoReferencia[]>(() =>
    this.sucursales().map((s) => ({ nombre: `${s.nombre} · ${s.municipio}`, latitud: s.latitud, longitud: s.longitud })),
  );

  /** La sucursal más cercana al origen marcado: es la que se propone para atender el alquiler. */
  readonly sucursalCercana = computed<Sucursal | null>(() => {
    const origen = this.origenMapa();
    const lista = this.sucursales();
    if (!origen || !lista.length) return null;
    return lista.reduce((cercana, s) =>
      kilometros(origen, s) < kilometros(origen, cercana) ? s : cercana);
  });

  /**
   * Sucursal elegida, como señal. El valor de un control reactivo no es una señal, así que un
   * computed que lo leyera no se enteraría del cambio y el pin del mapa se quedaría donde estaba:
   * por eso se copia aquí desde valueChanges (ver el constructor).
   */
  private readonly sucursalId = signal('');

  /** La sucursal que quedó elegida, para dibujarla en el mapa del segundo paso. */
  readonly sucursalDelAlquiler = computed<Sucursal | null>(() =>
    this.sucursales().find((s) => s.sucursalId === this.sucursalId()) ?? null);

  readonly referenciaElegida = computed<PuntoReferencia[]>(() => {
    const s = this.sucursalDelAlquiler();
    return s ? [{ nombre: `Sale de ${s.nombre}`, latitud: s.latitud, longitud: s.longitud }] : [];
  });

  /** ¿Ya se puede pasar al segundo paso? Hace falta el recorrido y los datos de quien lo pide. */
  readonly listoParaSeguir = computed(() => !!this.origenMapa() && !!this.destinoMapa());

  readonly form = this.fb.nonNullable.group({
    sucursalId: ['', Validators.required],
    clienteNit: ['', Validators.maxLength(20)],
    clienteNombre: ['', [Validators.required, Validators.maxLength(150)]],
    clienteCorreo: ['', [Validators.email, Validators.maxLength(150)]],
    origen: ['', [Validators.required, Validators.maxLength(255)]],
    destino: ['', [Validators.required, Validators.maxLength(255)]],
    fechaSalida: ['', Validators.required],
    fechaRetorno: [''],
    cantidadPasajeros: [1, [Validators.required, Validators.min(1), Validators.max(120)]],
    kmEstimados: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(999999.99)]],
    fechaSolicitud: [hoyGt(), Validators.required],
  });

  constructor() {
    // El mapa del segundo paso sigue a la sucursal elegida, cambie por el select o porque se
    // propuso la más cercana al nuevo origen.
    this.form.controls.sucursalId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.sucursalId.set(id ?? ''));
    // Buscador del modal: filtra la lista mientras se escribe (NIT, nombre o correo).
    if (this.esVentanilla) {
      this.buscador.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
        .subscribe((texto) => this.cargarClientes(texto ?? ''));
    }
  }

  ngOnInit(): void {
    this.sucursalesServicio.listar(true).subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.cargarPoliticaCancelacion();
    this.reiniciar();
  }

  /**
   * Tramos que aplican una vez pagado el alquiler, para el aviso previo. Antes de pagar cancelar no
   * cuesta nada, así que esos tramos no se muestran: solo meterían ruido. Si la consulta falla, el
   * aviso simplemente no aparece y la solicitud sigue igual.
   */
  private cargarPoliticaCancelacion(): void {
    this.tarifasServicio.listar().subscribe({
      next: (lista) =>
        this.politicaCancelacion.set(
          lista
            .filter((t) => t.activa && t.estadoAlquiler !== 'SOLICITADO' && t.estadoAlquiler !== 'COTIZADO')
            .sort((a, b) => b.horasMinimasAntes - a.horasMinimasAntes),
        ),
      error: () => this.politicaCancelacion.set([]),
    });
  }

  /** El tramo en palabras, como lo lee el cliente en el aviso. */
  textoTramo(t: TarifaReembolso): string {
    if (t.horasMinimasAntes === 0) return 'A última hora';
    if (t.horasMinimasAntes % 24 === 0) {
      const dias = t.horasMinimasAntes / 24;
      return `Con ${dias} ${dias === 1 ? 'día' : 'días'} o más de anticipación`;
    }
    return `Con ${t.horasMinimasAntes} horas o más de anticipación`;
  }

  private reiniciar(): void {
    // La sucursal ya no se propone de entrada: se decide en el segundo paso con el origen marcado.
    this.paso.set(1);
    this.sucursalElegidaAMano.set(false);
    this.form.reset({
      sucursalId: '',
      clienteNit: '',
      clienteNombre: '',
      clienteCorreo: '',
      origen: '',
      destino: '',
      fechaSalida: ahoraGt(),
      fechaRetorno: '',
      cantidadPasajeros: 1,
      kmEstimados: null,
      fechaSolicitud: hoyGt(),
    });
    this.origenMapa.set(null);
    this.destinoMapa.set(null);
    this.clienteLigado.set(null);
    this.nitSinCuenta.set(false);
    const datos = [this.form.controls.clienteNit, this.form.controls.clienteNombre,
      this.form.controls.clienteCorreo];
    if (this.esVentanilla) {
      // La ventanilla escribe los datos (o los trae del selector de clientes).
      datos.forEach((c) => {
        c.enable();
        c.markAsUntouched();
      });
      this.clientes.set([]);            // la lista se carga al abrir el selector
    } else {
      // El cliente pide para sí: sus datos salen del perfil y no se editan aquí.
      const u = this.auth.usuario();
      this.form.patchValue({ clienteNombre: u?.nombre ?? '', clienteCorreo: u?.correo ?? '' });
      datos.forEach((c) => c.disable());
      this.llenarConPerfil();
    }
  }

  // ----- Asistente en dos pasos -----

  /**
   * Del recorrido a los detalles. Al llegar acá ya se sabe de dónde sale el bus, así que se propone
   * la sucursal más cercana al origen; si el usuario ya eligió otra a mano, se respeta la suya.
   */
  siguiente(): void {
    const datos = [this.form.controls.clienteNombre, this.form.controls.clienteCorreo];
    datos.forEach((c) => c.markAsTouched());
    if (datos.some((c) => c.invalid)) {
      this.avisos.info('Revisa los datos del cliente antes de seguir.');
      return;
    }
    if (!this.listoParaSeguir()) {
      this.avisos.info('Marca en el mapa el origen y el destino del recorrido.');
      return;
    }
    const cercana = this.sucursalCercana();
    if (cercana && !this.sucursalElegidaAMano()) {
      this.form.controls.sucursalId.setValue(cercana.sucursalId);
    }
    this.paso.set(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Vuelve al mapa a corregir el recorrido sin perder nada de lo ya escrito. */
  volver(): void {
    this.paso.set(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** El usuario cambió la sucursal: desde aquí manda la suya, no la cercana. */
  alElegirSucursal(): void {
    this.sucursalElegidaAMano.set(true);
  }

  /** Vuelve a proponer la más cercana al origen (por si se arrepiente del cambio). */
  usarSucursalCercana(): void {
    const cercana = this.sucursalCercana();
    if (!cercana) return;
    this.form.controls.sucursalId.setValue(cercana.sucursalId);
    this.sucursalElegidaAMano.set(false);
  }

  // ----- Buscador de clientes (igual que al vender boletos en ventanilla) -----

  /** Llena la lista del modal. Sin texto trae los primeros clientes, para elegir sin teclear nada. */
  private cargarClientes(texto: string): void {
    this.buscandoCliente.set(true);
    this.clientesServicio.buscar(texto.trim() || null).subscribe({
      next: (lista) => {
        this.buscandoCliente.set(false);
        this.clientes.set(lista);
      },
      error: () => {
        // Sin buscador la solicitud sigue funcionando: se escriben los datos a mano.
        this.buscandoCliente.set(false);
        this.clientes.set([]);
      },
    });
  }

  /** Abre el selector con los primeros clientes cargados. */
  abrirSelector(): void {
    this.buscador.setValue('', { emitEvent: false });
    this.selectorAbierto.set(true);
    this.cargarClientes('');
  }

  cerrarSelector(): void {
    this.selectorAbierto.set(false);
  }

  /** Enter o botón Buscar: dice claramente si ese NIT no es de ninguna cuenta. */
  buscarCliente(): void {
    const escrito = (this.form.controls.clienteNit.value ?? '').trim();
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
            : 'Ese NIT no existe en el sistema. El alquiler quedará sin cuenta y se cobra en efectivo.',
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
    this.form.patchValue({ clienteNit: c.nit, clienteNombre: c.nombre, clienteCorreo: c.correo });
    this.ligar(c);
    this.nitSinCuenta.set(false);
    this.cerrarSelector();
  }

  /** Suelta la cuenta: el alquiler queda a nombre de quien se escriba, sin ligar. */
  quitarCliente(): void {
    this.form.patchValue({ clienteNit: '', clienteNombre: '', clienteCorreo: '' });
    this.clienteLigado.set(null);
    this.nitSinCuenta.set(false);
  }

  private ligar(c: ClienteCuenta): void {
    this.clienteLigado.set(c);
    // Solo se completa lo que esté vacío: puede viajar otra persona con el mismo NIT de factura.
    const actual = this.form.getRawValue();
    this.form.patchValue({
      clienteNombre: actual.clienteNombre?.trim() ? actual.clienteNombre : c.nombre,
      clienteCorreo: actual.clienteCorreo?.trim() ? actual.clienteCorreo : c.correo,
    });
  }

  /** NIT, nombre y correo del perfil del cliente (campos de solo lectura: se cambian en Mi perfil). */
  private llenarConPerfil(): void {
    this.usuarios.perfil().subscribe({
      next: (p) => {
        if (this.esVentanilla) return;
        const nombre = `${p.nombres ?? ''} ${p.apellidos ?? ''}`.trim();
        this.form.patchValue({
          clienteNit: p.nit ?? '',
          clienteNombre: nombre || this.form.controls.clienteNombre.value,
          clienteCorreo: p.correo ?? this.form.controls.clienteCorreo.value,
        });
      },
      // Sin perfil se queda con el nombre y correo de la sesión; el NIT vacío se registra como CF
      error: () => undefined,
    });
  }

  alCambiarOrigen(punto: Coordenadas | null): void {
    this.origenMapa.set(punto);
  }

  alCambiarDestino(punto: Coordenadas | null): void {
    this.destinoMapa.set(punto);
  }

  /** Los km salen siempre de la distancia del recorrido marcado (no se editan a mano). */
  alCambiarDistancia(km: number | null): void {
    this.form.controls.kmEstimados.setValue(km);
  }

  /** El origen toma el nombre del punto marcado (o del lugar elegido en el buscador). */
  alSugerirOrigen(nombre: string): void {
    this.form.controls.origen.setValue(nombre);
  }

  /** El destino toma el nombre del punto marcado (o del lugar elegido en el buscador). */
  alSugerirDestino(nombre: string): void {
    this.form.controls.destino.setValue(nombre);
  }

  /** ¿La solicitud trae puntos del mapa? Sirve para mostrar la ruta en el resumen. */
  tieneRecorrido(a: Alquiler): boolean {
    return (a.origenLatitud !== null && a.origenLongitud !== null)
      || (a.destinoLatitud !== null && a.destinoLongitud !== null);
  }

  solicitar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    const salida = fechaHoraGt(f.fechaSalida);
    const retorno = f.fechaRetorno ? fechaHoraGt(f.fechaRetorno) : null;
    if (retorno && retorno < salida) {
      this.form.controls.fechaRetorno.setErrors({ retornoInvalido: true });
      return;
    }
    this.enviando.set(true);
    this.alquileres
      .solicitar({
        sucursalId: f.sucursalId,
        clienteNit: f.clienteNit.trim() || null,
        clienteNombre: f.clienteNombre.trim(),
        clienteCorreo: f.clienteCorreo.trim() || null,
        origen: f.origen.trim(),
        destino: f.destino.trim(),
        origenLatitud: this.origenMapa()?.latitud ?? null,
        origenLongitud: this.origenMapa()?.longitud ?? null,
        destinoLatitud: this.destinoMapa()?.latitud ?? null,
        destinoLongitud: this.destinoMapa()?.longitud ?? null,
        fechaSalida: salida,
        fechaRetorno: retorno,
        cantidadPasajeros: Number(f.cantidadPasajeros),
        kmEstimados: Number(f.kmEstimados),
        fechaSolicitud: f.fechaSolicitud,
      })
      .subscribe({
        next: (a) => {
          this.enviando.set(false);
          this.creado.set(a);
          this.avisos.exito('Solicitud de alquiler enviada.');
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.form, e);
          this.avisos.error(mensajeError(e, 'No se pudo enviar la solicitud.'));
        },
      });
  }

  solicitarOtro(): void {
    this.creado.set(null);
    this.reiniciar();
  }

  /** Tarifa por km aplicada al estimado (precioEstimado ÷ kmEstimados). */
  tarifa(a: Alquiler): number | null {
    if (!a.kmEstimados) return null;
    return Math.round((a.precioEstimado / a.kmEstimados) * 100) / 100;
  }
}
