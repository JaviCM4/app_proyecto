import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { DesafioDobleFactor, Sesion, UsuarioSesion } from '../app/core/models/auth.model';
import { AuthService } from '../app/core/services/auth.service';
import { ToastService } from '../app/shared/services/toast.service';
import { CompletarPerfilComponent } from '../app/paginas/auth/completar-perfil/completar-perfil.component';
import { GoogleCallbackComponent } from '../app/paginas/auth/google-callback/google-callback.component';
import { LoginComponent } from '../app/paginas/auth/login/login.component';
import { RecuperarComponent } from '../app/paginas/auth/recuperar/recuperar.component';
import { RegistroComponent } from '../app/paginas/auth/registro/registro.component';
import { RestablecerComponent } from '../app/paginas/auth/restablecer/restablecer.component';
import { VerificarCodigoComponent } from '../app/paginas/auth/verificar-codigo/verificar-codigo.component';

/**
 * Pruebas de integración del acceso: formularios reales, AuthService real y HTTP simulado.
 * Convención: Dado / Cuando / Entonces (flujo completo, sin AAA).
 */

const API_AUTH = `${environment.apiUrl}/identity/auth`;
const API_IDENTITY = `${environment.apiUrl}/identity`;
const CORREO = 'ana@pruebas.gt';
const CONTRASENA = 'secreta123';
const CONTRASENA_NUEVA = 'nuevaClave123';
const CODIGO = '123456';
const TOKEN = 'token-de-prueba';
const TICKET = 'ticket-de-prueba';
const DPI = '1234567890101';
const TELEFONO = '55555555';
const DIRECCION = 'Calle Real 1-23, Xela';
const NOMBRE = 'Ana Pérez';
const MENSAJE_CODIGO = 'Te enviamos un código de 6 dígitos a tu correo.';

const USUARIO: UsuarioSesion = {
  usuarioId: 'usuario-1',
  correo: CORREO,
  nombre: NOMBRE,
  roles: ['CLIENTE'],
  sucursalId: null,
  choferId: null,
  fotoUrl: null,
  perfilCompleto: true,
};

const SESION: Sesion = {
  tokenAcceso: TOKEN,
  tipo: 'Bearer',
  expiraEn: '2026-11-01T10:00:00-06:00',
  tokenRefresco: 'refresco-de-prueba',
  usuarioId: USUARIO.usuarioId,
  usuario: USUARIO,
};

const DESAFIO: DesafioDobleFactor = {
  usuarioId: USUARIO.usuarioId,
  correo: CORREO,
  expiraEn: '2026-11-01T10:10:00-06:00',
};

function abrir<T>(componente: Type<T>): ComponentFixture<T> {
  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  return fixture;
}

function escribir(fixture: ComponentFixture<unknown>, selector: string, valor: string): void {
  const campo = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
  campo.dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}

function enviar(fixture: ComponentFixture<unknown>): void {
  const boton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  boton.click();
  fixture.detectChanges();
}

function guardarSesion(perfilCompleto = true): void {
  localStorage.setItem('token', TOKEN);
  localStorage.setItem('tokenRefresco', SESION.tokenRefresco);
  localStorage.setItem('usuario', JSON.stringify({ ...USUARIO, perfilCompleto }));
}

