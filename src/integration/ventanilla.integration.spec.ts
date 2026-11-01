import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UsuarioSesion } from '../app/core/models/auth.model';
import { Sucursal } from '../app/core/models/sucursal.model';
import { ClienteCuenta, Historial, OrdenAlquiler, Venta } from '../app/core/models/venta.model';
import { MapaAsientos, Ruta, Viaje } from '../app/core/models/viaje.model';
import { hoyGt } from '../app/core/utils/fechas';
import { MostradorComponent } from '../app/paginas/ventas/mostrador/mostrador.component';
import { OrdenesComponent } from '../app/paginas/ventas/ordenes/ordenes.component';
import { ReembolsosComponent } from '../app/paginas/ventas/reembolsos/reembolsos.component';
import { VentasComponent } from '../app/paginas/ventas/ventas/ventas.component';
import { AvisosMenuService } from '../app/shared/services/avisos-menu.service';
import { ToastService } from '../app/shared/services/toast.service';
import {
  API,
  CORREO,
  NOMBRE,
  SUCURSAL_ID,
  USUARIO,
  abrir,
  configurarIntegracion,
  controlador,
  enviar,
  escribir,
  espiarNavegacion,
  guardarSesion,
} from './soporte';

/**
 * Pruebas de integración de la ventanilla: mostrador, ventas, reembolsos y órdenes de alquiler.
 * Se usan componentes, plantillas y servicios reales; solo el HTTP y la navegación se simulan.
 * Convención: Dado / Cuando / Entonces (flujo completo, sin AAA).
 */

const MOTIVO_CANCELACION = 'Cliente no viajó';
const CODIGO_BOLETO = 'A1B2C3D4E5F6';
const CODIGO_OTRO_BOLETO = '0F1E2D3C4B5A';
const MENSAJE_REEMBOLSO = 'Reembolso registrado. Entrega el efectivo al cliente.';
const MENSAJE_FECHA_REQUERIDA = 'Elige la fecha del viaje para buscar.';
const NIT_SIN_CUENTA = '1111111-1';
const URL_OSRM = 'https://router.project-osrm.org/route/v1/driving/';

const USUARIO_CAJERO: UsuarioSesion = {
  ...USUARIO,
  roles: ['CAJERO'],
  sucursalId: SUCURSAL_ID,
};

const USUARIO_ADMIN_SUCURSAL: UsuarioSesion = {
  ...USUARIO,
  roles: ['ADMIN_SUCURSAL'],
  sucursalId: SUCURSAL_ID,
};

const USUARIO_ADMIN_SISTEMA: UsuarioSesion = {
  ...USUARIO,
  roles: ['ADMIN_SISTEMA'],
};

// ----- Fixtures de catálogo y viajes -----

const SUCURSAL_ORIGEN: Sucursal = {
  sucursalId: SUCURSAL_ID,
  codigo: 'XLA',
  nombre: 'Xela',
  departamento: 'Quetzaltenango',
  municipio: 'Quetzaltenango',
  direccion: 'Terminal Minerva',
  telefono: null,
  latitud: 14.8446,
  longitud: -91.5187,
  activa: true,
  version: 1,
};

const SUCURSAL_GUATEMALA: Sucursal = {
  sucursalId: 'sucursal-2',
  codigo: 'GUA',
  nombre: 'Guatemala',
  departamento: 'Guatemala',
  municipio: 'Guatemala',
  direccion: 'Terminal Trebol',
  telefono: null,
  latitud: 14.6349,
  longitud: -90.5069,
  activa: true,
  version: 1,
};

const SUCURSAL_COBAN: Sucursal = {
  sucursalId: 'sucursal-3',
  codigo: 'COB',
  nombre: 'Cobán',
  departamento: 'Alta Verapaz',
  municipio: 'Cobán',
  direccion: 'Terminal Central',
  telefono: null,
  latitud: 15.472,
  longitud: -90.3708,
  activa: true,
  version: 1,
};

const RUTA_GUATEMALA: Ruta = {
  rutaId: 'ruta-1',
  sucursalOrigenId: SUCURSAL_ID,
  origenNombre: 'Xela',
  sucursalDestinoId: SUCURSAL_GUATEMALA.sucursalId,
  destinoNombre: 'Guatemala',
  distanciaKm: 210,
  precioBoleto: 125,
  activa: true,
  version: 1,
};

const RUTA_COBAN: Ruta = {
  rutaId: 'ruta-2',
  sucursalOrigenId: SUCURSAL_ID,
  origenNombre: 'Xela',
  sucursalDestinoId: SUCURSAL_COBAN.sucursalId,
  destinoNombre: 'Cobán',
  distanciaKm: 165,
  precioBoleto: 150,
  activa: true,
  version: 1,
};

const VIAJE: Viaje = {
  viajeId: 'viaje-1',
  tipo: 'REGULAR',
  rutaId: RUTA_GUATEMALA.rutaId,
  alquilerId: null,
  sucursalId: SUCURSAL_ID,
  origenNombre: 'Xela',
  destinoNombre: 'Guatemala',
  busId: 'bus-1',
  busPlaca: 'P-123ABC',
  choferId: 'chofer-1',
  choferNombre: 'Luis Ajú',
  capacidad: 40,
  precioBoleto: RUTA_GUATEMALA.precioBoleto,
  fechaSalidaProgramada: '2026-11-02T06:00:00-06:00',
  fechaLlegadaEstimada: '2026-11-02T10:00:00-06:00',
  estado: 'PROGRAMADO',
  version: 1,
};

const VIAJE_COBAN: Viaje = {
  ...VIAJE,
  viajeId: 'viaje-2',
  rutaId: RUTA_COBAN.rutaId,
  destinoNombre: 'Cobán',
  busId: 'bus-2',
  busPlaca: 'P-456DEF',
  precioBoleto: RUTA_COBAN.precioBoleto,
  fechaSalidaProgramada: '2026-11-02T07:00:00-06:00',
  fechaLlegadaEstimada: '2026-11-02T11:00:00-06:00',
  version: 1,
};

const VIAJE_SIN_RUTA: Viaje = {
  ...VIAJE,
  viajeId: 'viaje-sin-ruta',
  rutaId: null,
};

const MAPA_ASIENTOS: MapaAsientos = {
  viajeId: VIAJE.viajeId,
  origenNombre: VIAJE.origenNombre,
  destinoNombre: VIAJE.destinoNombre,
  fechaSalida: VIAJE.fechaSalidaProgramada,
  busPlaca: VIAJE.busPlaca,
  precioBoleto: RUTA_GUATEMALA.precioBoleto,
  capacidad: 4,
  disponibles: 3,
  asientos: [
    { numero: 1, estado: 'DISPONIBLE' },
    { numero: 2, estado: 'OCUPADO' },
    { numero: 3, estado: 'DISPONIBLE' },
    { numero: 4, estado: 'DISPONIBLE' },
  ],
};

const CLIENTE: ClienteCuenta = {
  usuarioId: 'usuario-2',
  nit: '1234567-8',
  nombre: NOMBRE,
  correo: CORREO,
};

const CLIENTE_OTRO: ClienteCuenta = {
  usuarioId: 'usuario-3',
  nit: '9876543-2',
  nombre: 'Carlos Méndez',
  correo: 'carlos@pruebas.gt',
};

// ----- Fixtures de ventas -----

const VENTA_CONFIRMADA: Venta = {
  ventaId: 'venta-1',
  codigo: CODIGO_BOLETO,
  viajeId: VIAJE.viajeId,
  canal: 'PRESENCIAL',
  clienteNit: CLIENTE.nit,
  clienteNombre: CLIENTE.nombre,
  clienteCorreo: CLIENTE.correo,
  sucursalId: SUCURSAL_ID,
  metodoPago: 'EFECTIVO',
  montoTotal: 250,
  fechaPago: '2026-10-31',
  fechaRegistro: '2026-10-31T08:15:00-06:00',
  estado: 'CONFIRMADA',
  motivoRechazo: null,
  motivoCancelacion: null,
  fechaCancelacion: null,
  boletos: [
    { boletoId: 'boleto-1', numeroAsiento: 1, precio: 125, estado: 'ACTIVO' },
    { boletoId: 'boleto-2', numeroAsiento: 3, precio: 125, estado: 'ACTIVO' },
  ],
  viaje: {
    origenNombre: 'Xela',
    destinoNombre: 'Guatemala',
    fechaSalida: VIAJE.fechaSalidaProgramada,
    busPlaca: VIAJE.busPlaca,
    precioBoleto: RUTA_GUATEMALA.precioBoleto,
  },
  version: 1,
};

