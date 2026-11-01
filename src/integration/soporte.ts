import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { Sesion, UsuarioSesion } from '../app/core/models/auth.model';

/**
 * Apoyo común de las pruebas de integración.
 * Las pruebas usan componentes y servicios reales; solo el HTTP y la navegación se simulan.
 */

export const API = environment.apiUrl;
export const API_IDENTITY = `${API}/identity`;
export const API_AUTH = `${API_IDENTITY}/auth`;
export const TOKEN = 'token-de-prueba';
export const TOKEN_REFRESCO = 'refresco-de-prueba';
export const CORREO = 'ana@pruebas.gt';
export const NOMBRE = 'Ana Pérez';
export const USUARIO_ID = 'usuario-1';
export const SUCURSAL_ID = 'sucursal-1';

export const USUARIO: UsuarioSesion = {
  usuarioId: USUARIO_ID,
  correo: CORREO,
  nombre: NOMBRE,
  roles: ['CLIENTE'],
  sucursalId: null,
  choferId: null,
  fotoUrl: null,
  perfilCompleto: true,
};

export const SESION: Sesion = {
  tokenAcceso: TOKEN,
  tipo: 'Bearer',
  expiraEn: '2026-11-01T10:00:00-06:00',
  tokenRefresco: TOKEN_REFRESCO,
  usuarioId: USUARIO_ID,
  usuario: USUARIO,
};

/** Configura TestBed con HTTP simulado y un router vacío. */
export function configurarIntegracion(): void {
  localStorage.clear();
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
}

/** Deja una sesión guardada como la que deja el login. */
export function guardarSesion(usuario: UsuarioSesion = USUARIO): void {
  localStorage.setItem('token', TOKEN);
  localStorage.setItem('tokenRefresco', TOKEN_REFRESCO);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

/** Crea el componente y dibuja su plantilla. */
export function abrir<T>(componente: Type<T>): ComponentFixture<T> {
  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  return fixture;
}

/** Escribe en un campo y lo marca como tocado, como haría el usuario. */
export function escribir(fixture: ComponentFixture<unknown>, selector: string, valor: string): void {
  const campo = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  campo.value = valor;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}

/** Pulsa el botón de enviar del formulario. */
export function enviar(fixture: ComponentFixture<unknown>): void {
  const boton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  boton.click();
  fixture.detectChanges();
}

/** Atajo para inyectar el controlador de HTTP. */
export function controlador(): HttpTestingController {
  return TestBed.inject(HttpTestingController);
}

/** Atajo para espiar la navegación del router. */
export function espiarNavegacion(): Router {
  const router = TestBed.inject(Router);
  spyOn(router, 'navigateByUrl').and.resolveTo(true);
  return router;
}