describe('Integración: acceso y cuenta', () => {
  let http: HttpTestingController;
  let router: Router;
  let avisos: ToastService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    avisos = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('login', () => {
    it('entra con correo y contraseña y va al panel', () => {
      // Dado
      const fixture = abrir(LoginComponent);

      // Cuando
      escribir(fixture, '#correo', CORREO);
      escribir(fixture, '#contrasena', CONTRASENA);
      enviar(fixture);

      // Entonces
      const peticion = http.expectOne(`${API_AUTH}/login`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ correo: CORREO, contrasena: CONTRASENA });
      peticion.flush(SESION);
      expect(localStorage.getItem('token')).toBe(TOKEN);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/panel');
    });

    it('pide el código de 6 dígitos cuando la cuenta tiene doble factor', () => {
      // Dado
      const fixture = abrir(LoginComponent);

      // Cuando
      escribir(fixture, '#correo', CORREO);
      escribir(fixture, '#contrasena', CONTRASENA);
      enviar(fixture);
      http.expectOne(`${API_AUTH}/login`).flush(DESAFIO);

      // Entonces
      expect(avisos.avisos()[0].texto).toBe(MENSAJE_CODIGO);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/verificar');
    });

    it('muestra el mensaje del backend cuando las credenciales fallan', () => {
      // Dado
      const fixture = abrir(LoginComponent);

      // Cuando
      escribir(fixture, '#correo', CORREO);
      escribir(fixture, '#contrasena', 'incorrecta');
      enviar(fixture);
      http.expectOne(`${API_AUTH}/login`).flush(
        { codigo: 'CREDENCIALES', mensaje: 'Correo o contraseña incorrectos.' },
        { status: 401, statusText: 'Unauthorized' },
      );

      // Entonces
      expect(avisos.avisos()[0].texto).toBe('Correo o contraseña incorrectos.');
      expect(fixture.componentInstance.enviando()).toBeFalse();
    });

    it('no llama al servidor con el formulario vacío', () => {
      // Dado
      const fixture = abrir(LoginComponent);

      // Cuando
      enviar(fixture);

      // Entonces
      http.expectNone(`${API_AUTH}/login`);
      expect(fixture.componentInstance.form.controls.correo.touched).toBeTrue();
    });
  });

  describe('registro', () => {
    function llenar(fixture: ComponentFixture<RegistroComponent>): void {
      fixture.componentInstance.form.setValue({
        nombres: 'Ana',
        apellidos: 'Pérez',
        correo: CORREO,
        contrasena: CONTRASENA,
        dpi: DPI,
        nit: '1234567-8',
        telefono: TELEFONO,
        direccion: DIRECCION,
      });
    }

    it('crea la cuenta y manda al login', () => {
      // Dado
      const fixture = abrir(RegistroComponent);
      llenar(fixture);

      // Cuando
      enviar(fixture);
      http.expectOne(`${API_AUTH}/registro`).flush({}, { status: 201, statusText: 'Created' });

      // Entonces
      expect(avisos.avisos()[0].texto).toBe('Tu cuenta fue creada. Ya puedes entrar.');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });

    it('marca el campo que el backend rechaza', () => {
      // Dado
      const fixture = abrir(RegistroComponent);
      llenar(fixture);

      // Cuando
      enviar(fixture);
      http.expectOne(`${API_AUTH}/registro`).flush(
        { codigo: 'DATOS_INVALIDOS', mensaje: 'Revisa los datos.', errores: [{ campo: 'correo', mensaje: 'Ese correo ya está registrado.' }] },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.form.controls.correo.errors?.['servidor']).toBe('Ese correo ya está registrado.');
      expect((fixture.nativeElement.querySelector('#correo') as HTMLElement).className).toContain('invalido');
    });
  });

  describe('recuperar contraseña', () => {
    it('envía el enlace y muestra la confirmación', () => {
      // Dado
      const fixture = abrir(RecuperarComponent);

      // Cuando
      escribir(fixture, '#correo', CORREO);
      enviar(fixture);
      http.expectOne(`${API_AUTH}/recuperar`).flush(null);

      // Entonces
      fixture.detectChanges();
      expect(fixture.componentInstance.enviado()).toBeTrue();
      expect((fixture.nativeElement.querySelector('.descripcion') as HTMLElement).textContent).toContain('te llegará un enlace');
    });

    it('no envía un correo inválido', () => {
      // Dado
      const fixture = abrir(RecuperarComponent);

      // Cuando
      escribir(fixture, '#correo', 'sin-arroba');
      enviar(fixture);

      // Entonces
      http.expectNone(`${API_AUTH}/recuperar`);
      expect(fixture.componentInstance.enviando()).toBeFalse();
    });
  });

  describe('restablecer contraseña', () => {
    it('guarda la contraseña nueva y manda al login', () => {
      // Dado
      const fixture = abrir(RestablecerComponent);
      fixture.componentRef.setInput('token', TOKEN);
      fixture.detectChanges();

      // Cuando
      escribir(fixture, '#nueva', CONTRASENA_NUEVA);
      escribir(fixture, '#confirmacion', CONTRASENA_NUEVA);
      enviar(fixture);
      const peticion = http.expectOne(`${API_AUTH}/restablecer`);
      expect(peticion.request.body).toEqual({ token: TOKEN, nuevaContrasena: CONTRASENA_NUEVA });
      peticion.flush(null);

      // Entonces
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });

    it('avisa cuando las contraseñas no coinciden', () => {
      // Dado
      const fixture = abrir(RestablecerComponent);
      fixture.componentRef.setInput('token', TOKEN);
      fixture.detectChanges();

      // Cuando
      escribir(fixture, '#nueva', CONTRASENA_NUEVA);
      escribir(fixture, '#confirmacion', 'otraClave123');
      enviar(fixture);
      fixture.detectChanges();

      // Entonces
      http.expectNone(`${API_AUTH}/restablecer`);
      expect((fixture.nativeElement.querySelector('.error') as HTMLElement).textContent).toContain('no coinciden');
    });

    it('pide abrir el enlace cuando falta el token', () => {
      // Dado
      const fixture = abrir(RestablecerComponent);

      // Cuando
      const texto = (fixture.nativeElement.querySelector('.descripcion') as HTMLElement).textContent ?? '';

      // Entonces
      expect(texto).toContain('enlace está incompleto');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
  });

  describe('verificar código', () => {
    it('completa el login y vuelve a la página pedida', () => {
      // Dado
      const auth = TestBed.inject(AuthService);
      auth.desafio = DESAFIO;
      sessionStorage.setItem('transporte.volver', '/panel/mis-compras');
      const fixture = abrir(VerificarCodigoComponent);

      // Cuando
      escribir(fixture, '#codigo', CODIGO);
      enviar(fixture);
      http.expectOne(`${API_AUTH}/login/verificar`).flush(SESION);

      // Entonces
      expect(localStorage.getItem('token')).toBe(TOKEN);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/panel/mis-compras');
    });

    it('regresa al login cuando no hay desafío pendiente', () => {
      // Dado
      const auth = TestBed.inject(AuthService);
      auth.desafio = null;

      // Cuando
      abrir(VerificarCodigoComponent);

      // Entonces
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });
  });

  describe('completar perfil', () => {
    it('guarda los datos y deja entrar al panel', () => {
      // Dado
      guardarSesion(false);
      const fixture = abrir(CompletarPerfilComponent);

      // Cuando
      escribir(fixture, '#cp-dpi', DPI);
      escribir(fixture, '#cp-telefono', TELEFONO);
      escribir(fixture, '#cp-direccion', DIRECCION);
      enviar(fixture);
      http.expectOne(`${API_IDENTITY}/perfil/completar`).flush({ ...USUARIO, perfilCompleto: true });

      // Entonces
      expect(router.navigateByUrl).toHaveBeenCalledWith('/panel', { replaceUrl: true });
      expect(fixture.componentInstance.auth.usuario()?.perfilCompleto).toBeTrue();
    });

    it('deja pasar cuando el perfil ya estaba completo en otra pestaña', () => {
      // Dado
      guardarSesion(false);
      const fixture = abrir(CompletarPerfilComponent);

      // Cuando
      escribir(fixture, '#cp-dpi', DPI);
      escribir(fixture, '#cp-telefono', TELEFONO);
      escribir(fixture, '#cp-direccion', DIRECCION);
      enviar(fixture);
      http.expectOne(`${API_IDENTITY}/perfil/completar`).flush(
        { codigo: 'PERFIL_YA_COMPLETO', mensaje: 'El perfil ya está completo.' },
        { status: 409, statusText: 'Conflict' },
      );

      // Entonces
      expect(router.navigateByUrl).toHaveBeenCalledWith('/panel', { replaceUrl: true });
    });

    it('marca el DPI cuando ya pertenece a otra cuenta', () => {
      // Dado
      guardarSesion(false);
      const fixture = abrir(CompletarPerfilComponent);

      // Cuando
      escribir(fixture, '#cp-dpi', DPI);
      escribir(fixture, '#cp-telefono', TELEFONO);
      escribir(fixture, '#cp-direccion', DIRECCION);
      enviar(fixture);
      http.expectOne(`${API_IDENTITY}/perfil/completar`).flush(
        { codigo: 'DPI_EN_USO', mensaje: 'Ese DPI ya está en uso.' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.errorServidor('dpi')).toBe('Ese DPI ya está en uso.');
    });

    it('cierra la sesión de la cuenta equivocada', () => {
      // Dado
      guardarSesion(false);
      const fixture = abrir(CompletarPerfilComponent);

      // Cuando
      (fixture.nativeElement.querySelector('.enlace') as HTMLButtonElement).click();
      http.expectOne(`${API_AUTH}/cerrar-sesion`).flush(null);

      // Entonces
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('regreso de Google', () => {
    it('canjea el ticket y entra al panel', () => {
      // Dado
      const fixture = TestBed.createComponent(GoogleCallbackComponent);
      fixture.componentRef.setInput('ticket', TICKET);

      // Cuando
      fixture.detectChanges();
      const peticion = http.expectOne(`${API_AUTH}/oauth2/canjear`);
      expect(peticion.request.body).toEqual({ ticket: TICKET });
      peticion.flush(SESION);

      // Entonces
      expect(router.navigateByUrl).toHaveBeenCalledWith('/panel', { replaceUrl: true });
    });

    it('muestra el mensaje del código de error de Google', () => {
      // Dado
      const fixture = TestBed.createComponent(GoogleCallbackComponent);
      fixture.componentRef.setInput('error', 'OAUTH_TICKET_INVALIDO');

      // Cuando
      fixture.detectChanges();

      // Entonces
      expect(fixture.componentInstance.problema()).toContain('El acceso venció');
      expect((fixture.nativeElement.querySelector('h1') as HTMLElement).textContent).toContain('No se pudo entrar');
    });
  });
});
