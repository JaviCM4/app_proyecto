import { HttpRequest } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Cartera, MovimientoCartera } from '../app/core/models/cartera.model';
import { Sucursal } from '../app/core/models/sucursal.model';
import { Perfil } from '../app/core/models/usuario.model';
import { Historial, Venta, VentaHistorial, VentaPendiente } from '../app/core/models/venta.model';
import { MapaAsientos, Ruta, Viaje } from '../app/core/models/viaje.model';
import { hoyGt } from '../app/core/utils/fechas';
import { CarteraComponent } from '../app/paginas/cuenta/cartera/cartera.component';
import { RecargaComponent } from '../app/paginas/cuenta/recarga/recarga.component';
import { ComprarComponent } from '../app/paginas/compras/comprar/comprar.component';
import { MisComprasComponent } from '../app/paginas/compras/mis-compras/mis-compras.component';
import { InicioComponent } from '../app/paginas/publico/inicio/inicio.component';
import { ToastService } from '../app/shared/services/toast.service';
import {
  API,
  API_IDENTITY,
  CORREO,
  abrir,
  configurarIntegracion,
  controlador,
  enviar,
  escribir,
  espiarNavegacion,
  guardarSesion,
} from './soporte';

/**
 * Pruebas de integración de la compra de boletos y la cartera digital.
 * Componentes y plantillas reales, servicios reales y HTTP simulado.
 * Convención: Dado / Cuando / Entonces (flujo completo, sin AAA).
 */

const API_SUCURSALES = `${API}/fleet/sucursales`;
const API_RUTAS = `${API}/trips/rutas`;
const API_VIAJES = `${API}/trips/viajes`;
const API_ASIENTOS = `${API}/sales/viajes`;
const API_VENTAS = `${API}/sales/ventas`;
const API_HISTORIAL = `${API}/sales/historial/mio`;
const API_CARTERA = `${API}/wallet/cartera`;
const API_PERFIL = `${API_IDENTITY}/perfil`;

const NIT = '1234567-8';
const NOMBRE_CLIENTE = 'Ana Pérez';
const TEXTO_SIN_RESULTADOS = 'No existe';
const FECHA_PAGO = hoyGt();
const SALIDA = new Date(Date.now() + 2 * 86_400_000).toISOString();
const LLEGADA = new Date(Date.now() + 2 * 86_400_000 + 5 * 3_600_000).toISOString();
const SALIDA_PASADA = new Date(Date.now() - 86_400_000).toISOString();
const LLEGADA_PASADA = new Date(Date.now() - 86_400_000 + 5 * 3_600_000).toISOString();
const DESDE = '2026-10-01';
const HASTA = '2026-10-31';

const SUCURSAL_XELA: Sucursal = {
  sucursalId: 'sucursal-xela',
  codigo: 'XEL',
  nombre: 'Xela',
  departamento: 'Quetzaltenango',
  municipio: 'Quetzaltenango',
  direccion: '4a calle 12-34, Zona 1',
  telefono: '77777777',
  latitud: 14.8347,
  longitud: -91.5187,
  activa: true,
  version: 1,
};

const SUCURSAL_GUATE: Sucursal = {
  sucursalId: 'sucursal-guate',
  codigo: 'GUA',
  nombre: 'Guatemala',
  departamento: 'Guatemala',
  municipio: 'Guatemala',
  direccion: '6a avenida 1-23, Zona 4',
  telefono: '22222222',
  latitud: 14.6349,
  longitud: -90.5069,
  activa: true,
  version: 1,
};

const SUCURSALES = [SUCURSAL_XELA, SUCURSAL_GUATE];

const RUTA_XELA_GUATE: Ruta = {
  rutaId: 'ruta-1',
  sucursalOrigenId: SUCURSAL_XELA.sucursalId,
  origenNombre: SUCURSAL_XELA.nombre,
  sucursalDestinoId: SUCURSAL_GUATE.sucursalId,
  destinoNombre: SUCURSAL_GUATE.nombre,
  distanciaKm: 205,
  precioBoleto: 125,
  activa: true,
  version: 1,
};

