import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { invitadoGuard } from './core/guards/invitado.guard';
import { rolGuard } from './core/guards/rol.guard';

/**
 * Rutas de la aplicación.
 * - Layout público: inicio con viajes, login, registro y recuperación.
 * - Layout del panel (con sesión): menú lateral y las páginas según el rol.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/publico/layout-publico.component').then((m) => m.LayoutPublicoComponent),
    children: [
      { path: '', title: 'Viajes', loadComponent: () => import('./paginas/publico/inicio/inicio.component').then((m) => m.InicioComponent) },
      { path: 'login', title: 'Entrar', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/login/login.component').then((m) => m.LoginComponent) },
      { path: 'registro', title: 'Crear cuenta', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/registro/registro.component').then((m) => m.RegistroComponent) },
      { path: 'verificar', title: 'Verificar código', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/verificar-codigo/verificar-codigo.component').then((m) => m.VerificarCodigoComponent) },
      { path: 'recuperar', title: 'Recuperar contraseña', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/recuperar/recuperar.component').then((m) => m.RecuperarComponent) },
      // Enlace de los correos de activación y recuperación: FRONTEND_URL/restablecer?token=...
      { path: 'restablecer', title: 'Crear contraseña', loadComponent: () => import('./paginas/auth/restablecer/restablecer.component').then((m) => m.RestablecerComponent) },
      // Regreso del inicio con Google (Identity redirige a OAUTH_FRONTEND_URL/oauth/google/callback?ticket=...).
      { path: 'oauth/google/callback', title: 'Entrando con Google', loadComponent: () => import('./paginas/auth/google-callback/google-callback.component').then((m) => m.GoogleCallbackComponent) },
    ],
  },
  {
    path: 'panel',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/privado/layout-privado.component').then((m) => m.LayoutPrivadoComponent),
    children: [
      { path: '', title: 'Inicio', loadComponent: () => import('./paginas/panel/inicio/panel-inicio.component').then((m) => m.PanelInicioComponent) },
      {
        path: 'sucursales',
        title: 'Sucursales',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SISTEMA'] },
        loadComponent: () => import('./paginas/sucursales/lista/sucursales-lista.component').then((m) => m.SucursalesListaComponent),
      },
      {
        path: 'usuarios',
        title: 'Usuarios',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SISTEMA'] },
        loadComponent: () => import('./paginas/usuarios/lista/usuarios-lista.component').then((m) => m.UsuariosListaComponent),
      },
      {
        path: 'tarifas',
        title: 'Tarifas de depreciación',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/tarifas/tarifas.component').then((m) => m.TarifasComponent),
      },
      {
        path: 'reportes',
        title: 'Reportes',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      {
        path: 'cartera',
        title: 'Billetera digital',
        canActivate: [rolGuard],
        data: { roles: ['CLIENTE'] },
        loadComponent: () => import('./paginas/cuenta/cartera/cartera.component').then((m) => m.CarteraComponent),
      },
      { path: 'perfil', title: 'Mi perfil', loadComponent: () => import('./paginas/cuenta/perfil/perfil.component').then((m) => m.PerfilComponent) },
      { path: 'seguridad', title: 'Seguridad', loadComponent: () => import('./paginas/cuenta/seguridad/seguridad.component').then((m) => m.SeguridadComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