const VENTA_CANCELADA: Venta = {
  ...VENTA_CONFIRMADA,
  ventaId: 'venta-2',
  codigo: CODIGO_BOLETO,
  clienteNit: CLIENTE.nit,
  clienteNombre: NOMBRE,
  clienteCorreo: CORREO,
  montoTotal: 125,
  fechaPago: '2026-10-29',
  estado: 'CANCELADA',
  motivoCancelacion: MOTIVO_CANCELACION,
  fechaCancelacion: '2026-10-30T09:00:00-06:00',
  fechaReembolso: null,
  boletos: [{ boletoId: 'boleto-3', numeroAsiento: 12, precio: 125, estado: 'CANCELADO' }],
  viaje: null,
  version: 4,
};

const VENTA_OTRA_CANCELADA: Venta = {
  ...VENTA_CANCELADA,
  ventaId: 'venta-3',
  codigo: CODIGO_OTRO_BOLETO,
  clienteNit: CLIENTE_OTRO.nit,
  clienteNombre: CLIENTE_OTRO.nombre,
  clienteCorreo: CLIENTE_OTRO.correo,
  version: 2,
};

const VENTA_DETALLE_CANCELADA: Venta = {
  ...VENTA_CANCELADA,
  viaje: {
    origenNombre: 'Xela',
    destinoNombre: 'Guatemala',
    fechaSalida: VIAJE.fechaSalidaProgramada,
    busPlaca: VIAJE.busPlaca,
    precioBoleto: RUTA_GUATEMALA.precioBoleto,
  },
};

const VENTA_REEMBOLSADA: Venta = {
  ...VENTA_DETALLE_CANCELADA,
  estado: 'REEMBOLSADA',
  fechaReembolso: '2026-10-31T09:00:00-06:00',
  version: VENTA_CANCELADA.version + 1,
};

// ----- Fixtures de órdenes de alquiler -----

const ORDEN_PENDIENTE: OrdenAlquiler = {
  ordenId: 'orden-1',
  alquilerId: 'alquiler-1',
  sucursalId: SUCURSAL_ID,
  clienteNit: CLIENTE.nit,
  clienteNombre: CLIENTE.nombre,
  clienteCorreo: CLIENTE.correo,
  origen: 'Xela',
  destino: 'Quetzaltenango',
  monto: 800,
  metodoPago: 'EFECTIVO',
  fechaPago: null,
  estado: 'PENDIENTE_PAGO',
  motivoRechazo: null,
  version: 1,
};

const ORDEN_PAGADA: OrdenAlquiler = {
  ...ORDEN_PENDIENTE,
  estado: 'PAGADA',
  fechaPago: '2026-10-31',
  version: 2,
};

const ORDEN_PAGADA_OTRA: OrdenAlquiler = {
  ...ORDEN_PAGADA,
  ordenId: 'orden-5',
  alquilerId: 'alquiler-5',
};

const ORDEN_CARTERA: OrdenAlquiler = {
  ...ORDEN_PENDIENTE,
  ordenId: 'orden-2',
  alquilerId: 'alquiler-2',
  clienteNit: CLIENTE_OTRO.nit,
  clienteNombre: CLIENTE_OTRO.nombre,
  clienteCorreo: CLIENTE_OTRO.correo,
  destino: 'Cobán',
  metodoPago: 'CARTERA',
  version: 1,
};

const ORDEN_RECHAZADA: OrdenAlquiler = {
  ...ORDEN_PENDIENTE,
  ordenId: 'orden-3',
  alquilerId: 'alquiler-3',
  metodoPago: 'CARTERA',
  estado: 'RECHAZADA',
  motivoRechazo: 'SALDO_INSUFICIENTE',
  version: 2,
};

const ORDEN_CANCELADA: OrdenAlquiler = {
  ...ORDEN_PENDIENTE,
  ordenId: 'orden-4',
  alquilerId: 'alquiler-4',
  estado: 'CANCELADA',
  fechaSalida: '2026-11-05T08:00:00-06:00',
  fechaCancelacion: '2026-10-30T09:00:00-06:00',
  motivoCancelacion: 'El cliente canceló el viaje.',
  horasAntesViaje: 30,
  porcentajeReembolso: 50,
  justificacionReembolso: 'Cancelación con más de 24 horas de anticipación.',
  montoReembolsado: 400,
  reembolsoPendiente: true,
  version: 3,
};

const ORDEN_REEMBOLSADA: OrdenAlquiler = {
  ...ORDEN_CANCELADA,
  estado: 'REEMBOLSADA',
  reembolsoPendiente: false,
  fechaReembolso: '2026-10-31T09:30:00-06:00',
  version: 4,
};

const HISTORIAL: Historial = {
  nit: CLIENTE.nit,
  nombre: CLIENTE.nombre,
  ventas: [
    {
      ventaId: VENTA_CONFIRMADA.ventaId,
      canal: 'PRESENCIAL',
      origenNombre: 'Xela',
      destinoNombre: 'Guatemala',
      fechaSalida: VIAJE.fechaSalidaProgramada,
      asientos: [1, 3],
      montoTotal: 250,
      fechaPago: VENTA_CONFIRMADA.fechaPago,
      estado: 'CONFIRMADA',
    },
  ],
  alquileres: [
    {
      ordenId: ORDEN_PAGADA.ordenId,
      alquilerId: ORDEN_PAGADA.alquilerId,
      origen: 'Xela',
      destino: 'Quetzaltenango',
      monto: 800,
      metodoPago: 'EFECTIVO',
      fechaPago: '2026-10-31',
      estado: 'PAGADA',
    },
  ],
};

// ----- Apoyo de la plantilla -----

function pulsar(fixture: ComponentFixture<unknown>, etiqueta: string, raiz?: Element): void {
  const contenedor = raiz ?? (fixture.nativeElement as HTMLElement);
  const boton = [...contenedor.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').trim().includes(etiqueta),
  );
  if (!boton) throw new Error(`No se encontró el botón "${etiqueta}".`);
  (boton as HTMLButtonElement).click();
  fixture.detectChanges();
}