const VIAJE: Viaje = {
  viajeId: 'viaje-1',
  tipo: 'REGULAR',
  rutaId: RUTA_XELA_GUATE.rutaId,
  alquilerId: null,
  sucursalId: SUCURSAL_XELA.sucursalId,
  origenNombre: SUCURSAL_XELA.nombre,
  destinoNombre: SUCURSAL_GUATE.nombre,
  busId: 'bus-1',
  busPlaca: 'P-123ABC',
  busFotoUrl: null,
  choferId: 'chofer-1',
  choferNombre: 'Carlos Méndez',
  capacidad: 40,
  precioBoleto: 125,
  fechaSalidaProgramada: SALIDA,
  fechaLlegadaEstimada: LLEGADA,
  estado: 'PROGRAMADO',
  version: 1,
};

const VIAJE_PASADO: Viaje = {
  ...VIAJE,
  viajeId: 'viaje-2',
  fechaSalidaProgramada: SALIDA_PASADA,
  fechaLlegadaEstimada: LLEGADA_PASADA,
};

const VIAJE_PRIVADO: Viaje = {
  ...VIAJE,
  viajeId: 'viaje-3',
  tipo: 'PRIVADO',
  rutaId: null,
  alquilerId: 'alquiler-1',
};

const VIAJES = [VIAJE, VIAJE_PASADO, VIAJE_PRIVADO];

const MAPA_ASIENTOS: MapaAsientos = {
  viajeId: VIAJE.viajeId,
  origenNombre: VIAJE.origenNombre,
  destinoNombre: VIAJE.destinoNombre,
  fechaSalida: VIAJE.fechaSalidaProgramada,
  busPlaca: VIAJE.busPlaca,
  precioBoleto: 125,
  capacidad: 4,
  disponibles: 3,
  asientos: [
    { numero: 1, estado: 'DISPONIBLE' },
    { numero: 2, estado: 'DISPONIBLE' },
    { numero: 3, estado: 'OCUPADO' },
    { numero: 4, estado: 'DISPONIBLE' },
  ],
};

const PERFIL: Perfil = {
  usuarioId: 'usuario-1',
  correo: CORREO,
  nombres: 'Ana',
  apellidos: 'Pérez',
  nit: NIT,
  dpi: '1234567890101',
  telefono: '55555555',
  direccion: 'Calle Real 1-23, Xela',
  fotoUrl: null,
  roles: ['CLIENTE'],
  sucursalId: null,
  choferId: null,
};

const VENTA_PENDIENTE: VentaPendiente = {
  ventaId: 'venta-1',
  estado: 'PENDIENTE_PAGO',
  montoTotal: 250,
  asientos: [1, 2],
  reservadoHasta: new Date(Date.now() + 600_000).toISOString(),
};

const VENTA_CONFIRMADA: Venta = {
  ventaId: 'venta-1',
  codigo: 'VENTA1',
  viajeId: VIAJE.viajeId,
  canal: 'EN_LINEA',
  clienteNit: NIT,
  clienteNombre: NOMBRE_CLIENTE,
  clienteCorreo: CORREO,
  sucursalId: SUCURSAL_XELA.sucursalId,
  metodoPago: 'CARTERA',
  montoTotal: 250,
  fechaPago: FECHA_PAGO,
  fechaRegistro: SALIDA,
  estado: 'CONFIRMADA',
  motivoRechazo: null,
  motivoCancelacion: null,
  fechaCancelacion: null,
  boletos: [
    { boletoId: 'boleto-1', numeroAsiento: 1, precio: 125, estado: 'EMITIDO' },
    { boletoId: 'boleto-2', numeroAsiento: 2, precio: 125, estado: 'EMITIDO' },
  ],
  viaje: {
    origenNombre: VIAJE.origenNombre,
    destinoNombre: VIAJE.destinoNombre,
    fechaSalida: VIAJE.fechaSalidaProgramada,
    busPlaca: VIAJE.busPlaca,
    precioBoleto: 125,
  },
  version: 1,
};

const VENTA_RECHAZADA: Venta = {
  ...VENTA_CONFIRMADA,
  estado: 'RECHAZADA',
  motivoRechazo: 'SALDO_INSUFICIENTE',
  boletos: [],
};

const VENTA_HISTORIAL_CONFIRMADA: VentaHistorial = {
  ventaId: 'venta-1',
  canal: 'EN_LINEA',
  origenNombre: VIAJE.origenNombre,
  destinoNombre: VIAJE.destinoNombre,
  fechaSalida: VIAJE.fechaSalidaProgramada,
  asientos: [1, 2],
  montoTotal: 250,
  fechaPago: FECHA_PAGO,
  estado: 'CONFIRMADA',
};

