import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { UsuarioSesion } from '../app/core/models/auth.model';
import { Bus } from '../app/core/models/bus.model';
import { Chofer } from '../app/core/models/chofer.model';
import { Sucursal } from '../app/core/models/sucursal.model';
import { Perfil, UsuarioDetalle } from '../app/core/models/usuario.model';
import { OrdenAlquiler, TarifaReembolso } from '../app/core/models/venta.model';
import { Alquiler, ConfigAlquiler, Viaje, ViajeDetalle } from '../app/core/models/viaje.model';
import { MisAlquileresComponent } from '../app/paginas/alquileres/mis-alquileres/mis-alquileres.component';
import { PrecioAlquilerComponent } from '../app/paginas/alquileres/precio-alquiler/precio-alquiler.component';
import { SolicitarAlquilerComponent } from '../app/paginas/alquileres/solicitar-alquiler/solicitar-alquiler.component';
import { AlquileresComponent } from '../app/paginas/viajes/alquileres/alquileres.component';
import { SelectorRecorridoComponent } from '../app/shared/components/selector-recorrido/selector-recorrido.component';
import { ToastService } from '../app/shared/services/toast.service';
import {
  API,
  API_IDENTITY,
  CORREO,
  SUCURSAL_ID,
  TOKEN,
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
 * Pruebas de integración de alquileres: pantallas reales con sus servicios reales y HTTP simulado.
 * Convención: Dado / Cuando / Entonces (flujo completo, sin AAA).
 */

const API_ALQUILERES = `${API}/trips/alquileres`;
const API_CONFIG = `${API}/trips/configuracion-alquiler`;
const API_ORDENES = `${API}/sales/ordenes-alquiler`;
const API_TARIFAS = `${API}/sales/tarifas-reembolso`;
const API_SUCURSALES = `${API}/fleet/sucursales`;
const API_BUSES = `${API}/fleet/buses`;
const API_CHOFERES = `${API}/fleet/choferes`;
const API_PERFIL = `${API_IDENTITY}/perfil`;
const API_USUARIOS = `${API_IDENTITY}/usuarios`;
const API_MIOS = `${API_ALQUILERES}/mios`;
const API_MIAS = `${API_ORDENES}/mias`;

const URL_RUTEO = 'https://router.project-osrm.org';
const ORIGEN = 'Xela';
const DESTINO = 'Quetzaltenango';
const COORDENADAS_ORIGEN = { latitud: 14.8347, longitud: -91.5186 };
const COORDENADAS_DESTINO = { latitud: 14.6349, longitud: -90.5069 };
const KILOMETROS = 120;
const SALIDA_LOCAL = '2026-11-05T08:00';
const SALIDA = '2026-11-05T08:00:00-06:00';
const RETORNO_LOCAL = '2026-11-06T18:00';
const RETORNO = '2026-11-06T18:00:00-06:00';
const LLEGADA_LOCAL = '2026-11-05T12:00';
const LLEGADA = '2026-11-05T12:00:00-06:00';
const FECHA_CANCELACION_LOCAL = '2026-11-03T10:00';
const FECHA_CANCELACION = '2026-11-03T10:00:00-06:00';
const MOTIVO_CANCELACION = 'Cambio de planes del grupo';
const PASAJEROS = 40;
const PRECIO_POR_KM = 18;
const FECHA_PRECIO = '2021-01-01';

const ADMIN_SUCURSAL: UsuarioSesion = {
  ...USUARIO,
  usuarioId: 'admin-sucursal',
  correo: 'admin.sucursal@pruebas.gt',
  nombre: 'Admin Sucursal',
  roles: ['ADMIN_SUCURSAL'],
  sucursalId: SUCURSAL_ID,
};

const ADMIN_SISTEMA: UsuarioSesion = {
  ...USUARIO,
  usuarioId: 'admin-sistema',
  correo: 'admin.sistema@pruebas.gt',
  nombre: 'Admin Sistema',
  roles: ['ADMIN_SISTEMA'],
  sucursalId: null,
};

const SUCURSAL: Sucursal = {
  sucursalId: SUCURSAL_ID,
  codigo: 'XLA',
  nombre: 'Xela',
  departamento: 'Quetzaltenango',
  municipio: 'Quetzaltenango',
  direccion: 'Zona 3, Quetzaltenango',
  telefono: '77777777',
  latitud: COORDENADAS_ORIGEN.latitud,
  longitud: COORDENADAS_ORIGEN.longitud,
  activa: true,
  version: 1,
};

const PERFIL: Perfil = {
  usuarioId: USUARIO.usuarioId,
  correo: CORREO,
  nombres: 'Ana',
  apellidos: 'Pérez',
  nit: '1234567-8',
  dpi: '1234567890101',
  telefono: '55555555',
  direccion: 'Calle Real 1-23, Xela',
  fotoUrl: null,
  roles: ['CLIENTE'],
  sucursalId: null,
  choferId: null,
};

const TARIFA_48_HORAS: TarifaReembolso = {
  tarifaId: 'tarifa-48',
  estadoAlquiler: 'PAGADO',
  horasMinimasAntes: 48,
  permiteCancelacion: true,
  porcentajeReembolso: 50,
  justificacion: 'Con 48 horas o más de anticipación se devuelve el 50 %.',
  activa: true,
  version: 1,
};

const TARIFA_ULTIMA_HORA: TarifaReembolso = {
  tarifaId: 'tarifa-0',
  estadoAlquiler: 'PAGADO',
  horasMinimasAntes: 0,
  permiteCancelacion: false,
  porcentajeReembolso: 0,
  justificacion: 'A última hora ya no se puede cancelar.',
  activa: true,
  version: 1,
};

const TARIFA_SOLICITADA: TarifaReembolso = {
  tarifaId: 'tarifa-solicitada',
  estadoAlquiler: 'SOLICITADO',
  horasMinimasAntes: 24,
  permiteCancelacion: true,
  porcentajeReembolso: 100,
  justificacion: 'Sin pago no hay retención.',
  activa: true,
  version: 1,
};

const VIAJE: Viaje = {
  viajeId: 'viaje-1',
  tipo: 'PRIVADO',
  rutaId: null,
  alquilerId: 'alquiler-asignado',
  sucursalId: SUCURSAL_ID,
  origenNombre: ORIGEN,
  destinoNombre: DESTINO,
  busId: 'bus-1',
  busPlaca: 'XLA-123',
  choferId: 'chofer-1',
  choferNombre: 'Carlos Ruiz',
  capacidad: 45,
  precioBoleto: null,
  fechaSalidaProgramada: SALIDA,
  fechaLlegadaEstimada: LLEGADA,
  estado: 'PROGRAMADO',
  version: 1,
};

function crearAlquiler(cambios: Partial<Alquiler> = {}): Alquiler {
  return {
    alquilerId: 'alquiler-1',
    sucursalId: SUCURSAL_ID,
    canal: 'EN_LINEA',
    clienteUsuarioId: USUARIO.usuarioId,
    clienteNit: '1234567-8',
    clienteNombre: USUARIO.nombre,
    clienteCorreo: CORREO,
    origen: ORIGEN,
    destino: DESTINO,
    origenLatitud: COORDENADAS_ORIGEN.latitud,
    origenLongitud: COORDENADAS_ORIGEN.longitud,
    destinoLatitud: COORDENADAS_DESTINO.latitud,
    destinoLongitud: COORDENADAS_DESTINO.longitud,
    fechaSalida: SALIDA,
    fechaRetorno: RETORNO,
    cantidadPasajeros: PASAJEROS,
    kmEstimados: KILOMETROS,
    precioEstimado: 1200,
    precioConfirmado: null,
    confirmadoPor: null,
    estado: 'SOLICITADO',
    motivoCancelacion: null,
    fechaHoraCancelacion: null,
    fechaSolicitud: '2026-10-31',
    viajeId: null,
    viaje: null,
    version: 1,
    ...cambios,
  };
}

const ALQUILER_SOLICITADO = crearAlquiler();

const ALQUILER_PAGADO = crearAlquiler({
  alquilerId: 'alquiler-pagado',
  estado: 'PAGADO',
  precioConfirmado: 1000,
  version: 2,
});

const ALQUILER_ASIGNADO = crearAlquiler({
  alquilerId: 'alquiler-asignado',
  estado: 'ASIGNADO',
  precioConfirmado: 1000,
  viajeId: VIAJE.viajeId,
  viaje: VIAJE,
  version: 3,
});

const ALQUILER_CANCELADO = crearAlquiler({
  alquilerId: 'alquiler-pagado',
  estado: 'CANCELADO',
  precioConfirmado: 1000,
  motivoCancelacion: MOTIVO_CANCELACION,
  fechaHoraCancelacion: FECHA_CANCELACION,
  version: 3,
});

const ALQUILER_CREADO = crearAlquiler({
  alquilerId: 'alquiler-creado',
  estado: 'SOLICITADO',
  precioEstimado: 1200,
});

const ORDEN_PENDIENTE: OrdenAlquiler = {
  ordenId: 'orden-1',
  alquilerId: ALQUILER_PAGADO.alquilerId,
  sucursalId: SUCURSAL_ID,
  clienteNit: '1234567-8',
  clienteNombre: USUARIO.nombre,
  clienteCorreo: CORREO,
  origen: ORIGEN,
  destino: DESTINO,
  monto: 1000,
  metodoPago: 'CARTERA',
  fechaPago: null,
  estado: 'PENDIENTE_PAGO',
  motivoRechazo: null,
  version: 1,
};

const ORDEN_REEMBOLSADA: OrdenAlquiler = {
  ...ORDEN_PENDIENTE,
  estado: 'REEMBOLSADA',
  fechaPago: '2026-11-02',
  fechaCancelacion: FECHA_CANCELACION,
  horasAntesViaje: 48,
  porcentajeReembolso: 50,
  justificacionReembolso: 'Con 48 horas o más de anticipación se devuelve el 50 %.',
  montoReembolsado: 500,
  fechaReembolso: '2026-11-03',
  version: 2,
};

const BUS: Bus = {
  busId: 'bus-1',
  sucursalId: SUCURSAL_ID,
  placa: 'XLA-123',
  marca: 'Volvo',
  modelo: '9800',
  anioFabricacion: 2020,
  capacidadPasajeros: 45,
  estado: 'ACTIVO',
  kilometrajeActual: 120000,
  fotoUrl: 'https://fotos.pruebas/bus.png',
  version: 1,
};

const CHOFER: Chofer = {
  choferId: 'chofer-1',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-chofer',
  nombreCompleto: 'Carlos Ruiz',
  numeroLicencia: 'L-123456',
  tipoLicencia: 'A',
  fechaVencimientoLicencia: '2027-01-01',
  salarioBaseViaje: 250,
  estado: 'ACTIVO',
  version: 1,
};

const USUARIO_DETALLE: UsuarioDetalle = {
  ...PERFIL,
  usuarioId: CHOFER.usuarioId,
  correo: 'carlos.ruiz@pruebas.gt',
  nombres: 'Carlos',
  apellidos: 'Ruiz',
  fotoUrl: 'https://fotos.pruebas/chofer.png',
  estado: 'ACTIVO',
  ultimoAcceso: null,
};

const VIAJE_ASIGNADO: ViajeDetalle = {
  ...VIAJE,
  alquilerId: ALQUILER_PAGADO.alquilerId,
  salida: null,
  llegada: null,
};

const PRECIO_ACTUAL: ConfigAlquiler = {
  configuracionId: 'config-1',
  precioPorKm: 12.5,
  vigenteDesde: '2020-01-01',
  creadoPor: ADMIN_SISTEMA.usuarioId,
};

const PRECIO_PROGRAMADO: ConfigAlquiler = {
  configuracionId: 'config-2',
  precioPorKm: 15,
  vigenteDesde: '2099-01-01',
  creadoPor: ADMIN_SISTEMA.usuarioId,
};

const PRECIO_NUEVO: ConfigAlquiler = {
  configuracionId: 'config-3',
  precioPorKm: PRECIO_POR_KM,
  vigenteDesde: FECHA_PRECIO,
  creadoPor: ADMIN_SISTEMA.usuarioId,
};

const RUTA_OSRM = {
  code: 'Ok',
  routes: [
    {
      distance: KILOMETROS * 1000,
      duration: 7200,
      geometry: {
        coordinates: [
          [COORDENADAS_ORIGEN.longitud, COORDENADAS_ORIGEN.latitud],
          [COORDENADAS_DESTINO.longitud, COORDENADAS_DESTINO.latitud],
        ],
      },
    },
  ],
};

/** Pulsa el primer botón cuyo texto contenga el indicado. */
function pulsar(fixture: ComponentFixture<unknown>, texto: string): void {
  const botones = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  const boton = botones.find((b) => (b.textContent ?? '').trim().includes(texto));
  if (!boton) throw new Error(`No se encontró el botón "${texto}".`);
  boton.click();
  fixture.detectChanges();
}

/** Elige una opción de un select y avisa al formulario, como haría el usuario. */
function elegir(fixture: ComponentFixture<unknown>, selector: string, valor: string): void {
  const select = fixture.nativeElement.querySelector(selector) as HTMLSelectElement;
  select.value = valor;
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

/** Marca el recorrido usando las salidas reales del selector de mapa. */
function marcarRecorrido(fixture: ComponentFixture<SolicitarAlquilerComponent>): void {
  const selector = fixture.debugElement.query(By.directive(SelectorRecorridoComponent))
    .componentInstance as SelectorRecorridoComponent;
  selector.nombreOrigen.emit(ORIGEN);
  selector.origenCambio.emit(COORDENADAS_ORIGEN);
  selector.nombreDestino.emit(DESTINO);
  selector.destinoCambio.emit(COORDENADAS_DESTINO);
  selector.distanciaKm.emit(KILOMETROS);
  fixture.detectChanges();
}

/**
 * El mapa de solo lectura pide la ruta real por carretera. Aquí se responde con una ruta
 * equivalente al recorrido de prueba para que no quede ninguna petición abierta.
 */
function resolverRutas(controladorHttp: HttpTestingController): void {
  const peticiones = controladorHttp.match((peticion) => peticion.url.startsWith(URL_RUTEO));
  for (const peticion of peticiones) peticion.flush(RUTA_OSRM);
}

describe('Integración: alquileres de buses', () => {
  let http: HttpTestingController;
  let router: Router;
  let avisos: ToastService;

  beforeEach(() => {
    configurarIntegracion();
    http = controlador();
    router = espiarNavegacion();
    avisos = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('solicitar alquiler', () => {
    function abrirSolicitud(): ComponentFixture<SolicitarAlquilerComponent> {
      guardarSesion();
      const fixture = abrir(SolicitarAlquilerComponent);
      const sucursales = http.expectOne((peticion) => peticion.url === API_SUCURSALES);
      expect(sucursales.request.params.get('activa')).toBe('true');
      sucursales.flush([SUCURSAL]);
      http.expectOne(API_TARIFAS).flush([TARIFA_48_HORAS, TARIFA_ULTIMA_HORA, TARIFA_SOLICITADA]);
      http.expectOne(API_PERFIL).flush(PERFIL);
      fixture.detectChanges();
      return fixture;
    }

    function pasarAlPasoDos(fixture: ComponentFixture<SolicitarAlquilerComponent>): void {
      pulsar(fixture, 'Siguiente');
      resolverRutas(http);
      escribir(fixture, '#salida', SALIDA_LOCAL);
      escribir(fixture, '#retorno', RETORNO_LOCAL);
      escribir(fixture, '#pasajeros', String(PASAJEROS));
      elegir(fixture, '#sucursal', SUCURSAL_ID);
    }

    it('registra la solicitud con fechas, pasajeros y kilómetros', () => {
      // Dado
      const fixture = abrirSolicitud();
      marcarRecorrido(fixture);

      // Cuando
      pulsar(fixture, 'Siguiente');
      resolverRutas(http);

      // Entonces
      expect(fixture.componentInstance.paso()).toBe(2);
      expect((fixture.nativeElement.querySelector('.politica-aviso') as HTMLElement).textContent)
        .toContain('Con 2 días o más de anticipación');

      // Cuando
      escribir(fixture, '#salida', SALIDA_LOCAL);
      escribir(fixture, '#retorno', RETORNO_LOCAL);
      escribir(fixture, '#pasajeros', String(PASAJEROS));
      elegir(fixture, '#sucursal', SUCURSAL_ID);
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne((solicitud) => solicitud.url === API_ALQUILERES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(
        jasmine.objectContaining({
          sucursalId: SUCURSAL_ID,
          clienteNit: '1234567-8',
          clienteNombre: USUARIO.nombre,
          clienteCorreo: CORREO,
          origen: ORIGEN,
          destino: DESTINO,
          origenLatitud: COORDENADAS_ORIGEN.latitud,
          origenLongitud: COORDENADAS_ORIGEN.longitud,
          destinoLatitud: COORDENADAS_DESTINO.latitud,
          destinoLongitud: COORDENADAS_DESTINO.longitud,
          fechaSalida: SALIDA,
          fechaRetorno: RETORNO,
          cantidadPasajeros: PASAJEROS,
          kmEstimados: KILOMETROS,
        }),
      );
      peticion.flush(ALQUILER_CREADO);
      fixture.detectChanges();
      resolverRutas(http);

      expect(fixture.componentInstance.creado()).toEqual(ALQUILER_CREADO);
      expect(avisos.avisos().some((a) => a.texto === 'Solicitud de alquiler enviada.')).toBeTrue();
      expect(localStorage.getItem('token')).toBe(TOKEN);
      expect(router.navigateByUrl).not.toHaveBeenCalled();

      const resumen = fixture.nativeElement.querySelector('.resumen-solicitud') as HTMLElement;
      expect(resumen.textContent).toContain('Xela → Quetzaltenango');
      expect(resumen.textContent).toContain('Precio por km');
      expect(resumen.textContent).toContain('Mis alquileres');
    });

    it('no envía la solicitud si el retorno es anterior a la salida', () => {
      // Dado
      const fixture = abrirSolicitud();
      marcarRecorrido(fixture);
      pulsar(fixture, 'Siguiente');
      resolverRutas(http);

      // Cuando
      escribir(fixture, '#salida', '2026-11-06T08:00');
      escribir(fixture, '#retorno', '2026-11-05T08:00');
      escribir(fixture, '#pasajeros', String(PASAJEROS));
      elegir(fixture, '#sucursal', SUCURSAL_ID);
      enviar(fixture);

      // Entonces
      http.expectNone((solicitud) => solicitud.url === API_ALQUILERES);
      expect(fixture.componentInstance.form.controls.fechaRetorno.errors?.['retornoInvalido']).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('El retorno no puede ser antes de la salida.');
    });

    it('muestra el mensaje del backend cuando no hay precio vigente', () => {
      // Dado
      const fixture = abrirSolicitud();
      marcarRecorrido(fixture);
      pasarAlPasoDos(fixture);

      // Cuando
      enviar(fixture);
      http.expectOne((solicitud) => solicitud.url === API_ALQUILERES).flush(
        { codigo: 'PRECIO_NO_VIGENTE', mensaje: 'No hay un precio de alquiler vigente para esa fecha.' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.creado()).toBeNull();
      expect(fixture.componentInstance.enviando()).toBeFalse();
      expect(
        avisos.avisos().some((a) => a.texto === 'No hay un precio de alquiler vigente para esa fecha.'),
      ).toBeTrue();
    });

    it('busca ubicaciones, marca el recorrido y conserva la línea recta si falla OSRM', () => {
      // Dado
      const fixture = abrirSolicitud();
      const selector = fixture.debugElement.query(By.directive(SelectorRecorridoComponent))
        .componentInstance as SelectorRecorridoComponent;

      // Cuando
      escribir(fixture, '.selector-recorrido input', 'Parque Central');
      pulsar(fixture, 'Buscar');
      const busqueda = http.expectOne((peticion) => peticion.url === 'https://photon.komoot.io/api');
      expect(busqueda.request.params.get('q')).toBe('Parque Central');
      busqueda.flush({
        features: [
          {
            geometry: { coordinates: [COORDENADAS_ORIGEN.longitud, COORDENADAS_ORIGEN.latitud] },
            properties: { name: 'Parque Central', city: 'Xela' },
          },
          {
            geometry: {
              coordinates: [COORDENADAS_ORIGEN.longitud + 0.001, COORDENADAS_ORIGEN.latitud + 0.001],
            },
            properties: { street: 'Calle Real', county: 'Quetzaltenango' },
          },
          {
            geometry: {
              coordinates: [COORDENADAS_ORIGEN.longitud + 0.002, COORDENADAS_ORIGEN.latitud + 0.002],
            },
            properties: { housenumber: '12', state: 'Guatemala' },
          },
          {
            geometry: {
              coordinates: [COORDENADAS_ORIGEN.longitud + 0.003, COORDENADAS_ORIGEN.latitud + 0.003],
            },
            properties: {},
          },
        ],
      });
      fixture.detectChanges();

      // Entonces
      expect(selector.resultados().map((lugar) => lugar.nombre)).toEqual([
        'Parque Central, Xela',
        'Calle Real, Quetzaltenango',
        '#12, Guatemala',
        'Lugar sin nombre',
      ]);

      // Cuando
      pulsar(fixture, 'Parque Central');
      expect(fixture.componentInstance.form.controls.origen.value).toBe('Parque Central, Xela');
      fixture.detectChanges();

      escribir(fixture, '.selector-recorrido input', 'Terminal');
      pulsar(fixture, 'Buscar');
      http
        .expectOne((peticion) => peticion.url === 'https://photon.komoot.io/api')
        .flush({
          features: [
            {
              geometry: { coordinates: [COORDENADAS_DESTINO.longitud, COORDENADAS_DESTINO.latitud] },
              properties: { name: 'Terminal', city: 'Guatemala' },
            },
          ],
        });
      fixture.detectChanges();

      // Cuando
      pulsar(fixture, 'Terminal');
      const ruteo = http.expectOne((peticion) => peticion.url.startsWith(URL_RUTEO));
      ruteo.flush({ code: 'NoRoute', routes: [] });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.listoParaSeguir()).toBeTrue();
      expect(fixture.componentInstance.form.controls.origen.value).toBe('Parque Central, Xela');
      expect(fixture.componentInstance.form.controls.destino.value).toBe('Terminal, Guatemala');
      expect(selector.porCarretera()).toBeFalse();
      expect(selector.distancia()).toBeGreaterThan(0);
      expect(selector.calculando()).toBeFalse();

      // Cuando
      escribir(fixture, '.selector-recorrido input', 'Lugar fallido');
      pulsar(fixture, 'Buscar');
      http.expectOne((peticion) => peticion.url === 'https://photon.komoot.io/api').flush(
        {},
        { status: 503, statusText: 'Service Unavailable' },
      );
      fixture.detectChanges();

      // Entonces
      expect(selector.buscando()).toBeFalse();
      expect(selector.resultados()).toEqual([]);

      // Cuando
      pulsar(fixture, 'Limpiar');

      // Entonces
      expect(fixture.componentInstance.listoParaSeguir()).toBeFalse();
      expect(fixture.componentInstance.form.controls.kmEstimados.value).toBeNull();

      // Cuando
      const mapa = fixture.nativeElement.querySelector('.selector-recorrido .mapa') as HTMLElement;
      mapa.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
      fixture.detectChanges();
      const reversaOrigen = http.expectOne((peticion) => peticion.url === 'https://photon.komoot.io/reverse');
      reversaOrigen.flush({
        features: [
          {
            geometry: { coordinates: [] },
            properties: { street: 'Avenida Central', city: 'Xela' },
          },
        ],
      });
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.origenMapa()).not.toBeNull();
      expect(fixture.componentInstance.form.controls.origen.value).toBe('Avenida Central, Xela');

      // Cuando
      mapa.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 20, clientY: 20 }));
      fixture.detectChanges();
      const reversaDestino = http.expectOne((peticion) => peticion.url === 'https://photon.komoot.io/reverse');
      reversaDestino.flush({
        features: [
          {
            geometry: { coordinates: [] },
            properties: { name: 'Plaza', county: 'Guatemala' },
          },
        ],
      });
      const rutaPorCarretera = http.expectOne((peticion) => peticion.url.startsWith(URL_RUTEO));
      rutaPorCarretera.flush(RUTA_OSRM);
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.destinoMapa()).not.toBeNull();
      expect(fixture.componentInstance.form.controls.destino.value).toBe('Plaza, Guatemala');
      expect(selector.porCarretera()).toBeTrue();

      // Cuando
      selector.texto.set('ab');
      selector.buscar();

      // Entonces
      http.expectNone((peticion) => peticion.url === 'https://photon.komoot.io/api');
    });
  });

  describe('mis alquileres', () => {
    function abrirMisAlquileres(
      alquileres: Alquiler[],
      ordenes: OrdenAlquiler[] = [],
    ): ComponentFixture<MisAlquileresComponent> {
      guardarSesion();
      const fixture = abrir(MisAlquileresComponent);
      http.expectOne(API_SUCURSALES).flush([SUCURSAL]);
      http.expectOne(API_MIAS).flush(ordenes);
      http.expectOne(API_MIOS).flush(alquileres);
      fixture.detectChanges();
      return fixture;
    }

    it('lista las solicitudes y filtra por estado', () => {
      // Dado
      const fixture = abrirMisAlquileres([ALQUILER_SOLICITADO, ALQUILER_PAGADO]);

      // Entonces
      const tarjetas = fixture.nativeElement.querySelectorAll('.rejilla-alquileres .tarjeta');
      expect(tarjetas.length).toBe(2);
      expect(tarjetas[0].textContent).toContain('Xela → Quetzaltenango');
      expect(tarjetas[0].textContent).toContain('Solicitado');
      expect(tarjetas[1].textContent).toContain('Pagado');

      // Cuando
      pulsar(fixture, 'Cotizados');

      // Entonces
      expect((fixture.nativeElement.querySelector('.tabla-vacia') as HTMLElement).textContent)
        .toContain('No tienes alquileres en ese estado');
    });

    it('explica los estados del alquiler y de sus órdenes de pago', () => {
      // Dado
      const alquilerCotizado = crearAlquiler({
        alquilerId: 'alquiler-cotizado',
        estado: 'COTIZADO',
        precioConfirmado: 1200,
      });
      const alquilerCompletado = crearAlquiler({
        alquilerId: 'alquiler-completado',
        estado: 'COMPLETADO',
      });
      const alquilerCanceladoSinPago = crearAlquiler({
        alquilerId: 'alquiler-cancelado-sin-pago',
        estado: 'CANCELADO',
      });
      const alquilerCancelado = {
        ...ALQUILER_CANCELADO,
        alquilerId: 'alquiler-cancelado-con-reembolso',
      };
      const ordenPagada: OrdenAlquiler = {
        ...ORDEN_PENDIENTE,
        ordenId: 'orden-pagada',
        alquilerId: ALQUILER_ASIGNADO.alquilerId,
        estado: 'PAGADA',
      };
      const ordenRechazada: OrdenAlquiler = {
        ...ORDEN_PENDIENTE,
        ordenId: 'orden-rechazada',
        alquilerId: alquilerCotizado.alquilerId,
        estado: 'RECHAZADA',
      };
      const ordenCancelada: OrdenAlquiler = {
        ...ORDEN_PENDIENTE,
        ordenId: 'orden-cancelada',
        alquilerId: alquilerCancelado.alquilerId,
        estado: 'CANCELADA',
        metodoPago: 'EFECTIVO',
      };
      const ordenReembolsada: OrdenAlquiler = {
        ...ORDEN_REEMBOLSADA,
        ordenId: 'orden-reembolsada',
        alquilerId: alquilerCompletado.alquilerId,
      };
      const fixture = abrirMisAlquileres(
        [
          ALQUILER_SOLICITADO,
          alquilerCotizado,
          ALQUILER_PAGADO,
          ALQUILER_ASIGNADO,
          alquilerCancelado,
          alquilerCompletado,
          alquilerCanceladoSinPago,
        ],
        [ORDEN_PENDIENTE, ordenPagada, ordenRechazada, ordenCancelada, ordenReembolsada],
      );
      const componente = fixture.componentInstance;

      // Entonces
      expect(componente.aviso(alquilerCotizado)).toContain('precio ya está confirmado');
      expect(componente.aviso(alquilerCompletado)).toContain('Viaje completado');
      expect(componente.aviso(alquilerCanceladoSinPago)).toContain('No se realizó ningún cobro');
      expect(componente.sePuedeCancelar(alquilerCompletado)).toBeFalse();
      expect(componente.sePuedeCancelar(ALQUILER_PAGADO)).toBeTrue();
      expect(componente.huboCobro(alquilerCanceladoSinPago)).toBeFalse();
      expect(componente.huboCobro(ALQUILER_ASIGNADO)).toBeTrue();
      expect(componente.tieneReembolso(alquilerCotizado)).toBeFalse();
      expect(componente.avisoOrden(ALQUILER_PAGADO)).toContain('Pendiente de pago');
      expect(componente.avisoOrden(ALQUILER_ASIGNADO)).toBe('Pago confirmado.');
      expect(componente.avisoOrden(alquilerCotizado)).toContain('cobro a tu billetera no se pudo hacer');
      expect(componente.avisoOrden(alquilerCancelado)).toContain('efectivo se entrega en ventanilla');
      expect(componente.avisoOrden(alquilerCompletado)).toBe('El dinero ya se devolvió.');
      expect(componente.medioDevolucion(ALQUILER_PAGADO)).toContain('billetera digital');
      expect(componente.tieneRecorrido(crearAlquiler({ origenLatitud: null, origenLongitud: null }))).toBeTrue();
      expect(componente.tieneRecorrido(crearAlquiler({
        origenLatitud: null,
        origenLongitud: null,
        destinoLatitud: null,
        destinoLongitud: null,
      }))).toBeFalse();
    });

    it('deriva la cancelación de solicitudes cotizadas a la sucursal', () => {
      // Dado
      const alquilerCotizado = crearAlquiler({
        alquilerId: 'alquiler-cotizado',
        estado: 'COTIZADO',
        precioConfirmado: 1200,
      });
      const fixture = abrirMisAlquileres([ALQUILER_SOLICITADO, alquilerCotizado]);
      const componente = fixture.componentInstance;

      // Entonces
      expect(componente.sePuedeCancelar(ALQUILER_SOLICITADO)).toBeFalse();
      expect(componente.sePuedeCancelar(alquilerCotizado)).toBeFalse();
      expect(componente.enCotizacion(ALQUILER_SOLICITADO)).toBeTrue();
      expect(componente.enCotizacion(alquilerCotizado)).toBeTrue();
      expect(fixture.nativeElement.querySelectorAll('button.peligro')).toHaveSize(0);

      // Cuando
      pulsar(fixture, '¿Cancelar? Llama a la sucursal');
      resolverRutas(http);

      // Entonces
      expect(componente.enDetalle()).toEqual(ALQUILER_SOLICITADO);
      expect(componente.pestana()).toBe('sucursal');
      expect((fixture.nativeElement.querySelector('.modal') as HTMLElement).textContent)
        .toContain(SUCURSAL.telefono);

      // Cuando
      componente.verDetalle(alquilerCotizado);
      fixture.detectChanges();
      pulsar(fixture, 'Llamar a la sucursal');
      resolverRutas(http);

      // Entonces
      expect(componente.enDetalle()).toEqual(alquilerCotizado);
      expect(componente.pestana()).toBe('sucursal');
      expect((fixture.nativeElement.querySelector('.modal') as HTMLElement).textContent)
        .toContain(SUCURSAL.telefono);
    });

    it('avisa cuando no se pueden cargar los datos de contacto de la sucursal', () => {
      // Dado
      guardarSesion();
      abrir(MisAlquileresComponent);
      http.expectOne(API_SUCURSALES).flush(
        {},
        { status: 503, statusText: 'Service Unavailable' },
      );
      http.expectOne(API_MIAS).flush([]);
      http.expectOne(API_MIOS).flush([ALQUILER_SOLICITADO]);

      // Entonces
      expect(avisos.avisos().some(
        (aviso) =>
          aviso.tipo === 'error' &&
          aviso.texto === 'Ocurrió un problema en el servidor. Intenta de nuevo.',
      )).toBeTrue();
    });

    it('abre el detalle con el bus y el chofer asignados', () => {
      // Dado
      const fixture = abrirMisAlquileres([ALQUILER_ASIGNADO]);

      // Cuando
      pulsar(fixture, 'Ver');
      resolverRutas(http);
      const modal = fixture.nativeElement.querySelector('.modal') as HTMLElement;

      // Entonces
      expect(modal.textContent).toContain('Detalle del alquiler');
      expect(modal.textContent).toContain('Xela → Quetzaltenango');
      expect(modal.textContent).toContain('Viaje asignado');
      expect(modal.textContent).toContain('XLA-123');

      // Cuando
      pulsar(fixture, 'El bus asignado');

      // Entonces
      expect(modal.textContent).toContain('Placa');
      expect(modal.textContent).toContain('Carlos Ruiz');
      expect(modal.textContent).toContain('45 asientos');
    });

    it('cancela un alquiler pagado y muestra el reembolso de la política', () => {
      // Dado
      const fixture = abrirMisAlquileres([ALQUILER_PAGADO], [ORDEN_PENDIENTE]);
      pulsar(fixture, 'Cancelar');

      // Cuando
      escribir(fixture, '#motivo', MOTIVO_CANCELACION);
      escribir(fixture, '#fecha-cancelacion', FECHA_CANCELACION_LOCAL);
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_ALQUILERES}/${ALQUILER_PAGADO.alquilerId}/cancelar`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({
        motivo: MOTIVO_CANCELACION,
        fechaHoraCancelacion: FECHA_CANCELACION,
        version: ALQUILER_PAGADO.version,
      });
      peticion.flush(ALQUILER_CANCELADO);
      http.expectOne(API_MIAS).flush([ORDEN_REEMBOLSADA]);
      http.expectOne(API_MIOS).flush([ALQUILER_CANCELADO]);
      fixture.detectChanges();

      expect(fixture.componentInstance.porCancelar()).toBeNull();
      expect(
        avisos.avisos().some(
          (a) => a.texto === 'Alquiler cancelado. Revisa la orden de pago para ver el reembolso.',
        ),
      ).toBeTrue();

      // Cuando
      pulsar(fixture, 'Ver');
      resolverRutas(http);
      pulsar(fixture, 'Orden de pago');
      const modal = fixture.nativeElement.querySelector('.modal') as HTMLElement;

      // Entonces
      expect(modal.textContent).toContain('Se te devuelve');
      expect(modal.textContent).toContain('50% de');
      expect(modal.textContent).toContain('Dinero devuelto');
      expect(modal.textContent).toContain('Con 48 horas o más de anticipación');
      expect(modal.textContent).toContain('500');
    });

    it('deja el modal abierto con la justificación cuando la política rechaza la cancelación', () => {
      // Dado
      const fixture = abrirMisAlquileres([ALQUILER_PAGADO], [ORDEN_PENDIENTE]);
      pulsar(fixture, 'Cancelar');

      // Cuando
      escribir(fixture, '#motivo', MOTIVO_CANCELACION);
      escribir(fixture, '#fecha-cancelacion', FECHA_CANCELACION_LOCAL);
      enviar(fixture);
      http.expectOne(`${API_ALQUILERES}/${ALQUILER_PAGADO.alquilerId}/cancelar`).flush(
        { codigo: 'FUERA_DE_POLITICA', mensaje: 'Ya no se puede cancelar: faltan menos de 2 horas para la salida.' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      // Entonces
      const problema = fixture.nativeElement.querySelector('.modal .aviso-error') as HTMLElement;
      expect(problema.textContent).toContain('Ya no se puede cancelar');
      expect(fixture.componentInstance.porCancelar()).not.toBeNull();
      expect(fixture.componentInstance.enviando()).toBeFalse();
    });
  });

  describe('alquileres de sucursal', () => {
    function abrirAlquileres(alquileres: Alquiler[]): ComponentFixture<AlquileresComponent> {
      guardarSesion(ADMIN_SUCURSAL);
      const fixture = abrir(AlquileresComponent);
      http.expectOne((peticion) => peticion.url === API_SUCURSALES).flush([SUCURSAL]);
      const listado = http.expectOne((peticion) => peticion.url === API_ALQUILERES);
      expect(listado.request.params.get('sucursalId')).toBe(SUCURSAL_ID);
      listado.flush(alquileres);
      fixture.detectChanges();
      return fixture;
    }

    it('lista los alquileres de la sucursal y filtra por estado', () => {
      // Dado
      const fixture = abrirAlquileres([ALQUILER_SOLICITADO, ALQUILER_PAGADO]);

      // Entonces
      const filas = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(filas.length).toBe(2);
      expect(filas[0].textContent).toContain('Ana Pérez');
      expect(filas[0].textContent).toContain('Solicitado');
      expect(filas[0].textContent).toContain('Cotizar');
      expect(filas[1].textContent).toContain('Pagado');
      expect(filas[1].textContent).toContain('Asignar');

      // Cuando
      elegir(fixture, '#estado', 'PAGADO');

      // Entonces
      const filtrada = http.expectOne((peticion) => peticion.url === API_ALQUILERES);
      expect(filtrada.request.params.get('estado')).toBe('PAGADO');
      filtrada.flush([ALQUILER_PAGADO]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
      expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Pagado');
    });

    it('asigna bus y chofer y crea el viaje privado', () => {
      // Dado
      const fixture = abrirAlquileres([ALQUILER_PAGADO]);
      pulsar(fixture, 'Asignar');

      const buses = http.expectOne((peticion) => peticion.url === API_BUSES);
      expect(buses.request.params.get('sucursalId')).toBe(SUCURSAL_ID);
      expect(buses.request.params.get('estado')).toBe('ACTIVO');
      buses.flush([BUS]);
      const choferes = http.expectOne((peticion) => peticion.url === API_CHOFERES);
      expect(choferes.request.params.get('sucursalId')).toBe(SUCURSAL_ID);
      expect(choferes.request.params.get('estado')).toBe('ACTIVO');
      choferes.flush([CHOFER]);
      fixture.detectChanges();

      // Cuando
      elegir(fixture, '#a-bus', BUS.busId);
      elegir(fixture, '#a-chofer', CHOFER.choferId);
      http.expectOne(`${API_USUARIOS}/${CHOFER.usuarioId}`).flush(USUARIO_DETALLE);
      expect((fixture.nativeElement.querySelector('#a-llegada') as HTMLInputElement).value)
        .toBe('2026-11-06T20:00');
      escribir(fixture, '#a-llegada', LLEGADA_LOCAL);
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_ALQUILERES}/${ALQUILER_PAGADO.alquilerId}/asignacion`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({
        busId: BUS.busId,
        choferId: CHOFER.choferId,
        fechaLlegadaEstimada: LLEGADA,
        version: ALQUILER_PAGADO.version,
      });
      peticion.flush(VIAJE_ASIGNADO);
      http.expectOne((peticion) => peticion.url === API_ALQUILERES).flush([ALQUILER_ASIGNADO]);
      fixture.detectChanges();

      expect(fixture.componentInstance.porAsignar()).toBeNull();
      expect(
        avisos.avisos().some(
          (a) => a.texto === `Viaje creado con el bus ${BUS.placa}. El alquiler quedó asignado.`,
        ),
      ).toBeTrue();
    });

    it('propone la llegada de ida y vuelta cuando el alquiler no tiene fecha de retorno', () => {
      // Dado
      const soloIda = crearAlquiler({
        ...ALQUILER_PAGADO,
        alquilerId: 'alquiler-solo-ida',
        fechaRetorno: null,
        kmEstimados: 120,
      });
      const fixture = abrirAlquileres([soloIda]);

      // Cuando
      pulsar(fixture, 'Asignar');
      http.expectOne((peticion) => peticion.url === API_BUSES).flush([BUS]);
      http.expectOne((peticion) => peticion.url === API_CHOFERES).flush([CHOFER]);
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('#a-llegada') as HTMLInputElement).value)
        .toBe(LLEGADA_LOCAL);
      expect((fixture.nativeElement.textContent as string)).toContain('solo ida');
    });

    it('propone al menos una hora de recorrido para una distancia corta', () => {
      // Dado
      const soloIdaCorto = crearAlquiler({
        ...ALQUILER_PAGADO,
        alquilerId: 'alquiler-solo-ida-corto',
        fechaRetorno: null,
        kmEstimados: 10,
      });
      const fixture = abrirAlquileres([soloIdaCorto]);

      // Cuando
      pulsar(fixture, 'Asignar');
      http.expectOne((peticion) => peticion.url === API_BUSES).flush([BUS]);
      http.expectOne((peticion) => peticion.url === API_CHOFERES).flush([CHOFER]);
      fixture.detectChanges();

      // Entonces
      expect((fixture.nativeElement.querySelector('#a-llegada') as HTMLInputElement).value)
        .toBe('2026-11-05T09:00');
    });

    it('cancela el alquiler y avisa que el reembolso queda en la orden', () => {
      // Dado
      const fixture = abrirAlquileres([ALQUILER_PAGADO]);
      pulsar(fixture, 'Cancelar');

      // Cuando
      escribir(fixture, '#motivo-cancelar', MOTIVO_CANCELACION);
      escribir(fixture, '#fecha-cancelacion', FECHA_CANCELACION_LOCAL);
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_ALQUILERES}/${ALQUILER_PAGADO.alquilerId}/cancelar`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({
        motivo: MOTIVO_CANCELACION,
        fechaHoraCancelacion: FECHA_CANCELACION,
        version: ALQUILER_PAGADO.version,
      });
      peticion.flush(ALQUILER_CANCELADO);
      http.expectOne((peticion) => peticion.url === API_ALQUILERES).flush([ALQUILER_CANCELADO]);
      fixture.detectChanges();

      expect(fixture.componentInstance.porCancelar()).toBeNull();
      expect(
        avisos.avisos().some(
          (a) => a.texto === 'Alquiler cancelado. El reembolso queda registrado en la orden de pago.',
        ),
      ).toBeTrue();
    });

    it('muestra el aviso del servidor cuando no se puede cancelar', () => {
      // Dado
      const fixture = abrirAlquileres([ALQUILER_PAGADO]);
      pulsar(fixture, 'Cancelar');

      // Cuando
      escribir(fixture, '#motivo-cancelar', MOTIVO_CANCELACION);
      escribir(fixture, '#fecha-cancelacion', FECHA_CANCELACION_LOCAL);
      enviar(fixture);
      http.expectOne(`${API_ALQUILERES}/${ALQUILER_PAGADO.alquilerId}/cancelar`).flush(
        { codigo: 'TARIFA_NO_PERMITE', mensaje: 'La tarifa vigente ya no permite cancelar a esta hora.' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      // Entonces
      const problema = fixture.nativeElement.querySelector('.modal .aviso-error') as HTMLElement;
      expect(problema.textContent).toContain('La tarifa vigente ya no permite cancelar');
      expect(fixture.componentInstance.porCancelar()).not.toBeNull();
      expect(fixture.componentInstance.enviando()).toBeFalse();
    });
  });

  describe('precio de alquiler', () => {
    function abrirPrecios(precios: ConfigAlquiler[]): ComponentFixture<PrecioAlquilerComponent> {
      guardarSesion(ADMIN_SISTEMA);
      const fixture = abrir(PrecioAlquilerComponent);
      http.expectOne(API_CONFIG).flush(precios);
      fixture.detectChanges();
      return fixture;
    }

    it('muestra el precio por kilómetro vigente y marca los programados', () => {
      // Dado
      const fixture = abrirPrecios([PRECIO_ACTUAL, PRECIO_PROGRAMADO]);

      // Entonces
      const vigente = fixture.nativeElement.querySelector('.vigente') as HTMLElement;
      expect(vigente.textContent).toContain('Precio vigente hoy');
      expect(vigente.textContent).toContain('12.5');
      const filas = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(filas[0].textContent).toContain('En uso');
      expect(filas[1].textContent).toContain('Programado');
    });

    it('avisa cuando no hay un precio vigente', () => {
      // Dado
      const fixture = abrirPrecios([PRECIO_PROGRAMADO]);

      // Entonces
      expect((fixture.nativeElement.querySelector('.vigente') as HTMLElement).textContent)
        .toContain('No hay un precio de alquiler vigente');
    });

    it('registra un precio nuevo y recarga el historial', () => {
      // Dado
      const fixture = abrirPrecios([PRECIO_ACTUAL]);

      // Cuando
      pulsar(fixture, '+ Nuevo precio');
      escribir(fixture, '#precio', String(PRECIO_POR_KM));
      escribir(fixture, '#desde', FECHA_PRECIO);
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(API_CONFIG);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ precioPorKm: PRECIO_POR_KM, vigenteDesde: FECHA_PRECIO });
      peticion.flush(PRECIO_NUEVO);
      http.expectOne(API_CONFIG).flush([PRECIO_NUEVO, PRECIO_ACTUAL]);
      fixture.detectChanges();

      expect(fixture.componentInstance.creando()).toBeFalse();
      expect(avisos.avisos().some((a) => a.texto === 'Precio de alquiler registrado.')).toBeTrue();
      expect((fixture.nativeElement.querySelector('.vigente') as HTMLElement).textContent)
        .toContain(String(PRECIO_POR_KM));
    });

    it('no registra un precio vacío', () => {
      // Dado
      const fixture = abrirPrecios([PRECIO_ACTUAL]);
      pulsar(fixture, '+ Nuevo precio');

      // Cuando
      enviar(fixture);

      // Entonces
      http.expectNone(API_CONFIG);
      expect(fixture.componentInstance.form.controls.precioPorKm.touched).toBeTrue();
      expect((fixture.nativeElement.querySelector('#precio') as HTMLElement).className).toContain('invalido');
    });

    it('muestra el error del servidor al guardar el precio', () => {
      // Dado
      const fixture = abrirPrecios([PRECIO_ACTUAL]);
      pulsar(fixture, '+ Nuevo precio');
      escribir(fixture, '#precio', String(PRECIO_POR_KM));
      escribir(fixture, '#desde', FECHA_PRECIO);

      // Cuando
      enviar(fixture);
      http.expectOne(API_CONFIG).flush(
        { codigo: 'DATOS_INVALIDOS', mensaje: 'Ya existe un precio de alquiler para esa fecha.' },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      // Entonces
      expect(avisos.avisos().some((a) => a.texto === 'Ya existe un precio de alquiler para esa fecha.')).toBeTrue();
      expect(fixture.componentInstance.creando()).toBeTrue();
      expect(fixture.componentInstance.enviando()).toBeFalse();
    });
  });
});
