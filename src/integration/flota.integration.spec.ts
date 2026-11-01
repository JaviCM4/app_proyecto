import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UsuarioSesion } from '../app/core/models/auth.model';
import { Bus } from '../app/core/models/bus.model';
import { Chofer } from '../app/core/models/chofer.model';
import { PersonalSucursal, Sucursal } from '../app/core/models/sucursal.model';
import { UsuarioAsignable, UsuarioBusqueda } from '../app/core/models/usuario.model';
import { BusesComponent } from '../app/paginas/flota/buses/buses.component';
import { ChoferesComponent } from '../app/paginas/flota/choferes/choferes.component';
import { PersonalComponent } from '../app/paginas/flota/personal/personal.component';
import { ToastService } from '../app/shared/services/toast.service';
import {
  API,
  API_IDENTITY,
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
 * Pruebas de integración de la flota: buses, choferes y personal.
 * Se usan los componentes, las plantillas y los servicios reales; solo el HTTP y la navegación se simulan.
 * Convención: Dado / Cuando / Entonces (flujo completo, sin AAA).
 */

const API_FLEET = `${API}/fleet`;
const API_BUSES = `${API_FLEET}/buses`;
const API_CHOFERES = `${API_FLEET}/choferes`;
const API_SUCURSALES = `${API_FLEET}/sucursales`;
const API_FOTOS = `${API_FLEET}/archivos/fotos`;
const API_USUARIOS = `${API_IDENTITY}/usuarios`;

const FOTO_BUS = 'https://archivos.pruebas/bus.jpg';
const FOTO_CHOFER = 'https://archivos.pruebas/chofer.jpg';
const FOTO_NUEVA = 'https://archivos.pruebas/nueva.jpg';

const USUARIO_SUCURSAL: UsuarioSesion = {
  ...USUARIO,
  roles: ['ADMIN_SUCURSAL'],
  sucursalId: SUCURSAL_ID,
};

const SUCURSAL: Sucursal = {
  sucursalId: SUCURSAL_ID,
  codigo: 'XELA',
  nombre: 'Quetzaltenango',
  departamento: 'Quetzaltenango',
  municipio: 'Quetzaltenango',
  direccion: 'Terminal Central, Zona 3',
  telefono: '77777777',
  latitud: 14.8347,
  longitud: -91.5189,
  activa: true,
  version: 1,
};

const BUS_ACTIVO: Bus = {
  busId: 'bus-1',
  sucursalId: SUCURSAL_ID,
  placa: 'M123ABC',
  marca: 'Mercedes-Benz',
  modelo: 'OF-1721',
  anioFabricacion: 2019,
  capacidadPasajeros: 45,
  estado: 'ACTIVO',
  kilometrajeActual: 125000,
  fotoUrl: FOTO_BUS,
  version: 1,
};

const BUS_EN_TALLER: Bus = {
  busId: 'bus-2',
  sucursalId: SUCURSAL_ID,
  placa: 'P456DEF',
  marca: 'Volvo',
  modelo: '9800',
  anioFabricacion: 2018,
  capacidadPasajeros: 50,
  estado: 'EN_TALLER',
  kilometrajeActual: 98000,
  fotoUrl: FOTO_BUS,
  version: 1,
};

const BUS_NUEVO: Bus = {
  busId: 'bus-3',
  sucursalId: SUCURSAL_ID,
  placa: 'P789GHI',
  marca: 'Hino',
  modelo: 'AK',
  anioFabricacion: 2021,
  capacidadPasajeros: 40,
  estado: 'ACTIVO',
  kilometrajeActual: 5000,
  fotoUrl: FOTO_NUEVA,
  version: 1,
};

const CHOFER_ACTIVO: Chofer = {
  choferId: 'chofer-1',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-chofer-1',
  nombreCompleto: 'Carlos Méndez',
  numeroLicencia: 'LIC-1001',
  tipoLicencia: 'B',
  fechaVencimientoLicencia: '2027-05-30',
  salarioBaseViaje: 150,
  estado: 'ACTIVO',
  version: 1,
};

const CHOFER_INACTIVO: Chofer = {
  choferId: 'chofer-2',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-chofer-2',
  nombreCompleto: 'Rosa Ixchop',
  numeroLicencia: 'LIC-2002',
  tipoLicencia: 'C',
  fechaVencimientoLicencia: '2026-12-15',
  salarioBaseViaje: 120,
  estado: 'INACTIVO',
  version: 3,
};

const CHOFER_NUEVO: Chofer = {
  choferId: 'chofer-3',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-chofer-3',
  nombreCompleto: 'Lucía Ramírez',
  numeroLicencia: 'LIC-3003',
  tipoLicencia: 'B',
  fechaVencimientoLicencia: '2028-01-15',
  salarioBaseViaje: 175.5,
  estado: 'ACTIVO',
  version: 1,
};

const CHOFER_ASIGNADO: Chofer = {
  choferId: 'chofer-4',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-9',
  nombreCompleto: 'Lucía Ramírez',
  numeroLicencia: 'LIC-4004',
  tipoLicencia: 'B',
  fechaVencimientoLicencia: '2028-02-20',
  salarioBaseViaje: 160,
  estado: 'ACTIVO',
  version: 1,
};

const PERSONAL_ADMIN: PersonalSucursal = {
  personalId: 'personal-1',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-admin-2',
  nombreCompleto: 'Marta López',
  correo: 'marta@pruebas.gt',
  rol: 'ADMIN_SUCURSAL',
  activo: true,
  fechaAsignacion: '2026-01-15',
  fechaDesasignacion: null,
  version: 1,
};

const PERSONAL_CAJERO: PersonalSucursal = {
  personalId: 'personal-2',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-cajero-2',
  nombreCompleto: 'José García',
  correo: 'jose@pruebas.gt',
  rol: 'CAJERO',
  activo: true,
  fechaAsignacion: '2026-03-20',
  fechaDesasignacion: null,
  version: 1,
};

const PERSONAL_NUEVO: PersonalSucursal = {
  personalId: 'personal-3',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-nuevo-3',
  nombreCompleto: 'Sofía Hernández',
  correo: 'sofia@pruebas.gt',
  rol: 'CAJERO',
  activo: true,
  fechaAsignacion: '2026-10-31',
  fechaDesasignacion: null,
  version: 1,
};

const PERSONAL_ASIGNADO: PersonalSucursal = {
  personalId: 'personal-4',
  sucursalId: SUCURSAL_ID,
  usuarioId: 'usuario-9',
  nombreCompleto: 'Lucía Ramírez',
  correo: 'lucia@pruebas.gt',
  rol: 'CAJERO',
  activo: true,
  fechaAsignacion: '2026-10-31',
  fechaDesasignacion: null,
  version: 1,
};

const CUENTA_ASIGNABLE: UsuarioAsignable = {
  usuarioId: 'usuario-9',
  correo: 'lucia@pruebas.gt',
  nombreCompleto: 'Lucía Ramírez',
  fotoUrl: FOTO_CHOFER,
};

const CUENTA_BUSQUEDA: UsuarioBusqueda = {
  ...CUENTA_ASIGNABLE,
  puedeSerPersonal: true,
  motivo: null,
};

function avisos(): ToastService {
  return TestBed.inject(ToastService);
}

function primerAviso(): string {
  return avisos().avisos()[0]?.texto ?? '';
}

function pulsar(fixture: ComponentFixture<unknown>, texto: string, raiz?: HTMLElement): void {
  const contenedor: ParentNode = raiz ?? fixture.nativeElement;
  const botones = Array.from(contenedor.querySelectorAll('button')) as HTMLButtonElement[];
  const boton = botones.find((b) => (b.textContent ?? '').trim().includes(texto));
  if (!boton) throw new Error(`No se encontró el botón «${texto}».`);
  boton.click();
  fixture.detectChanges();
}

function pulsarElemento(fixture: ComponentFixture<unknown>, elemento: HTMLElement): void {
  elemento.click();
  fixture.detectChanges();
}

function elegir(fixture: ComponentFixture<unknown>, selector: string, valor: string): void {
  const campo = fixture.nativeElement.querySelector(selector) as HTMLSelectElement | null;
  if (!campo) throw new Error(`No se encontró el selector ${selector}.`);
  campo.value = valor;
  campo.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function adjuntar(fixture: ComponentFixture<unknown>, selector: string, nombre: string, tipo: string): void {
  const entrada = fixture.nativeElement.querySelector(selector) as HTMLInputElement | null;
  if (!entrada) throw new Error(`No se encontró el campo de archivo ${selector}.`);
  const datos = new DataTransfer();
  datos.items.add(new File(['contenido'], nombre, { type: tipo }));
  entrada.files = datos.files;
  entrada.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function fila(fixture: ComponentFixture<unknown>, texto: string): HTMLElement {
  const filas = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLElement[];
  const encontrada = filas.find((f) => (f.textContent ?? '').includes(texto));
  if (!encontrada) throw new Error(`No se encontró la fila «${texto}».`);
  return encontrada;
}

function opcion(fixture: ComponentFixture<unknown>, texto: string): HTMLElement {
  const opciones = Array.from(fixture.nativeElement.querySelectorAll('.fila')) as HTMLElement[];
  const encontrada = opciones.find((o) => (o.textContent ?? '').includes(texto));
  if (!encontrada) throw new Error(`No se encontró la cuenta «${texto}».`);
  return encontrada;
}

function textoDe(fixture: ComponentFixture<unknown>, selector: string): string {
  const elemento = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  return elemento?.textContent ?? '';
}

describe('Integración: flota', () => {
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

  describe('buses', () => {
    function abrirPagina(): ComponentFixture<BusesComponent> {
      guardarSesion(USUARIO_SUCURSAL);
      const fixture = abrir(BusesComponent);
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush([SUCURSAL]);
      http.expectOne(`${API_BUSES}?sucursalId=${SUCURSAL_ID}`).flush([BUS_ACTIVO, BUS_EN_TALLER]);
      fixture.detectChanges();
      return fixture;
    }

    it('lista los buses de la sucursal con su estado', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      const tabla = textoDe(fixture, 'tbody');

      // Entonces
      expect(tabla).toContain('M123ABC');
      expect(tabla).toContain('Mercedes-Benz OF-1721');
      expect(tabla).toContain('Activo');
      expect(tabla).toContain('P456DEF');
      expect(tabla).toContain('En taller');
    });

    it('busca por placa, marca o modelo', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      escribir(fixture, '#b-buscar', 'volvo');

      // Entonces
      const tabla = textoDe(fixture, 'tbody');
      expect(tabla).toContain('P456DEF');
      expect(tabla).not.toContain('M123ABC');
    });

    it('filtra los buses por estado', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      elegir(fixture, '#b-estado', 'EN_TALLER');

      // Entonces
      const tabla = textoDe(fixture, 'tbody');
      expect(tabla).toContain('P456DEF');
      expect(tabla).not.toContain('M123ABC');
      expect(fixture.componentInstance.estado()).toBe('EN_TALLER');
    });

    it('registra un bus con foto y recarga la lista', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Nuevo bus');

      // Cuando
      escribir(fixture, '#b-placa', 'p789ghi');
      escribir(fixture, '#b-marca', 'Hino');
      escribir(fixture, '#b-modelo', 'AK');
      escribir(fixture, '#b-anio', '2021');
      escribir(fixture, '#b-capacidad', '40');
      escribir(fixture, '#b-km', '5000');
      adjuntar(fixture, '#b-foto', 'bus.jpg', 'image/jpeg');
      enviar(fixture);

      // Entonces
      http.expectOne(`${API_FOTOS}?tipo=BUS`).flush({ fotoUrl: FOTO_NUEVA });
      const creacion = http.expectOne(API_BUSES);
      expect(creacion.request.method).toBe('POST');
      expect(creacion.request.body).toEqual(
        jasmine.objectContaining({
          sucursalId: SUCURSAL_ID,
          placa: 'P789GHI',
          marca: 'Hino',
          modelo: 'AK',
          anioFabricacion: 2021,
          capacidadPasajeros: 40,
          kilometrajeActual: 5000,
          fotoUrl: FOTO_NUEVA,
        }),
      );
      creacion.flush(BUS_NUEVO);
      http.expectOne(`${API_BUSES}?sucursalId=${SUCURSAL_ID}`).flush([BUS_ACTIVO, BUS_EN_TALLER, BUS_NUEVO]);
      fixture.detectChanges();

      expect(primerAviso()).toBe('Bus P789GHI registrado.');
      expect(textoDe(fixture, 'tbody')).toContain('P789GHI');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('no envía el alta con el formulario vacío', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Nuevo bus');

      // Cuando
      enviar(fixture);

      // Entonces
      http.expectNone(API_BUSES);
      http.expectNone(`${API_FOTOS}?tipo=BUS`);
      expect(fixture.componentInstance.formCrear.controls.placa.touched).toBeTrue();
      expect(textoDe(fixture, '.error')).toContain('De 5 a 10 caracteres');
    });

    it('exige una foto antes de registrar el bus', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Nuevo bus');
      escribir(fixture, '#b-placa', 'P789GHI');
      escribir(fixture, '#b-marca', 'Hino');
      escribir(fixture, '#b-modelo', 'AK');
      escribir(fixture, '#b-capacidad', '40');

      // Cuando
      enviar(fixture);

      // Entonces
      http.expectNone(API_BUSES);
      http.expectNone(`${API_FOTOS}?tipo=BUS`);
      expect(primerAviso()).toBe('Sube una foto del bus (JPG, PNG o WEBP, máx. 2 MB).');
    });

    it('rechaza una foto que no sea JPG, PNG o WEBP', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Nuevo bus');

      // Cuando
      adjuntar(fixture, '#b-foto', 'bus.pdf', 'application/pdf');

      // Entonces
      expect(primerAviso()).toBe('La foto debe ser JPG, PNG o WEBP y pesar máximo 2 MB.');
      expect(fixture.componentInstance.fotoCrear()).toBeNull();
    });

    it('edita los datos del bus y conserva su foto', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, 'Editar', fila(fixture, 'M123ABC'));

      // Cuando
      escribir(fixture, '#be-marca', 'Mercedes');
      escribir(fixture, '#be-modelo', 'OF-1721 New');
      escribir(fixture, '#be-capacidad', '48');
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_BUSES}/bus-1`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual({
        marca: 'Mercedes',
        modelo: 'OF-1721 New',
        anioFabricacion: 2019,
        capacidadPasajeros: 48,
        fotoUrl: FOTO_BUS,
        version: 1,
      });
      peticion.flush({ ...BUS_ACTIVO, marca: 'Mercedes', modelo: 'OF-1721 New', capacidadPasajeros: 48, version: 2 });
      fixture.detectChanges();

      expect(primerAviso()).toBe('Bus M123ABC actualizado.');
      expect(textoDe(fixture, 'tbody')).toContain('Mercedes OF-1721 New');
    });

    it('sube una foto nueva al editar el bus', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, 'Editar', fila(fixture, 'P456DEF'));

      // Cuando
      adjuntar(fixture, '#be-foto', 'nueva.jpg', 'image/jpeg');
      enviar(fixture);

      // Entonces
      http.expectOne(`${API_FOTOS}?tipo=BUS`).flush({ fotoUrl: FOTO_NUEVA });
      const peticion = http.expectOne(`${API_BUSES}/bus-2`);
      expect((peticion.request.body as { fotoUrl: string }).fotoUrl).toBe(FOTO_NUEVA);
      peticion.flush({ ...BUS_EN_TALLER, fotoUrl: FOTO_NUEVA, version: 2 });
      fixture.detectChanges();

      expect(primerAviso()).toBe('Bus P456DEF actualizado.');
    });
  });

  describe('choferes', () => {
    function abrirPagina(): ComponentFixture<ChoferesComponent> {
      guardarSesion(USUARIO_SUCURSAL);
      const fixture = abrir(ChoferesComponent);
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush([SUCURSAL]);
      http.expectOne(`${API_CHOFERES}?sucursalId=${SUCURSAL_ID}`).flush([CHOFER_ACTIVO, CHOFER_INACTIVO]);
      fixture.detectChanges();
      return fixture;
    }

    it('lista los choferes con su licencia y estado', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      const tabla = textoDe(fixture, 'tbody');

      // Entonces
      expect(tabla).toContain('Carlos Méndez');
      expect(tabla).toContain('LIC-1001');
      expect(tabla).toContain('Tipo B');
      expect(tabla).toContain('30/05/2027');
      expect(tabla).toContain('Activo');
      expect(tabla).toContain('Rosa Ixchop');
      expect(tabla).toContain('Inactivo');
    });

    it('muestra solo los choferes activos', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      elegir(fixture, '#ch-estado', 'ACTIVO');

      // Entonces
      const tabla = textoDe(fixture, 'tbody');
      expect(tabla).toContain('Carlos Méndez');
      expect(tabla).not.toContain('Rosa Ixchop');
    });

    it('muestra solo los choferes inactivos', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      elegir(fixture, '#ch-estado', 'INACTIVO');

      // Entonces
      const tabla = textoDe(fixture, 'tbody');
      expect(tabla).toContain('Rosa Ixchop');
      expect(tabla).not.toContain('Carlos Méndez');
    });

    it('registra un chofer con cuenta nueva y foto', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Nuevo chofer');
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush([SUCURSAL]);

      // Cuando
      escribir(fixture, '#ch-licencia', 'lic-3003');
      escribir(fixture, '#ch-vence', '2028-01-15');
      escribir(fixture, '#ch-salario', '175.5');
      escribir(fixture, '#ch-nombres', 'Lucía');
      escribir(fixture, '#ch-apellidos', 'Ramírez');
      escribir(fixture, '#ch-correo', 'lucia@pruebas.gt');
      escribir(fixture, '#ch-dpi', '1234567890101');
      escribir(fixture, '#ch-nit', '1234567-8');
      escribir(fixture, '#ch-telefono', '55555555');
      escribir(fixture, '#ch-direccion', 'Calle Real 1-23');
      adjuntar(fixture, '#ch-foto', 'chofer.jpg', 'image/jpeg');
      enviar(fixture);

      // Entonces
      http.expectOne(`${API_FOTOS}?tipo=CHOFER`).flush({ fotoUrl: FOTO_CHOFER });
      const creacion = http.expectOne(API_CHOFERES);
      expect(creacion.request.method).toBe('POST');
      expect(creacion.request.body).toEqual(
        jasmine.objectContaining({
          sucursalId: SUCURSAL_ID,
          numeroLicencia: 'LIC-3003',
          tipoLicencia: 'B',
          fechaVencimientoLicencia: '2028-01-15',
          salarioBaseViaje: 175.5,
          cuenta: jasmine.objectContaining({
            correo: 'lucia@pruebas.gt',
            nombres: 'Lucía',
            apellidos: 'Ramírez',
            nit: '1234567-8',
            dpi: '1234567890101',
            telefono: '55555555',
            direccion: 'Calle Real 1-23',
            fotoUrl: FOTO_CHOFER,
          }),
        }),
      );
      creacion.flush(CHOFER_NUEVO);
      http.expectOne(`${API_CHOFERES}?sucursalId=${SUCURSAL_ID}`).flush([CHOFER_ACTIVO, CHOFER_INACTIVO, CHOFER_NUEVO]);
      fixture.detectChanges();

      expect(primerAviso()).toBe('Lucía Ramírez quedó registrado como piloto. Le llegará un correo para activar su cuenta.');
      expect(textoDe(fixture, 'tbody')).toContain('Lucía Ramírez');
    });

    it('asigna una cuenta existente como chofer', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Nuevo chofer');
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush([SUCURSAL]);
      pulsar(fixture, 'Ya tiene cuenta');
      http.expectOne(`${API_USUARIOS}/asignables?puesto=CHOFER`).flush([CUENTA_ASIGNABLE]);
      fixture.detectChanges();

      // Cuando
      escribir(fixture, '#ch-licencia', 'LIC-4004');
      escribir(fixture, '#ch-vence', '2028-02-20');
      escribir(fixture, '#ch-salario', '160');
      pulsarElemento(fixture, opcion(fixture, 'lucia@pruebas.gt'));
      http.expectOne(`${API_USUARIOS}/por-correo?correo=lucia@pruebas.gt&puesto=CHOFER`).flush(CUENTA_BUSQUEDA);
      fixture.detectChanges();
      enviar(fixture);

      // Entonces
      http.expectNone(`${API_FOTOS}?tipo=CHOFER`);
      const creacion = http.expectOne(API_CHOFERES);
      expect(creacion.request.body).toEqual(
        jasmine.objectContaining({
          numeroLicencia: 'LIC-4004',
          usuarioExistente: jasmine.objectContaining({ usuarioId: 'usuario-9' }),
        }),
      );
      expect(creacion.request.body.cuenta).toBeUndefined();
      creacion.flush(CHOFER_ASIGNADO);
      http.expectOne(`${API_CHOFERES}?sucursalId=${SUCURSAL_ID}`).flush([CHOFER_ACTIVO, CHOFER_INACTIVO, CHOFER_ASIGNADO]);
      fixture.detectChanges();

      expect(primerAviso()).toBe('Lucía Ramírez quedó registrado como piloto. Le llegará un correo para que vuelva a iniciar sesión.');
    });

    it('actualiza el salario base del chofer', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, 'Salario', fila(fixture, 'Carlos Méndez'));

      // Cuando
      escribir(fixture, '#chs-salario', '200');
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_CHOFERES}/chofer-1`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual({ salarioBaseViaje: 200, version: 1 });
      peticion.flush({ ...CHOFER_ACTIVO, salarioBaseViaje: 200, version: 2 });
      fixture.detectChanges();

      expect(primerAviso()).toBe('Salario actualizado.');
      expect(fila(fixture, 'Carlos Méndez').textContent).toContain('200.00');
    });

    it('renueva la licencia del chofer', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, 'Licencia', fila(fixture, 'Carlos Méndez'));

      // Cuando
      escribir(fixture, '#chl-numero', 'lic-9999');
      escribir(fixture, '#chl-vence', '2029-03-10');
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_CHOFERES}/chofer-1/licencia`);
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(
        jasmine.objectContaining({
          numeroLicencia: 'LIC-9999',
          tipoLicencia: 'B',
          fechaVencimientoLicencia: '2029-03-10',
          version: 1,
        }),
      );
      peticion.flush({ ...CHOFER_ACTIVO, numeroLicencia: 'LIC-9999', fechaVencimientoLicencia: '2029-03-10', version: 2 });
      fixture.detectChanges();

      expect(primerAviso()).toBe('Licencia renovada.');
      expect(fila(fixture, 'Carlos Méndez').textContent).toContain('LIC-9999');
    });

    it('retira al chofer y lo deja inactivo', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, 'Retirar', fila(fixture, 'Carlos Méndez'));

      // Cuando
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_CHOFERES}/chofer-1/desactivar`);
      expect(peticion.request.method).toBe('PATCH');
      expect(peticion.request.body).toEqual({ fecha: jasmine.any(String), version: 1 });
      peticion.flush({ ...CHOFER_ACTIVO, estado: 'INACTIVO', version: 2 });
      fixture.detectChanges();

      expect(primerAviso()).toBe('Carlos Méndez fue desactivado.');
      const textoFila = fila(fixture, 'Carlos Méndez').textContent ?? '';
      expect(textoFila).toContain('Inactivo');
      expect(textoFila).not.toContain('Retirar');
    });
  });

  describe('personal', () => {
    function abrirPagina(): ComponentFixture<PersonalComponent> {
      guardarSesion(USUARIO_SUCURSAL);
      const fixture = abrir(PersonalComponent);
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush([SUCURSAL]);
      http.expectOne(`${API_SUCURSALES}/${SUCURSAL_ID}/personal`).flush([PERSONAL_ADMIN, PERSONAL_CAJERO]);
      fixture.detectChanges();
      return fixture;
    }

    it('lista el personal de la sucursal con su puesto', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      const tabla = textoDe(fixture, 'tbody');

      // Entonces
      expect(tabla).toContain('Marta López');
      expect(tabla).toContain('marta@pruebas.gt');
      expect(tabla).toContain('Administrador de sucursal');
      expect(tabla).toContain('José García');
      expect(tabla).toContain('jose@pruebas.gt');
      expect(tabla).toContain('Cajero');
      expect(tabla).toContain('Activo');
    });

    it('busca al personal por correo', () => {
      // Dado
      const fixture = abrirPagina();

      // Cuando
      escribir(fixture, '#pe-buscar', 'jose@pruebas.gt');

      // Entonces
      const tabla = textoDe(fixture, 'tbody');
      expect(tabla).toContain('José García');
      expect(tabla).not.toContain('Marta López');
    });

    it('agrega un cajero con cuenta nueva', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Agregar cajero');
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush([SUCURSAL]);

      // Cuando
      escribir(fixture, '#p-nombres', 'Sofía');
      escribir(fixture, '#p-apellidos', 'Hernández');
      escribir(fixture, '#p-correo', 'sofia@pruebas.gt');
      escribir(fixture, '#p-dpi', '9876543210101');
      escribir(fixture, '#p-nit', '7654321-0');
      escribir(fixture, '#p-telefono', '44444444');
      escribir(fixture, '#p-direccion', 'Avenida 2');
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_SUCURSALES}/${SUCURSAL_ID}/personal`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(
        jasmine.objectContaining({
          rol: 'CAJERO',
          cuenta: jasmine.objectContaining({
            correo: 'sofia@pruebas.gt',
            nombres: 'Sofía',
            apellidos: 'Hernández',
            nit: '7654321-0',
            dpi: '9876543210101',
            telefono: '44444444',
            direccion: 'Avenida 2',
          }),
        }),
      );
      peticion.flush(PERSONAL_NUEVO);
      http.expectOne(`${API_SUCURSALES}/${SUCURSAL_ID}/personal`).flush([PERSONAL_ADMIN, PERSONAL_CAJERO, PERSONAL_NUEVO]);
      fixture.detectChanges();

      expect(primerAviso()).toBe('Sofía Hernández quedó asignado a la sucursal. Le llegará un correo para activar su cuenta.');
      expect(textoDe(fixture, 'tbody')).toContain('Sofía Hernández');
    });

    it('asigna una cuenta existente a la sucursal', () => {
      // Dado
      const fixture = abrirPagina();
      pulsar(fixture, '+ Agregar cajero');
      http.expectOne(`${API_SUCURSALES}?activa=true`).flush([SUCURSAL]);
      pulsar(fixture, 'Ya tiene cuenta');
      http.expectOne(`${API_USUARIOS}/asignables?puesto=PERSONAL`).flush([CUENTA_ASIGNABLE]);
      fixture.detectChanges();

      // Cuando
      pulsarElemento(fixture, opcion(fixture, 'lucia@pruebas.gt'));
      http.expectOne(`${API_USUARIOS}/por-correo?correo=lucia@pruebas.gt&puesto=PERSONAL`).flush(CUENTA_BUSQUEDA);
      fixture.detectChanges();
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_SUCURSALES}/${SUCURSAL_ID}/personal`);
      expect(peticion.request.body).toEqual(
        jasmine.objectContaining({
          rol: 'CAJERO',
          usuarioExistente: jasmine.objectContaining({ usuarioId: 'usuario-9' }),
        }),
      );
      expect(peticion.request.body.cuenta).toBeUndefined();
      peticion.flush(PERSONAL_ASIGNADO);
      http.expectOne(`${API_SUCURSALES}/${SUCURSAL_ID}/personal`).flush([PERSONAL_ADMIN, PERSONAL_CAJERO, PERSONAL_ASIGNADO]);
      fixture.detectChanges();

      expect(primerAviso()).toBe('Lucía Ramírez quedó asignado a la sucursal. Le llegará un correo para que vuelva a iniciar sesión.');
    });
  });
});