const VENTA_HISTORIAL_REEMBOLSADA: VentaHistorial = {
  ventaId: 'venta-2',
  canal: 'PRESENCIAL',
  origenNombre: 'Xela',
  destinoNombre: 'Quetzaltenango',
  fechaSalida: SALIDA_PASADA,
  asientos: [5],
  montoTotal: 60,
  fechaPago: '2026-09-01',
  estado: 'REEMBOLSADA',
};

const HISTORIAL: Historial = {
  nit: NIT,
  nombre: NOMBRE_CLIENTE,
  ventas: [VENTA_HISTORIAL_CONFIRMADA, VENTA_HISTORIAL_REEMBOLSADA],
  alquileres: [],
};

const CARTERA: Cartera = {
  carteraId: 'cartera-1',
  saldo: 1250.5,
  fechaActualizacion: SALIDA,
};

const CARTERA_CON_RECARGA: Cartera = {
  ...CARTERA,
  saldo: 1350.5,
};

const MOVIMIENTO_RECARGA: MovimientoCartera = {
  id: 'mov-4',
  tipo: 'RECARGA',
  monto: 100,
  saldoResultante: 1350.5,
  tipoReferencia: 'MANUAL',
  referenciaId: null,
  fechaMovimiento: FECHA_PAGO,
  fechaRegistro: SALIDA,
};

const MOVIMIENTO_1: MovimientoCartera = {
  id: 'mov-1',
  tipo: 'RECARGA',
  monto: 500,
  saldoResultante: 1250.5,
  tipoReferencia: 'MANUAL',
  referenciaId: null,
  fechaMovimiento: '2026-10-30',
  fechaRegistro: '2026-10-30T10:00:00-06:00',
};

const MOVIMIENTO_2: MovimientoCartera = {
  id: 'mov-2',
  tipo: 'DEBITO',
  monto: 250,
  saldoResultante: 750.5,
  tipoReferencia: 'VENTA',
  referenciaId: 'venta-1',
  fechaMovimiento: '2026-10-29',
  fechaRegistro: '2026-10-29T09:30:00-06:00',
};

const MOVIMIENTO_3: MovimientoCartera = {
  id: 'mov-3',
  tipo: 'REEMBOLSO',
  monto: 125,
  saldoResultante: 1000.5,
  tipoReferencia: 'VENTA',
  referenciaId: 'venta-2',
  fechaMovimiento: '2026-10-28',
  fechaRegistro: '2026-10-28T16:15:00-06:00',
};

const MOVIMIENTOS = [MOVIMIENTO_1, MOVIMIENTO_2, MOVIMIENTO_3];
const MOVIMIENTOS_CON_RECARGA = [MOVIMIENTO_RECARGA, ...MOVIMIENTOS];

/** Coincide con la búsqueda de viajes regulares que hacen las pantallas públicas. */
function peticionDeViajes(): (peticion: HttpRequest<unknown>) => boolean {
  return (peticion) => peticion.url === API_VIAJES && peticion.params.get('tipo') === 'REGULAR';
}

/** Responde los catálogos y la lista de viajes del inicio. */
function responderInicio(http: HttpTestingController, viajes: Viaje[] = VIAJES): void {
  http.expectOne(`${API_SUCURSALES}?activa=true`).flush(SUCURSALES);
  http.expectOne(`${API_RUTAS}?activa=true`).flush([RUTA_XELA_GUATE]);
  http.expectOne(peticionDeViajes()).flush(viajes);
}

/** Responde las sucursales y la búsqueda inicial de la pantalla de compra. */
function responderBusquedaComprar(http: HttpTestingController, viajes: Viaje[] = VIAJES): void {
  http.expectOne(`${API_SUCURSALES}?activa=true`).flush(SUCURSALES);
  http.expectOne(peticionDeViajes()).flush(viajes);
}

/**
 * Responde lo que pide el modal de asientos al abrirse: perfil del comprador, mapa del bus
 * y los catálogos del recorrido. Los catálogos van vacíos para no dibujar el mapa de Leaflet.
 */
function responderModalCompra(http: HttpTestingController, conPerfil = true): void {
  if (conPerfil) http.expectOne(API_PERFIL).flush(PERFIL);
  http.expectOne(`${API_ASIENTOS}/${VIAJE.viajeId}/asientos`).flush(MAPA_ASIENTOS);
  http.expectOne(`${API_RUTAS}?activa=true`).flush([]);
  http.expectOne(`${API_RUTAS}?activa=false`).flush([]);
  http.expectOne(API_SUCURSALES).flush([]);
}