function elegirOpcion(fixture: ComponentFixture<unknown>, selector: string, valor: string): void {
  const select = fixture.nativeElement.querySelector(selector) as HTMLSelectElement;
  select.value = valor;
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function presionarEnter(fixture: ComponentFixture<unknown>, selector: string): void {
  const campo = fixture.nativeElement.querySelector(selector) as HTMLElement;
  campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  fixture.detectChanges();
}

function filaDe(fixture: ComponentFixture<unknown>, indice = 0): HTMLElement {
  return fixture.nativeElement.querySelectorAll('tbody tr')[indice] as HTMLElement;
}

function textoDe(fixture: ComponentFixture<unknown>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

/** Deja pasar el debounce del NIT y responde la búsqueda de clientes que dispare. */
async function esperarClientes(http: HttpTestingController): Promise<void> {
  await new Promise<void>((resolver) => setTimeout(() => resolver(), 350));
  http
    .match((peticion) => peticion.url === `${API}/sales/clientes`)
    .forEach((peticion) => peticion.flush([]));
}

describe('Integración: ventas de ventanilla', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    configurarIntegracion();
    http = controlador();
    router = espiarNavegacion();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('mostrador', () => {
    function abrirMostrador(
      viajes: Viaje[] = [VIAJE],
      sucursales: Sucursal[] = [SUCURSAL_ORIGEN],
      rutas: Ruta[] = [],
    ): ComponentFixture<MostradorComponent> {
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(MostradorComponent);
      http
        .expectOne((peticion) => peticion.url === `${API}/fleet/sucursales`)
        .flush(sucursales);
      http
        .expectOne((peticion) => peticion.url === `${API}/trips/rutas`)
        .flush(rutas);
      http
        .expectOne((peticion) => peticion.url === `${API}/trips/viajes`)
        .flush(viajes);
      fixture.detectChanges();
      return fixture;
    }

    function abrirVenta(
      fixture: ComponentFixture<MostradorComponent>,
      mapa = MAPA_ASIENTOS,
    ): void {
      pulsar(fixture, 'Elegir');
      http.expectOne((peticion) => peticion.url === `${API}/sales/clientes`).flush([]);
      const viajeId = fixture.componentInstance.viajeElegido()?.viajeId;
      if (!viajeId) throw new Error('No se eligió un viaje para la venta.');
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/viajes/${viajeId}/asientos`)
        .flush(mapa);
      fixture.detectChanges();
    }

    it('muestra el estado de búsqueda y el aviso cuando no hay viajes', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(MostradorComponent);
      http.expectOne((peticion) => peticion.url === `${API}/fleet/sucursales`).flush([SUCURSAL_ORIGEN]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/rutas`).flush([]);
      const busqueda = http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`);
      fixture.detectChanges();

      // Cuando
      expect(fixture.componentInstance.buscando()).toBeTrue();

      // Entonces
      expect(textoDe(fixture)).toContain('Buscando viajes…');

      // Cuando
      busqueda.flush([]);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.buscando()).toBeFalse();
      expect(textoDe(fixture)).toContain(
        'No hay viajes programados para esa búsqueda (revisa fechas y destino).',
      );
    });

    it('muestra la carga del mapa de asientos hasta que responde el servidor', () => {
      // Dado
      const fixture = abrirMostrador();

      // Cuando
      pulsar(fixture, 'Elegir');
      http.expectOne((peticion) => peticion.url === `${API}/sales/clientes`).flush([]);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.cargandoMapa()).toBeTrue();
      expect(textoDe(fixture)).toContain('Cargando asientos…');

      // Cuando
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/viajes/${VIAJE.viajeId}/asientos`)
        .flush(MAPA_ASIENTOS);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.cargandoMapa()).toBeFalse();
      expect(fixture.nativeElement.querySelector('app-selector-asientos')).not.toBeNull();
    });

    it('busca los viajes programados y filtra por destino', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(MostradorComponent);

      // Cuando
      http.expectOne((peticion) => peticion.url === `${API}/fleet/sucursales`).flush([
        SUCURSAL_ORIGEN,
        SUCURSAL_GUATEMALA,
        SUCURSAL_COBAN,
      ]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/rutas`).flush([RUTA_GUATEMALA, RUTA_COBAN]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE, VIAJE_COBAN]);
      fixture.detectChanges();
      elegirOpcion(fixture, '#destino', SUCURSAL_COBAN.sucursalId);

      // Entonces
      const filas = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(filas.length).toBe(1);
      expect((filas[0] as HTMLElement).textContent).toContain('Cobán');
    });

    it('vende en efectivo con asientos y los datos del cliente', async () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(MostradorComponent);
      const avisos = TestBed.inject(ToastService);

      // Cuando
      http.expectOne((peticion) => peticion.url === `${API}/fleet/sucursales`).flush([SUCURSAL_ORIGEN]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/rutas`).flush([]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE]);
      fixture.detectChanges();

      pulsar(fixture, 'Elegir');
      http.expectOne((peticion) => peticion.url === `${API}/sales/clientes`).flush([CLIENTE]);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/viajes/${VIAJE.viajeId}/asientos`)
        .flush(MAPA_ASIENTOS);
      fixture.detectChanges();

      pulsar(fixture, NOMBRE);
      expect((fixture.nativeElement.querySelector('#nit') as HTMLInputElement).value).toBe(CLIENTE.nit);
      expect((fixture.nativeElement.querySelector('#nombre') as HTMLInputElement).value).toBe(CLIENTE.nombre);

      (fixture.nativeElement.querySelector('button[title="Asiento 1"]') as HTMLButtonElement).click();
      (fixture.nativeElement.querySelector('button[title="Asiento 3"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(textoDe(fixture)).toContain('Asientos: 1, 3');

      pulsar(fixture, 'Cobrar');
      const venta = http.expectOne((peticion) => peticion.url === `${API}/sales/ventas/mostrador`);
      expect(venta.request.method).toBe('POST');
      expect(venta.request.body.viajeId).toBe(VIAJE.viajeId);
      expect(venta.request.body.asientos).toEqual([1, 3]);
      expect(venta.request.body.clienteNit).toBe(CLIENTE.nit);
      expect(venta.request.body.clienteNombre).toBe(CLIENTE.nombre);
      expect(venta.request.body.clienteCorreo).toBe(CLIENTE.correo);
      fixture.componentInstance.cerrarModal();
      expect(fixture.componentInstance.viajeElegido()).toEqual(VIAJE);
      venta.flush(VENTA_CONFIRMADA);

      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE]);
      fixture.detectChanges();

      // Entonces
      const ticket = fixture.nativeElement.querySelector('app-ticket-boleto') as HTMLElement;
      expect(textoDe(fixture)).toContain('Venta confirmada');
      expect(ticket.textContent).toContain('Xela → Guatemala');
      expect(ticket.textContent).toContain('1, 3');
      expect(avisos.avisos().some((aviso) => aviso.texto === 'Venta confirmada. Cobra en efectivo.')).toBeTrue();

      await esperarClientes(http);
    });

    it('muestra el error del servidor al cobrar', async () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(MostradorComponent);
      const avisos = TestBed.inject(ToastService);

      // Cuando
      http.expectOne((peticion) => peticion.url === `${API}/fleet/sucursales`).flush([SUCURSAL_ORIGEN]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/rutas`).flush([]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE]);
      fixture.detectChanges();

      pulsar(fixture, 'Elegir');
      http.expectOne((peticion) => peticion.url === `${API}/sales/clientes`).flush([]);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/viajes/${VIAJE.viajeId}/asientos`)
        .flush(MAPA_ASIENTOS);
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('button[title="Asiento 1"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      pulsar(fixture, 'Cobrar');
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas/mostrador`).flush(
        {
          status: 400,
          codigo: 'FECHA_INVALIDA',
          mensaje: 'Revisa la fecha de pago.',
          errores: [{ campo: 'fechaPago', mensaje: 'La fecha de pago no puede ser anterior a hoy.' }],
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      // Entonces
      expect(
        avisos.avisos().some((aviso) => aviso.texto === 'Revisa los datos marcados en el formulario.'),
      ).toBeTrue();
      expect(textoDe(fixture)).toContain('La fecha de pago no puede ser anterior a hoy.');

      await esperarClientes(http);
    });

    it('valida la fecha antes de buscar y muestra el error si falla la búsqueda', () => {
      // Dado
      const fixture = abrirMostrador();
      const avisos = TestBed.inject(ToastService);

      // Cuando
      fixture.componentInstance.vender();
      fixture.componentInstance.fecha.set('');
      fixture.componentInstance.buscar();

      // Entonces
      expect(avisos.avisos().at(-1)?.texto).toBe(MENSAJE_FECHA_REQUERIDA);
      http.expectNone((peticion) => peticion.url === `${API}/trips/viajes`);

      // Cuando
      fixture.componentInstance.fecha.set('2026-10-31');
      fixture.componentInstance.hasta.set('');
      fixture.componentInstance.buscar();
      const busqueda = http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`);
      expect(busqueda.request.params.has('hasta')).toBeFalse();
      busqueda.flush(
        { codigo: 'SIN_SERVICIO', mensaje: 'No se pudieron buscar los viajes.' },
        { status: 503, statusText: 'Service Unavailable' },
      );

      // Entonces
      expect(fixture.componentInstance.buscando()).toBeFalse();
      expect(avisos.avisos().at(-1)?.texto).toBe('No se pudieron buscar los viajes.');
    });

    it('muestra el recorrido cuando hay ruta y sucursales con coordenadas', () => {
      // Dado
      const fixture = abrirMostrador(
        [VIAJE],
        [SUCURSAL_ORIGEN, SUCURSAL_GUATEMALA],
        [RUTA_GUATEMALA],
      );

      // Cuando
      abrirVenta(fixture);
      http
        .expectOne((peticion) => peticion.url.startsWith(URL_OSRM))
        .flush({
          code: 'Ok',
          routes: [
            {
              distance: 210_000,
              duration: 7_200,
              geometry: {
                coordinates: [
                  [SUCURSAL_ORIGEN.longitud, SUCURSAL_ORIGEN.latitud],
                  [SUCURSAL_GUATEMALA.longitud, SUCURSAL_GUATEMALA.latitud],
                ],
              },
            },
          ],
        });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.recorrido()).toEqual({
        origen: SUCURSAL_ORIGEN,
        destino: SUCURSAL_GUATEMALA,
      });
      expect(textoDe(fixture)).not.toContain('El recorrido de este viaje no está disponible.');
    });

    it('mantiene el aviso si la ruta no tiene una sucursal de destino disponible', () => {
      // Dado
      const fixture = abrirMostrador([VIAJE], [SUCURSAL_ORIGEN], [RUTA_GUATEMALA]);
      abrirVenta(fixture);

      // Cuando
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.recorrido()).toBeNull();
      expect(textoDe(fixture)).toContain('El recorrido de este viaje no está disponible.');
    });

    it('permite vender aunque no haya ruta para mostrar el recorrido', () => {
      // Dado
      const fixture = abrirMostrador([VIAJE_SIN_RUTA]);
      abrirVenta(fixture);

      // Cuando
      fixture.componentInstance.vender();

      // Entonces
      expect(fixture.componentInstance.recorrido()).toBeNull();
      expect(textoDe(fixture)).toContain('El recorrido de este viaje no está disponible.');
      expect(TestBed.inject(ToastService).avisos().at(-1)?.texto).toBe(
        'Elige al menos un asiento para vender.',
      );
      http.expectNone((peticion) => peticion.url === `${API}/sales/ventas/mostrador`);

      // Cuando
      fixture.componentInstance.cerrarModal();

      // Entonces
      expect(fixture.componentInstance.viajeElegido()).toBeNull();
    });

    it('permite capturar la venta sin correo y valida el correo opcional', () => {
      // Dado
      const fixture = abrirMostrador();
      abrirVenta(fixture);
      (fixture.nativeElement.querySelector('button[title="Asiento 1"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, '+ Agregar correo');
      fixture.componentInstance.formVenta.controls.clienteCorreo.setValue('correo-invalido');
      fixture.componentInstance.vender();
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.formVenta.controls.clienteCorreo.touched).toBeTrue();
      expect(textoDe(fixture)).toContain('Escribe un correo válido.');
      http.expectNone((peticion) => peticion.url === `${API}/sales/ventas/mostrador`);

      // Cuando
      fixture.componentInstance.formVenta.controls.clienteCorreo.setValue('');
      fixture.componentInstance.vender();
      const venta = http.expectOne((peticion) => peticion.url === `${API}/sales/ventas/mostrador`);
      expect(venta.request.body.clienteCorreo).toBeNull();
      venta.flush({ ...VENTA_CONFIRMADA, clienteCorreo: null });
      http
        .expectOne((peticion) => peticion.url.startsWith(`${API}/trips/viajes`))
        .flush([VIAJE]);
      fixture.detectChanges();

      // Entonces
      expect(textoDe(fixture)).toContain('No se envió por correo');
      expect(fixture.componentInstance.ventaConfirmada()?.clienteCorreo).toBeNull();
    });

    it('liga el cliente si sus campos están vacíos y acepta correo nulo al cobrar', async () => {
      // Dado
      const fixture = abrirMostrador();
      abrirVenta(fixture);
      fixture.componentInstance.formVenta.controls.clienteNit.setValue(CLIENTE.nit, {
        emitEvent: false,
      });
      fixture.componentInstance.formVenta.controls.clienteNombre.setValue(null);
      fixture.componentInstance.formVenta.controls.clienteCorreo.setValue(null);

      // Cuando
      (fixture.nativeElement.querySelector('.fila-nit button') as HTMLButtonElement).click();
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/clientes` &&
            peticion.params.get('busqueda') === CLIENTE.nit,
        )
        .flush([CLIENTE]);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.formVenta.controls.clienteNombre.value).toBe(CLIENTE.nombre);
      expect(fixture.componentInstance.formVenta.controls.clienteCorreo.value).toBe(CLIENTE.correo);

      // Cuando
      (fixture.nativeElement.querySelector('button[title="Asiento 1"]') as HTMLButtonElement).click();
      fixture.componentInstance.formVenta.controls.clienteCorreo.setValue(null);
      fixture.detectChanges();
      fixture.componentInstance.vender();
      const venta = http.expectOne((peticion) => peticion.url === `${API}/sales/ventas/mostrador`);

      // Entonces
      expect(venta.request.body.clienteCorreo).toBeNull();
      venta.flush({ ...VENTA_CONFIRMADA, clienteCorreo: null });
      http
        .expectOne((peticion) => peticion.url.startsWith(`${API}/trips/viajes`))
        .flush([VIAJE]);
      fixture.detectChanges();
      expect(textoDe(fixture)).toContain('No se envió por correo');

      await esperarClientes(http);
    });

    it('avisa cuando el NIT no corresponde a una cuenta y hay clientes parecidos', () => {
      // Dado
      const fixture = abrirMostrador();
      abrirVenta(fixture);

      // Cuando
      fixture.componentInstance.formVenta.controls.clienteNit.setValue(null, {
        emitEvent: false,
      });
      fixture.componentInstance.buscarCliente();

      // Entonces
      expect(TestBed.inject(ToastService).avisos().at(-1)?.texto).toBe(
        'Escribe el NIT del cliente para buscarlo.',
      );
      http.expectNone(
        (peticion) =>
          peticion.url === `${API}/sales/clientes` && peticion.params.has('busqueda'),
      );
      fixture.componentInstance.formVenta.controls.clienteNit.setValue(NIT_SIN_CUENTA, {
        emitEvent: false,
      });

      // Cuando
      (fixture.nativeElement.querySelector('.fila-nit button') as HTMLButtonElement).click();
      fixture.detectChanges();
      const busqueda = http.expectOne(
        (peticion) =>
          peticion.url === `${API}/sales/clientes` &&
          peticion.params.get('busqueda') === NIT_SIN_CUENTA,
      );
      busqueda.flush([CLIENTE_OTRO]);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.nitSinCuenta()).toBeTrue();
      expect(fixture.componentInstance.clienteLigado()).toBeNull();
      expect(textoDe(fixture)).toContain('Ese NIT no existe en el sistema');
      expect(textoDe(fixture)).toContain(CLIENTE_OTRO.nombre);

      // Cuando
      (fixture.nativeElement.querySelector('.fila-nit button') as HTMLButtonElement).click();
      fixture.detectChanges();
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/clientes` &&
            peticion.params.get('busqueda') === NIT_SIN_CUENTA,
        )
        .flush([]);
      fixture.detectChanges();

      // Entonces
      expect(TestBed.inject(ToastService).avisos().at(-1)?.texto).toBe(
        'Ese NIT no existe en el sistema. La venta se registrará con los datos que escribas.',
      );
    });

    it('liga el cliente encontrado y conserva los datos escritos por el cajero', async () => {
      // Dado
      const fixture = abrirMostrador();
      abrirVenta(fixture);
      await esperarClientes(http);
      fixture.componentInstance.formVenta.controls.clienteNit.setValue(null);

      // Cuando
      await new Promise<void>((resolver) => setTimeout(resolver, 350));
      const busquedaVacia = http.expectOne(
        (peticion) => peticion.url === `${API}/sales/clientes`,
      );
      expect(busquedaVacia.request.params.has('busqueda')).toBeFalse();
      busquedaVacia.flush([]);

      // Entonces
      expect(fixture.componentInstance.clientes()).toEqual([]);

      // Dado
      fixture.componentInstance.formVenta.controls.clienteNombre.setValue('Nombre escrito');
      fixture.componentInstance.formVenta.controls.clienteCorreo.setValue('manual@pruebas.gt');
      fixture.componentInstance.formVenta.controls.clienteNit.setValue(CLIENTE.nit);

      // Cuando
      await new Promise<void>((resolver) => setTimeout(resolver, 350));
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/clientes` &&
            peticion.params.get('busqueda') === CLIENTE.nit,
        )
        .flush([CLIENTE]);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.clienteLigado()).toEqual(CLIENTE);
      expect(fixture.componentInstance.formVenta.controls.clienteNombre.value).toBe('Nombre escrito');
      expect(fixture.componentInstance.formVenta.controls.clienteCorreo.value).toBe(
        'manual@pruebas.gt',
      );
      expect(fixture.componentInstance.sugerencias()).toEqual([]);

      // Cuando
      (fixture.nativeElement.querySelector('.fila-nit button') as HTMLButtonElement).click();
      fixture.detectChanges();
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/clientes` &&
            peticion.params.get('busqueda') === CLIENTE.nit,
        )
        .flush([CLIENTE]);
      fixture.detectChanges();

      // Entonces
      expect(TestBed.inject(ToastService).avisos().at(-1)?.texto).toBe(
        `Cliente encontrado: ${CLIENTE.nombre}.`,
      );
    });

    it('permite al administrador del sistema cambiar la sucursal de origen', () => {
      // Dado
      guardarSesion(USUARIO_ADMIN_SISTEMA);
      const fixture = abrir(MostradorComponent);
      http
        .expectOne((peticion) => peticion.url === `${API}/fleet/sucursales`)
        .flush([SUCURSAL_ORIGEN, SUCURSAL_GUATEMALA]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/rutas`).flush([]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([]);
      fixture.detectChanges();

      // Cuando
      elegirOpcion(fixture, '.pagina-encabezado #sucursal', SUCURSAL_GUATEMALA.sucursalId);
      http
        .expectOne((peticion) => peticion.url === `${API}/trips/rutas`)
        .flush([RUTA_GUATEMALA]);
      const viajes = http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`);
      expect(viajes.request.params.get('sucursalId')).toBe(SUCURSAL_GUATEMALA.sucursalId);
      viajes.flush([VIAJE]);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.sucursalId()).toBe(SUCURSAL_GUATEMALA.sucursalId);
      expect(fixture.componentInstance.destinos()).toEqual([]);
      expect(fixture.nativeElement.querySelectorAll('select#sucursal').length).toBe(2);
    });
  });

  describe('ventas', () => {
    function abrirVentas(ventas: Venta[] = [], viajes: Viaje[] = [VIAJE]): ComponentFixture<VentasComponent> {
      guardarSesion(USUARIO_ADMIN_SUCURSAL);
      const fixture = abrir(VentasComponent);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas`)
        .flush(ventas);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush(viajes);
      fixture.detectChanges();
      return fixture;
    }

    it('lista las ventas de la sucursal con su viaje y estado', () => {
      // Dado
      guardarSesion(USUARIO_ADMIN_SUCURSAL);
      const fixture = abrir(VentasComponent);

      // Cuando
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas`)
        .flush([VENTA_CONFIRMADA, VENTA_CANCELADA]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE]);
      fixture.detectChanges();

      // Entonces
      const filas = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(filas.length).toBe(2);
      expect((filas[0] as HTMLElement).textContent).toContain('Confirmada');
      expect((filas[0] as HTMLElement).textContent).toContain('Xela → Guatemala');
      expect((filas[1] as HTMLElement).textContent).toContain('Cancelada');
    });

    it('agrupa ventas por estado del viaje y contempla viajes eliminados', () => {
      // Dado
      const viajeEnRuta: Viaje = {
        ...VIAJE,
        viajeId: 'viaje-en-ruta',
        estado: 'EN_RUTA',
        busPlaca: null,
      };
      const viajeCompletado: Viaje = {
        ...VIAJE,
        viajeId: 'viaje-completado',
        estado: 'COMPLETADO',
        fechaSalidaProgramada: '2026-10-30T06:00:00-06:00',
      };
      const ventaEnRuta: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-en-ruta',
        viajeId: viajeEnRuta.viajeId,
        viaje: null,
      };
      const ventaCompletada: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-completada',
        viajeId: viajeCompletado.viajeId,
        viaje: null,
      };
      const ventaSinViaje: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-sin-viaje',
        viajeId: 'viaje-eliminado',
        viaje: null,
      };
      const ventaCanceladaSinViaje: Venta = {
        ...VENTA_CANCELADA,
        ventaId: 'venta-cancelada-sin-viaje',
        viajeId: 'viaje-eliminado-2',
        viaje: null,
      };
      const fixture = abrirVentas(
        [VENTA_CONFIRMADA, ventaEnRuta, ventaCompletada, ventaSinViaje, ventaCanceladaSinViaje],
        [VIAJE, viajeEnRuta, viajeCompletado],
      );

      // Cuando
      const grupos = fixture.componentInstance.gruposViaje();

      // Entonces
      expect(grupos.map((grupo) => grupo.estado)).toEqual([
        'EN_RUTA',
        'PROGRAMADO',
        'COMPLETADO',
        'OTRO',
      ]);
      expect(grupos.find((grupo) => grupo.estado === 'EN_RUTA')?.opciones[0].texto).not.toContain('Bus');
      expect(fixture.componentInstance.rutaDe(ventaEnRuta)?.texto).toBe('Xela → Guatemala');
      expect(fixture.componentInstance.rutaDe(ventaSinViaje)).toBeNull();
      expect(fixture.componentInstance.viajeSinDatos(ventaSinViaje)).toBe('Sin información del viaje');
      expect(fixture.componentInstance.viajeSinDatos(ventaCanceladaSinViaje)).toBe('Viaje eliminado');
      expect(fixture.componentInstance.estadoViajeDe(ventaSinViaje)).toBeNull();
    });

    it('ordena grupos y filtra por viaje concreto, estado y clientes sin datos', () => {
      // Dado
      const viajeCompletadoAnterior: Viaje = {
        ...VIAJE,
        viajeId: 'viaje-completado-anterior',
        estado: 'COMPLETADO',
        fechaSalidaProgramada: '2026-10-29T06:00:00-06:00',
      };
      const viajeCompletadoReciente: Viaje = {
        ...viajeCompletadoAnterior,
        viajeId: 'viaje-completado-reciente',
        fechaSalidaProgramada: '2026-10-30T06:00:00-06:00',
      };
      const viajeProgramadoDos: Viaje = {
        ...VIAJE,
        viajeId: 'viaje-programado-2',
        fechaSalidaProgramada: '2026-11-02T06:00:00-06:00',
      };
      const ventaCompletadaAnterior: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-completada-anterior',
        viajeId: viajeCompletadoAnterior.viajeId,
        viaje: null,
      };
      const ventaCompletadaReciente: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-completada-reciente',
        viajeId: viajeCompletadoReciente.viajeId,
        viaje: null,
      };
      const ventaProgramadaDos: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-programada-2',
        viajeId: viajeProgramadoDos.viajeId,
        viaje: null,
      };
      const ventaSinCliente: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-sin-cliente',
        viajeId: 'viaje-eliminado-1',
        clienteNit: null,
        clienteNombre: null,
        viaje: null,
      };
      const ventaSinClienteDos: Venta = {
        ...ventaSinCliente,
        ventaId: 'venta-sin-cliente-2',
        viajeId: 'viaje-eliminado-2',
      };
      const fixture = abrirVentas(
        [
          ventaSinCliente,
          ventaSinClienteDos,
          ventaCompletadaAnterior,
          ventaCompletadaReciente,
          VENTA_CONFIRMADA,
          ventaProgramadaDos,
        ],
        [VIAJE, viajeProgramadoDos, viajeCompletadoAnterior, viajeCompletadoReciente],
      );

      // Cuando
      const grupos = fixture.componentInstance.gruposViaje();
      fixture.componentInstance.filtrarViaje(viajeCompletadoAnterior.viajeId);

      // Entonces
      expect(
        grupos.find((grupo) => grupo.estado === 'COMPLETADO')?.opciones.map((opcion) => opcion.id),
      ).toEqual([viajeCompletadoReciente.viajeId, viajeCompletadoAnterior.viajeId]);
      expect(grupos.find((grupo) => grupo.estado === 'OTRO')?.opciones).toHaveSize(2);
      expect(grupos.find((grupo) => grupo.estado === 'PROGRAMADO')?.opciones).toHaveSize(2);
      expect(fixture.componentInstance.paginaActual().elementos).toEqual([
        ventaCompletadaAnterior,
      ]);

      // Cuando
      fixture.componentInstance.filtrarViaje('ESTADO:COMPLETADO');
      expect(fixture.componentInstance.paginaActual().total).toBe(2);
      fixture.componentInstance.filtrarViaje(ventaSinCliente.viajeId);
      fixture.componentInstance.filtrar('cliente');

      // Entonces
      expect(fixture.componentInstance.paginaActual().total).toBe(0);

      // Cuando
      fixture.componentInstance.filtrarViaje('');
      fixture.componentInstance.filtrar('');

      // Entonces
      expect(fixture.componentInstance.paginaActual().total).toBe(6);
    });

    it('filtra por estado y por cliente', () => {
      // Dado
      guardarSesion(USUARIO_ADMIN_SUCURSAL);
      const fixture = abrir(VentasComponent);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas`)
        .flush([VENTA_CONFIRMADA, VENTA_CANCELADA]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE]);
      fixture.detectChanges();

      // Cuando
      elegirOpcion(fixture, '#estado', 'CANCELADA');
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`).flush([VENTA_CANCELADA]);
      fixture.detectChanges();
      escribir(fixture, '#buscar', CLIENTE.nit);

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
      escribir(fixture, '#buscar', 'sin coincidencias');
      expect(textoDe(fixture)).toContain('No hay ventas que coincidan con los filtros.');
    });

    it('abre el detalle y deja reimprimir el boleto', () => {
      // Dado
      guardarSesion(USUARIO_ADMIN_SUCURSAL);
      const fixture = abrir(VentasComponent);
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`).flush([VENTA_CONFIRMADA]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE]);
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Ver / Imprimir', filaDe(fixture));
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CONFIRMADA.ventaId}`)
        .flush(VENTA_CONFIRMADA);
      fixture.detectChanges();

      // Entonces
      expect(textoDe(fixture)).toContain('Detalle de la venta');
      expect(textoDe(fixture)).toContain('Boleto para imprimir');
      expect(textoDe(fixture)).toContain('Boletos emitidos');
      expect(fixture.nativeElement.querySelector('app-ticket-boleto')).not.toBeNull();
    });

    it('mantiene la lista cuando fallan los catálogos y cierra un detalle sin viaje', () => {
      // Dado
      guardarSesion(USUARIO_ADMIN_SISTEMA);
      const fixture = abrir(VentasComponent);
      const avisos = TestBed.inject(ToastService);
      const ventaSinViaje: Venta = { ...VENTA_CONFIRMADA, viaje: null };
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`).flush([ventaSinViaje]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush(
        {},
        { status: 503, statusText: 'Service Unavailable' },
      );
      http.expectOne((peticion) => peticion.url === `${API}/fleet/sucursales`).flush(
        {},
        { status: 503, statusText: 'Service Unavailable' },
      );
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Ver / Imprimir', filaDe(fixture));
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas/${ventaSinViaje.ventaId}`)
        .flush({}, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.enDetalle()).toBeNull();
      expect(fixture.componentInstance.cargandoDetalle()).toBeFalse();
      expect(textoDe(fixture)).toContain('Sin información del viaje');
      expect(avisos.avisos().some((aviso) => aviso.tipo === 'error')).toBeTrue();
    });

    it('cancela una venta confirmada con motivo y versión', () => {
      // Dado
      guardarSesion(USUARIO_ADMIN_SUCURSAL);
      const fixture = abrir(VentasComponent);
      const avisos = TestBed.inject(ToastService);
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`).flush([VENTA_CONFIRMADA]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([VIAJE]);
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Cancelar', filaDe(fixture));
      escribir(fixture, '#motivo', MOTIVO_CANCELACION);
      enviar(fixture);
      pulsar(fixture, 'Cancelar venta');
      const peticion = http.expectOne(
        (solicitud) => solicitud.url === `${API}/sales/ventas/${VENTA_CONFIRMADA.ventaId}/cancelar`,
      );
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({
        motivo: MOTIVO_CANCELACION,
        fechaCancelacion: hoyGt(),
        version: VENTA_CONFIRMADA.version,
      });
      peticion.flush({
        ...VENTA_CONFIRMADA,
        estado: 'CANCELADA',
        motivoCancelacion: MOTIVO_CANCELACION,
        fechaCancelacion: hoyGt(),
        version: VENTA_CONFIRMADA.version + 1,
      });
      fixture.detectChanges();

      // Entonces
      expect(avisos.avisos().some((aviso) => aviso.texto === 'Venta cancelada.')).toBeTrue();
      expect(filaDe(fixture).textContent).toContain('Cancelada');
      expect(fixture.componentInstance.porCancelar()).toBeNull();
    });

    it('conserva el viaje del detalle al cancelar aunque la respuesta no lo incluya', () => {
      // Dado
      const fixture = abrirVentas([VENTA_CONFIRMADA, VENTA_CANCELADA]);
      pulsar(fixture, 'Ver / Imprimir', filaDe(fixture));
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CONFIRMADA.ventaId}`)
        .flush(VENTA_CONFIRMADA);
      fixture.detectChanges();

      // Cuando
      fixture.componentInstance.abrirCancelar(VENTA_CONFIRMADA);
      fixture.componentInstance.formCancelar.setValue({
        motivo: MOTIVO_CANCELACION,
        fechaCancelacion: hoyGt(),
      });
      fixture.componentInstance.pedirConfirmacion();
      fixture.componentInstance.confirmarCancelar();
      http
        .expectOne(
          (peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CONFIRMADA.ventaId}/cancelar`,
        )
        .flush({
          ...VENTA_CONFIRMADA,
          estado: 'CANCELADA',
          motivoCancelacion: MOTIVO_CANCELACION,
          fechaCancelacion: hoyGt(),
          viaje: null,
        });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.enDetalle()?.estado).toBe('CANCELADA');
      expect(fixture.componentInstance.enDetalle()?.viaje).toEqual(VENTA_CONFIRMADA.viaje);
      expect(fixture.componentInstance.confirmando()).toBeFalse();
    });

    it('muestra errores del servidor al cancelar sin perder el motivo', () => {
      // Dado
      const fixture = abrirVentas([VENTA_CONFIRMADA]);
      const avisos = TestBed.inject(ToastService);

      // Cuando
      pulsar(fixture, 'Cancelar', filaDe(fixture));
      escribir(fixture, '#motivo', MOTIVO_CANCELACION);
      enviar(fixture);
      pulsar(fixture, 'Cancelar venta');
      http
        .expectOne(
          (peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CONFIRMADA.ventaId}/cancelar`,
        )
        .flush(
          {
            codigo: 'VERSION_CONFLICT',
            mensaje: 'La venta cambió. Recarga e inténtalo otra vez.',
            errores: [{ campo: 'motivo', mensaje: 'Revisa el motivo.' }],
          },
          { status: 409, statusText: 'Conflict' },
        );
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.cancelando()).toBeFalse();
      expect(fixture.componentInstance.confirmando()).toBeFalse();
      expect(fixture.componentInstance.formCancelar.controls.motivo.errors?.['servidor']).toBe(
        'Revisa el motivo.',
      );
      expect(avisos.avisos().at(-1)?.texto).toBe('Revisa los datos marcados en el formulario.');
    });

    it('valida el motivo y no envía una cancelación sin venta seleccionada', () => {
      // Dado
      const fixture = abrirVentas([VENTA_CONFIRMADA]);
      const componente = fixture.componentInstance;
      componente.abrirCancelar(VENTA_CONFIRMADA);
      componente.formCancelar.controls.motivo.setValue('');

      // Cuando
      componente.pedirConfirmacion();
      componente.porCancelar.set(null);
      componente.confirmarCancelar();

      // Entonces
      expect(componente.formCancelar.controls.motivo.touched).toBeTrue();
      expect(componente.confirmando()).toBeFalse();
      http.expectNone(
        (peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CONFIRMADA.ventaId}/cancelar`,
      );
    });

    it('mantiene nulo el viaje del detalle si tampoco viene en la respuesta de cancelación', () => {
      // Dado
      const ventaSinViaje: Venta = {
        ...VENTA_CONFIRMADA,
        ventaId: 'venta-sin-viaje',
        viajeId: 'viaje-eliminado',
        viaje: null,
      };
      const fixture = abrirVentas([ventaSinViaje], []);
      pulsar(fixture, 'Ver / Imprimir', filaDe(fixture));
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas/${ventaSinViaje.ventaId}`)
        .flush(ventaSinViaje);
      fixture.detectChanges();

      // Cuando
      fixture.componentInstance.abrirCancelar(ventaSinViaje);
      fixture.componentInstance.formCancelar.setValue({
        motivo: MOTIVO_CANCELACION,
        fechaCancelacion: hoyGt(),
      });
      fixture.componentInstance.pedirConfirmacion();
      fixture.componentInstance.confirmarCancelar();
      http
        .expectOne(
          (peticion) => peticion.url === `${API}/sales/ventas/${ventaSinViaje.ventaId}/cancelar`,
        )
        .flush({
          ...ventaSinViaje,
          estado: 'CANCELADA',
          motivoCancelacion: MOTIVO_CANCELACION,
          fechaCancelacion: hoyGt(),
          viaje: null,
        });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.enDetalle()?.estado).toBe('CANCELADA');
      expect(fixture.componentInstance.enDetalle()?.viaje).toBeNull();
    });

    it('consulta el historial de ventas y alquileres por NIT', () => {
      // Dado
      guardarSesion(USUARIO_ADMIN_SUCURSAL);
      const fixture = abrir(VentasComponent);
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`).flush([]);
      http.expectOne((peticion) => peticion.url === `${API}/trips/viajes`).flush([]);
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Historial por NIT');
      escribir(fixture, '#nit', CLIENTE.nit);
      pulsar(fixture, 'Ver historial');
      http.expectOne((peticion) => peticion.url === `${API}/sales/historial`).flush(HISTORIAL);
      fixture.detectChanges();

      // Entonces
      expect(textoDe(fixture)).toContain(CLIENTE.nombre);
      expect(textoDe(fixture)).toContain('Ventas (1)');
      expect(textoDe(fixture)).toContain('Alquileres (1)');
    });

    it('envía los filtros de canal y fechas y filtra por estado del viaje', () => {
      // Dado
      const fixture = abrirVentas([VENTA_CONFIRMADA], [VIAJE]);

      // Cuando
      elegirOpcion(fixture, '#canal', 'PRESENCIAL');
      const porCanal = http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`);
      expect(porCanal.request.params.get('canal')).toBe('PRESENCIAL');
      expect(porCanal.request.params.has('estado')).toBeFalse();
      porCanal.flush([VENTA_CONFIRMADA]);
      fixture.detectChanges();

      fixture.componentInstance.desde.set('2026-10-01');
      fixture.componentInstance.hasta.set('2026-10-31');
      fixture.componentInstance.cambiarFiltro();
      const porFechas = http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`);
      expect(porFechas.request.params.get('desde')).toBe('2026-10-01');
      expect(porFechas.request.params.get('hasta')).toBe('2026-10-31');
      expect(porFechas.request.params.get('canal')).toBe('PRESENCIAL');
      porFechas.flush([VENTA_CONFIRMADA]);
      fixture.detectChanges();

      // Entonces
      elegirOpcion(fixture, '#viaje', 'ESTADO:OTRO');
      expect(fixture.componentInstance.filtradas().length).toBe(0);
      elegirOpcion(fixture, '#viaje', 'ESTADO:PROGRAMADO');
      expect(fixture.componentInstance.filtradas().length).toBe(1);
      expect(fixture.componentInstance.gruposViaje()[0].estado).toBe('PROGRAMADO');
    });

    it('valida el NIT y muestra el estado vacío y el error del historial', () => {
      // Dado
      const fixture = abrirVentas();
      const avisos = TestBed.inject(ToastService);

      // Cuando
      pulsar(fixture, 'Historial por NIT');
      pulsar(fixture, 'Ver historial');

      // Entonces
      expect(avisos.avisos().at(-1)?.texto).toBe('Escribe el NIT para ver su historial.');
      http.expectNone((peticion) => peticion.url === `${API}/sales/historial`);

      // Cuando
      escribir(fixture, '#nit', NIT_SIN_CUENTA);
      pulsar(fixture, 'Ver historial');
      const historial = http.expectOne((peticion) => peticion.url === `${API}/sales/historial`);
      expect(historial.request.params.get('nit')).toBe(NIT_SIN_CUENTA);
      historial.flush({ ...HISTORIAL, nit: NIT_SIN_CUENTA, nombre: '', ventas: [], alquileres: [] });
      fixture.detectChanges();

      // Entonces
      expect(textoDe(fixture)).toContain('Cliente');
      expect(textoDe(fixture)).toContain('Sin ventas para ese NIT.');
      expect(textoDe(fixture)).toContain('Sin alquileres para ese NIT.');
      expect(avisos.avisos().at(-1)?.texto).toBe('Ese NIT no tiene ventas ni alquileres.');

      // Cuando
      pulsar(fixture, 'Ver historial');
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/historial`)
        .flush({}, { status: 503, statusText: 'Service Unavailable' });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.buscandoHistorial()).toBeFalse();
      expect(avisos.avisos().at(-1)?.texto).toBe(
        'Ocurrió un problema en el servidor. Intenta de nuevo.',
      );
    });
  });
  describe('reembolsos', () => {
    it('escanea el código del boleto y devuelve el efectivo', async () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(ReembolsosComponent);
      const avisos = TestBed.inject(ToastService);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas`)
        .flush([VENTA_CANCELADA]);
      fixture.detectChanges();

      // Cuando
      escribir(fixture, '#buscar', CODIGO_BOLETO);
      presionarEnter(fixture, '#buscar');
      await fixture.whenStable();
      const busqueda = http.expectOne((peticion) => peticion.url === `${API}/sales/ventas/boleto`);
      expect(busqueda.request.params.get('codigo')).toBe(CODIGO_BOLETO);
      busqueda.flush([VENTA_CANCELADA]);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CANCELADA.ventaId}`)
        .flush(VENTA_DETALLE_CANCELADA);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(textoDe(fixture)).toContain('Boleto cancelado');
      expect(textoDe(fixture)).toContain('A1B2-C3D4-E5F6');
      expect(textoDe(fixture)).toContain('Total a devolver');

      pulsar(fixture, 'Reembolsar en efectivo');
      pulsar(fixture, 'Sí, reembolsar');
      const reembolso = http.expectOne(
        (peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CANCELADA.ventaId}/reembolsar`,
      );
      expect(reembolso.request.body).toEqual({ version: VENTA_CANCELADA.version });
      reembolso.flush(VENTA_REEMBOLSADA);
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`).flush([]);
      fixture.detectChanges();

      // Entonces
      expect(avisos.avisos().some((aviso) => aviso.texto === MENSAJE_REEMBOLSO)).toBeTrue();
      expect((fixture.nativeElement.querySelector('#buscar') as HTMLInputElement).value).toBe('');
    });

    it('filtra por NIT sin consultar el servidor', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(ReembolsosComponent);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas`)
        .flush([VENTA_CANCELADA, VENTA_OTRA_CANCELADA]);
      fixture.detectChanges();

      // Cuando
      escribir(fixture, '#buscar', CLIENTE.nit);
      presionarEnter(fixture, '#buscar');

      // Entonces
      http.expectNone((peticion) => peticion.url === `${API}/sales/ventas/boleto`);
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
      expect(filaDe(fixture).textContent).toContain(NOMBRE);
    });

    it('muestra el error cuando el boleto ya fue reembolsado', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(ReembolsosComponent);
      const avisos = TestBed.inject(ToastService);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas`)
        .flush([VENTA_CANCELADA]);
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Ver', filaDe(fixture));
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CANCELADA.ventaId}`)
        .flush(VENTA_DETALLE_CANCELADA);
      fixture.detectChanges();
      pulsar(fixture, 'Reembolsar en efectivo');
      pulsar(fixture, 'Sí, reembolsar');
      http
        .expectOne(
          (peticion) => peticion.url === `${API}/sales/ventas/${VENTA_CANCELADA.ventaId}/reembolsar`,
        )
        .flush(
          {
            status: 409,
            codigo: 'YA_REEMBOLSADA',
            mensaje: 'Ese boleto ya fue reembolsado.',
            errores: [],
          },
          { status: 409, statusText: 'Conflict' },
        );
      fixture.detectChanges();

      // Entonces
      expect(avisos.avisos().some((aviso) => aviso.texto === 'Ese boleto ya fue reembolsado.')).toBeTrue();
      expect(fixture.componentInstance.reembolsando()).toBeFalse();
    });

    it('consulta la tarifa del alquiler y registra la devolución', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(ReembolsosComponent);
      const avisos = TestBed.inject(ToastService);
      http.expectOne((peticion) => peticion.url === `${API}/sales/ventas`).flush([]);
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Alquileres');
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/ordenes-alquiler` && peticion.params.get('estado') === 'CANCELADA',
        )
        .flush([ORDEN_CANCELADA]);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/ordenes-alquiler` && peticion.params.get('estado') === 'REEMBOLSADA',
        )
        .flush([]);
      fixture.detectChanges();

      expect(textoDe(fixture)).toContain('Pendiente de entregar en efectivo');
      expect(filaDe(fixture).textContent).toContain('50%');

      pulsar(fixture, 'Ver', filaDe(fixture));
      fixture.detectChanges();
      expect(textoDe(fixture)).toContain('Alquiler cancelado');
      expect(textoDe(fixture)).toContain('Cancelación con más de 24 horas de anticipación.');
      expect(textoDe(fixture)).toContain('se retienen');

      pulsar(fixture, 'Reembolsar en efectivo');
      pulsar(fixture, 'Sí, reembolsar');
      const reembolso = http.expectOne(
        (peticion) => peticion.url === `${API}/sales/ordenes-alquiler/${ORDEN_CANCELADA.ordenId}/reembolso`,
      );
      expect(reembolso.request.body).toEqual({ version: ORDEN_CANCELADA.version });
      reembolso.flush(ORDEN_REEMBOLSADA);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/ordenes-alquiler` && peticion.params.get('estado') === 'CANCELADA',
        )
        .flush([]);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API}/sales/ordenes-alquiler` && peticion.params.get('estado') === 'REEMBOLSADA',
        )
        .flush([ORDEN_REEMBOLSADA]);
      fixture.detectChanges();

      // Entonces
      expect(avisos.avisos().some((aviso) => aviso.texto === MENSAJE_REEMBOLSO)).toBeTrue();
    });
  });
  describe('órdenes de alquiler', () => {
    it('lista las órdenes y distingue el cobro en efectivo', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(OrdenesComponent);

      // Cuando
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ordenes-alquiler`)
        .flush([ORDEN_PENDIENTE, ORDEN_CARTERA, ORDEN_PAGADA_OTRA]);
      fixture.detectChanges();

      // Entonces
      const filas = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(filas.length).toBe(3);
      expect((filas[0] as HTMLElement).textContent).toContain('Pagar en efectivo');
      expect((filas[1] as HTMLElement).textContent).toContain('Cobrando con cartera…');
      expect((filas[2] as HTMLElement).textContent).toContain('Pagada');
    });

    it('filtra las órdenes rechazadas y muestra el motivo', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(OrdenesComponent);
      http.expectOne((peticion) => peticion.url === `${API}/sales/ordenes-alquiler`).flush([]);
      fixture.detectChanges();

      // Cuando
      elegirOpcion(fixture, '#estado', 'RECHAZADA');
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ordenes-alquiler`)
        .flush([ORDEN_RECHAZADA]);
      fixture.detectChanges();
      pulsar(fixture, 'Ver', filaDe(fixture));
      http
        .expectOne(
          (peticion) => peticion.url === `${API}/sales/ordenes-alquiler/${ORDEN_RECHAZADA.ordenId}`,
        )
        .flush(ORDEN_RECHAZADA);
      fixture.detectChanges();

      // Entonces
      expect(filaDe(fixture).textContent).toContain('Rechazada');
      expect(textoDe(fixture)).toContain('Motivo del rechazo');
      expect(textoDe(fixture)).toContain('La billetera digital no tenía saldo suficiente.');
    });

    it('cobra una orden en efectivo y avisa al menú', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const avisosMenu = TestBed.inject(AvisosMenuService);
      let refrescos = 0;
      avisosMenu.cambios$.subscribe(() => refrescos++);
      const fixture = abrir(OrdenesComponent);
      const avisos = TestBed.inject(ToastService);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ordenes-alquiler`)
        .flush([ORDEN_PENDIENTE]);
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Pagar en efectivo', filaDe(fixture));
      enviar(fixture);
      pulsar(fixture, 'Confirmar pago');
      const pago = http.expectOne(
        (peticion) => peticion.url === `${API}/sales/ordenes-alquiler/${ORDEN_PENDIENTE.ordenId}/pago-efectivo`,
      );
      expect(pago.request.body).toEqual({ fechaPago: hoyGt() });
      pago.flush(ORDEN_PAGADA);
      fixture.detectChanges();

      // Entonces
      expect(avisos.avisos().some((aviso) => aviso.texto === 'Orden pagada en efectivo.')).toBeTrue();
      expect(refrescos).toBe(1);
      expect(filaDe(fixture).textContent).toContain('Pagada');
    });

    it('muestra el error cuando la orden ya fue pagada', () => {
      // Dado
      guardarSesion(USUARIO_CAJERO);
      const fixture = abrir(OrdenesComponent);
      const avisos = TestBed.inject(ToastService);
      http
        .expectOne((peticion) => peticion.url === `${API}/sales/ordenes-alquiler`)
        .flush([ORDEN_PENDIENTE]);
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Pagar en efectivo', filaDe(fixture));
      enviar(fixture);
      pulsar(fixture, 'Confirmar pago');
      http
        .expectOne(
          (peticion) => peticion.url === `${API}/sales/ordenes-alquiler/${ORDEN_PENDIENTE.ordenId}/pago-efectivo`,
        )
        .flush(
          {
            status: 409,
            codigo: 'YA_PAGADA',
            mensaje: 'La orden ya fue pagada.',
            errores: [],
          },
          { status: 409, statusText: 'Conflict' },
        );
      fixture.detectChanges();

      // Entonces
      expect(avisos.avisos().some((aviso) => aviso.texto === 'La orden ya fue pagada.')).toBeTrue();
      expect(fixture.componentInstance.pagando()).toBeFalse();
    });
  });
});