/** Busca un botón visible por su texto (y, si hace falta, por un selector). */
function botonPorTexto(
  fixture: ComponentFixture<unknown>,
  texto: string,
  selector = 'button',
): HTMLButtonElement {
  const botones = Array.from(
    fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLButtonElement>,
  );
  const boton = botones.find((candidato) => (candidato.textContent ?? '').trim().includes(texto));
  if (!boton) throw new Error(`No se encontró el botón "${texto}".`);
  return boton;
}

/** Elige una opción de un select como lo haría el usuario. */
function seleccionar(fixture: ComponentFixture<unknown>, selector: string, valor: string): void {
  const select = fixture.nativeElement.querySelector(selector) as HTMLSelectElement;
  select.value = valor;
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

/** Pulsa los primeros asientos libres del mapa real. */
function elegirAsientos(fixture: ComponentFixture<unknown>, cantidad: number): void {
  const asientos = Array.from(
    fixture.nativeElement.querySelectorAll('app-selector-asientos .asiento') as NodeListOf<HTMLButtonElement>,
  ).filter((asiento) => !asiento.disabled);
  if (asientos.length < cantidad) throw new Error('No hay suficientes asientos libres en el mapa.');
  for (const asiento of asientos.slice(0, cantidad)) asiento.click();
  fixture.detectChanges();
}

/** Pulsa uno de los montos rápidos del modal de recarga. */
function elegirMontoRapido(fixture: ComponentFixture<unknown>, indice: number): void {
  const montos = fixture.nativeElement.querySelectorAll('.rapidos button') as NodeListOf<HTMLButtonElement>;
  montos[indice].click();
  fixture.detectChanges();
}

/** Texto del aviso más reciente, que es el que corresponde a la acción recién terminada. */
function ultimoAviso(avisos: ToastService): string {
  const lista = avisos.avisos();
  return lista.length ? lista[lista.length - 1].texto : '';
}

describe('Integración: compra de boletos y cartera', () => {
  let http: HttpTestingController;
  let router: Router;
  let avisos: ToastService;

  beforeEach(() => {
    configurarIntegracion();
    http = controlador();
    router = espiarNavegacion();
    spyOn(router, 'navigate').and.resolveTo(true);
    avisos = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('inicio público', () => {
    it('muestra los viajes que todavía se pueden comprar', () => {
      // Dado
      const fixture = abrir(InicioComponent);

      // Cuando
      responderInicio(http);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('.viaje').length).toBe(1);
      const tarjeta = fixture.nativeElement.querySelector('.viaje') as HTMLElement;
      expect(tarjeta.textContent).toContain('Xela');
      expect(tarjeta.textContent).toContain('Guatemala');
      expect((fixture.nativeElement.querySelector('.conteo') as HTMLElement).textContent).toContain(
        '1 viaje(s) encontrado(s)',
      );
    });

    it('filtra por destino y por texto desde el buscador', () => {
      // Dado
      const fixture = abrir(InicioComponent);
      responderInicio(http);
      fixture.detectChanges();

      // Cuando
      seleccionar(fixture, '#destino', SUCURSAL_GUATE.sucursalId);
      enviar(fixture);
      http.expectOne(peticionDeViajes()).flush(VIAJES);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('.viaje').length).toBe(1);
      expect((fixture.nativeElement.querySelector('.viaje') as HTMLElement).textContent).toContain(
        'Guatemala',
      );

      // Cuando
      fixture.componentInstance.filtros.texto = TEXTO_SIN_RESULTADOS;
      fixture.detectChanges();
      enviar(fixture);
      http.expectOne(peticionDeViajes()).flush(VIAJES);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('.viaje').length).toBe(0);
      expect((fixture.nativeElement.querySelector('.tarjeta.estado strong') as HTMLElement).textContent).toContain(
        'No hay viajes con esos filtros.',
      );
    });

    it('muestra el mensaje del servidor cuando falla la búsqueda', () => {
      // Dado
      const fixture = abrir(InicioComponent);
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush(SUCURSALES);
      http.expectOne(`${API_RUTAS}?activa=true`).flush([RUTA_XELA_GUATE]);

      // Cuando
      http.expectOne(peticionDeViajes()).flush(
        { codigo: 'SIN_SERVICIO', mensaje: 'El servicio de viajes no está disponible.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('.estado.error') as HTMLElement).textContent).toContain(
        'El servicio de viajes no está disponible.',
      );
      expect(fixture.nativeElement.querySelectorAll('.viaje').length).toBe(0);
    });
  });

  describe('comprar boletos', () => {
    it('lista solo los viajes regulares que aún no han salido', () => {
      // Dado
      const fixture = abrir(ComprarComponent);

      // Cuando
      responderBusquedaComprar(http);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('.viaje').length).toBe(1);
      expect((fixture.nativeElement.querySelector('.viaje') as HTMLElement).textContent).toContain(
        'Xela',
      );
      expect((fixture.nativeElement.querySelector('.conteo') as HTMLElement).textContent).toContain(
        '1 viaje(s) encontrado(s)',
      );
    });

    it('resuelve la ruta del viaje y muestra los datos de su bus', () => {
      // Dado
      guardarSesion();
      const fixture = abrir(ComprarComponent);
      responderBusquedaComprar(http);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, 'Comprar', '.viaje .acciones button').click();
      fixture.detectChanges();
      http.expectOne(API_PERFIL).flush(PERFIL);
      http.expectOne(`${API_ASIENTOS}/${VIAJE.viajeId}/asientos`).flush(MAPA_ASIENTOS);
      http.expectOne(`${API_RUTAS}?activa=true`).flush([RUTA_XELA_GUATE]);
      http.expectOne(`${API_RUTAS}?activa=false`).flush([]);
      http.expectOne(API_SUCURSALES).flush(SUCURSALES);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-mapa-recorrido')).not.toBeNull();
      const ruteo = http.expectOne((peticion) => peticion.url.startsWith('https://router.project-osrm.org'));
      ruteo.flush({
        code: 'Ok',
        routes: [
          {
            distance: 205_000,
            duration: 7_200,
            geometry: {
              coordinates: [
                [SUCURSAL_XELA.longitud, SUCURSAL_XELA.latitud],
                [SUCURSAL_GUATE.longitud, SUCURSAL_GUATE.latitud],
              ],
            },
          },
        ],
      });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.viajeSeleccionado()).toEqual(VIAJE);
      expect(fixture.nativeElement.querySelector('app-mapa-recorrido')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.compra-mapa .leaflet-container')).not.toBeNull();

      // Cuando
      botonPorTexto(fixture, 'El bus', '[role="tab"]').click();
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('.bus-datos') as HTMLElement).textContent)
        .toContain('P-123ABC');
      expect(fixture.nativeElement.querySelector('app-foto-tarjeta')).not.toBeNull();
    });

    it('mantiene el modal abierto y explica si no puede cargar los asientos', () => {
      // Dado
      guardarSesion();
      const fixture = abrir(ComprarComponent);
      responderBusquedaComprar(http);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, 'Comprar', '.viaje .acciones button').click();
      fixture.detectChanges();
      http.expectOne(API_PERFIL).flush(PERFIL);
      http.expectOne(`${API_ASIENTOS}/${VIAJE.viajeId}/asientos`).flush(
        { codigo: 'SIN_SERVICIO', mensaje: 'No se pudieron cargar los asientos.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      http.expectOne(`${API_RUTAS}?activa=true`).flush([]);
      http.expectOne(`${API_RUTAS}?activa=false`).flush([]);
      http.expectOne(API_SUCURSALES).flush([]);
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('.modal') as HTMLElement).textContent)
        .toContain('No se pudieron cargar los asientos.');
      expect(fixture.nativeElement.querySelector('.tabla-vacia')).toBeNull();
      expect(fixture.componentInstance.viajeSeleccionado()).toEqual(VIAJE);
    });

    it('compra dos asientos y confirma el cobro a la cartera', fakeAsync(() => {
      // Dado
      guardarSesion();
      const fixture = abrir(ComprarComponent);
      responderBusquedaComprar(http);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, 'Comprar', '.viaje .acciones button').click();
      fixture.detectChanges();
      responderModalCompra(http);
      fixture.detectChanges();
      elegirAsientos(fixture, 2);

      // Entonces
      expect((fixture.nativeElement.querySelector('.compra-resumen') as HTMLElement).textContent).toContain(
        '1, 2',
      );

      // Cuando
      botonPorTexto(fixture, 'Comprar', '.acciones-modal button').click();
      const reserva = http.expectOne(`${API_VENTAS}/en-linea`);
      expect(reserva.request.method).toBe('POST');
      expect(reserva.request.body).toEqual({
        viajeId: VIAJE.viajeId,
        asientos: [1, 2],
        fechaPago: hoyGt(),
      });
      reserva.flush(VENTA_PENDIENTE, { status: 202, statusText: 'Accepted' });

      tick(2000);
      http.expectOne(`${API_VENTAS}/${VENTA_CONFIRMADA.ventaId}`).flush(VENTA_CONFIRMADA);
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('.aviso-exito') as HTMLElement).textContent).toContain(
        'Compra confirmada',
      );
      expect((fixture.nativeElement.querySelector('.aviso-exito') as HTMLElement).textContent).toContain(
        '2 boleto(s)',
      );
      expect(ultimoAviso(avisos)).toContain('Compra confirmada');
      flush();
    }));

    it('muestra el error cuando el servidor rechaza la reserva', () => {
      // Dado
      guardarSesion();
      const fixture = abrir(ComprarComponent);
      responderBusquedaComprar(http);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, 'Comprar', '.viaje .acciones button').click();
      fixture.detectChanges();
      responderModalCompra(http);
      fixture.detectChanges();
      elegirAsientos(fixture, 1);
      botonPorTexto(fixture, 'Comprar', '.acciones-modal button').click();
      http.expectOne(`${API_VENTAS}/en-linea`).flush(
        { codigo: 'ASIENTO_OCUPADO', mensaje: 'El asiento ya fue vendido.' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('.aviso-error') as HTMLElement).textContent).toContain(
        'El asiento ya fue vendido.',
      );
      expect(ultimoAviso(avisos)).toBe('El asiento ya fue vendido.');
      expect(botonPorTexto(fixture, 'Reintentar', '.acciones-modal button')).toBeTruthy();
    });

    it('explica el rechazo del cobro cuando la cartera no tiene saldo', fakeAsync(() => {
      // Dado
      guardarSesion();
      const fixture = abrir(ComprarComponent);
      responderBusquedaComprar(http);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, 'Comprar', '.viaje .acciones button').click();
      fixture.detectChanges();
      responderModalCompra(http);
      fixture.detectChanges();
      elegirAsientos(fixture, 1);
      botonPorTexto(fixture, 'Comprar', '.acciones-modal button').click();
      http.expectOne(`${API_VENTAS}/en-linea`).flush(VENTA_PENDIENTE, {
        status: 202,
        statusText: 'Accepted',
      });

      tick(2000);
      http.expectOne(`${API_VENTAS}/${VENTA_RECHAZADA.ventaId}`).flush(VENTA_RECHAZADA);
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('.aviso-error') as HTMLElement).textContent).toContain(
        'rechazada',
      );
      expect((fixture.nativeElement.querySelector('.aviso-error') as HTMLElement).textContent).toContain(
        'La billetera digital no tenía saldo suficiente.',
      );
      expect(ultimoAviso(avisos)).toBe('SALDO_INSUFICIENTE');
      flush();
    }));

    it('invita a entrar cuando el visitante quiere comprar', () => {
      // Dado
      const fixture = abrir(ComprarComponent);
      responderBusquedaComprar(http);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, 'Comprar', '.viaje .acciones button').click();
      fixture.detectChanges();
      responderModalCompra(http, false);
      fixture.detectChanges();
      botonPorTexto(fixture, 'Entrar para comprar', '.acciones-modal button').click();

      // Entonces
      const llamada = (router.navigate as jasmine.Spy).calls.mostRecent();
      expect(llamada.args[0]).toEqual(['/login']);
      expect(llamada.args[1].queryParams.volver).toContain(`abrirViaje=${VIAJE.viajeId}`);
      expect(ultimoAviso(avisos)).toBe('Entra a tu cuenta para pagar tus boletos.');
    });
  });

  describe('mis compras', () => {
    it('lista los boletos del cliente con su estado', () => {
      // Dado
      const fixture = abrir(MisComprasComponent);

      // Cuando
      http.expectOne(API_HISTORIAL).flush(HISTORIAL);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
      const tabla = fixture.nativeElement.querySelector('tbody') as HTMLElement;
      expect(tabla.textContent).toContain('Xela → Guatemala');
      expect(tabla.textContent).toContain('Confirmada');
      expect(tabla.textContent).toContain('Reembolsada');
      expect((fixture.nativeElement.querySelector('.filtros') as HTMLElement).textContent).toContain(NIT);
    });

    it('filtra los boletos por viaje desde el selector', () => {
      // Dado
      const fixture = abrir(MisComprasComponent);
      http.expectOne(API_HISTORIAL).flush(HISTORIAL);
      fixture.detectChanges();

      // Cuando
      const opciones = fixture.nativeElement.querySelectorAll('#mc-viaje option') as NodeListOf<HTMLOptionElement>;
      seleccionar(fixture, '#mc-viaje', opciones[1].value);

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
      expect((fixture.nativeElement.querySelector('tbody') as HTMLElement).textContent).toContain(
        'Guatemala',
      );
      expect((fixture.nativeElement.querySelector('tbody') as HTMLElement).textContent).not.toContain(
        'Quetzaltenango',
      );
    });

    it('abre el ticket y muestra el asiento dentro del bus', () => {
      // Dado
      const fixture = abrir(MisComprasComponent);
      http.expectOne(API_HISTORIAL).flush(HISTORIAL);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, 'Ver', 'tbody button').click();
      http.expectOne(`${API_VENTAS}/${VENTA_CONFIRMADA.ventaId}`).flush(VENTA_CONFIRMADA);
      http.expectOne(`${API_ASIENTOS}/${VIAJE.viajeId}/asientos`).flush(MAPA_ASIENTOS);
      http.expectOne(`${API_VIAJES}/${VIAJE.viajeId}`).flush(VIAJE);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelector('app-modal .modal')).not.toBeNull();
      expect((fixture.nativeElement.querySelector('.ticket-ruta') as HTMLElement).textContent).toContain(
        'Xela → Guatemala',
      );

      // Cuando
      botonPorTexto(fixture, 'Tu asiento en el bus', '.pestanas button').click();
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelector('.asientos-con-bus')).not.toBeNull();
      expect((fixture.nativeElement.querySelector('.modal-cuerpo') as HTMLElement).textContent).toContain(
        'Tus asientos: 1, 2',
      );
    });

    it('avisa cuando no se puede cargar el historial', () => {
      // Dado
      const fixture = abrir(MisComprasComponent);

      // Cuando
      http.expectOne(API_HISTORIAL).flush(
        { codigo: 'ERROR', mensaje: 'No se pudo cargar tu historial.' },
        { status: 500, statusText: 'Server Error' },
      );
      fixture.detectChanges();

      // Entonces
      expect(ultimoAviso(avisos)).toBe('No se pudo cargar tu historial.');
      expect((fixture.nativeElement.querySelector('.tabla-vacia') as HTMLElement).textContent).toContain(
        'Aún no tienes boletos.',
      );
    });
  });

  describe('cartera', () => {
    it('muestra el saldo, los totales y los movimientos', () => {
      // Dado
      const fixture = abrir(CarteraComponent);

      // Cuando
      http.expectOne(API_CARTERA).flush(CARTERA);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API_CARTERA}/movimientos` && peticion.params.get('size') === '2000',
        )
        .flush(MOVIMIENTOS);
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('.saldo strong') as HTMLElement).textContent).toContain(
        '1,250.50',
      );
      const totales = Array.from(
        fixture.nativeElement.querySelectorAll('.dato strong') as NodeListOf<HTMLElement>,
      ).map((total) => (total.textContent ?? '').trim());
      expect(totales.length).toBe(3);
      expect(totales[0]).toContain('500.00');
      expect(totales[1]).toContain('250.00');
      expect(totales[2]).toContain('125.00');
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
      const tabla = fixture.nativeElement.querySelector('tbody') as HTMLElement;
      expect(tabla.textContent).toContain('Recarga de saldo');
      expect(tabla.textContent).toContain('Pago de boletos');
      expect(tabla.textContent).toContain('Reembolso de boletos');
      expect(tabla.textContent).toContain('−');
    });

    it('filtra por tipo y consulta el rango de fechas', () => {
      // Dado
      const fixture = abrir(CarteraComponent);
      http.expectOne(API_CARTERA).flush(CARTERA);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API_CARTERA}/movimientos` && peticion.params.get('size') === '2000',
        )
        .flush(MOVIMIENTOS);
      fixture.detectChanges();

      // Cuando
      seleccionar(fixture, '#tipo', 'DEBITO');

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
      expect((fixture.nativeElement.querySelector('tbody') as HTMLElement).textContent).toContain(
        'Pago de boletos',
      );

      // Cuando
      escribir(fixture, '#desde', DESDE);
      escribir(fixture, '#hasta', HASTA);
      botonPorTexto(fixture, 'Consultar', '.filtros button').click();
      http.expectOne(API_CARTERA).flush(CARTERA);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API_CARTERA}/movimientos` &&
            peticion.params.get('desde') === DESDE &&
            peticion.params.get('hasta') === HASTA &&
            peticion.params.get('size') === '2000',
        )
        .flush(MOVIMIENTOS);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    });

    it('recarga saldo desde la cartera y refresca el saldo', () => {
      // Dado
      const fixture = abrir(CarteraComponent);
      http.expectOne(API_CARTERA).flush(CARTERA);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API_CARTERA}/movimientos` && peticion.params.get('size') === '2000',
        )
        .flush(MOVIMIENTOS);
      fixture.detectChanges();

      // Cuando
      botonPorTexto(fixture, '+ Recargar saldo').click();
      fixture.detectChanges();
      elegirMontoRapido(fixture, 1);
      enviar(fixture);

      const recarga = http.expectOne(`${API_CARTERA}/recargas`);
      expect(recarga.request.method).toBe('POST');
      expect(recarga.request.body).toEqual({ monto: 100, fechaMovimiento: hoyGt() });
      recarga.flush(MOVIMIENTO_RECARGA);

      http.expectOne(API_CARTERA).flush(CARTERA_CON_RECARGA);
      http
        .expectOne(
          (peticion) =>
            peticion.url === `${API_CARTERA}/movimientos` && peticion.params.get('size') === '2000',
        )
        .flush(MOVIMIENTOS_CON_RECARGA);
      fixture.detectChanges();

      // Entonces
      expect(fixture.nativeElement.querySelector('app-recarga .modal')).toBeNull();
      expect((fixture.nativeElement.querySelector('.saldo strong') as HTMLElement).textContent).toContain(
        '1,350.50',
      );
      expect(ultimoAviso(avisos)).toBe('Recarga realizada. Tu saldo ahora es Q1350.50.');
    });
  });

  describe('recarga de saldo', () => {
    it('recarga un monto rápido y confirma el saldo nuevo', () => {
      // Dado
      const fixture = abrir(RecargaComponent);
      fixture.componentRef.setInput('abierto', true);
      fixture.detectChanges();

      // Cuando
      elegirMontoRapido(fixture, 2);
      enviar(fixture);

      const recarga = http.expectOne(`${API_CARTERA}/recargas`);
      expect(recarga.request.body).toEqual({ monto: 200, fechaMovimiento: hoyGt() });
      recarga.flush(MOVIMIENTO_RECARGA);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.form.controls.monto.value).toBe(200);
      expect(ultimoAviso(avisos)).toBe('Recarga realizada. Tu saldo ahora es Q1350.50.');
    });

    it('no envía la recarga sin monto y marca el campo', () => {
      // Dado
      const fixture = abrir(RecargaComponent);
      fixture.componentRef.setInput('abierto', true);
      fixture.detectChanges();

      // Cuando
      enviar(fixture);

      // Entonces
      http.expectNone(`${API_CARTERA}/recargas`);
      expect(fixture.componentInstance.form.controls.monto.touched).toBeTrue();
      expect((fixture.nativeElement.querySelector('.error') as HTMLElement).textContent).toContain(
        'Escribe un monto mayor que cero.',
      );
    });

    it('muestra el mensaje del backend cuando la recarga falla', () => {
      // Dado
      const fixture = abrir(RecargaComponent);
      fixture.componentRef.setInput('abierto', true);
      fixture.detectChanges();

      // Cuando
      elegirMontoRapido(fixture, 0);
      enviar(fixture);
      http.expectOne(`${API_CARTERA}/recargas`).flush(
        { codigo: 'RECARGA_RECHAZADA', mensaje: 'No se pudo procesar la recarga.' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      // Entonces
      expect(ultimoAviso(avisos)).toBe('No se pudo procesar la recarga.');
      expect(fixture.componentInstance.enviando()).toBeFalse();
    });
  });
});
