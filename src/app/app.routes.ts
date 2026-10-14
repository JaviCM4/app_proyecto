import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/public/home.component').then((m) => m.HomeComponent) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'registro', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent) },
  { path: 'verificar-2fa', canActivate: [guestGuard], loadComponent: () => import('./features/auth/verify-2fa.component').then((m) => m.Verify2faComponent) },
  { path: 'recuperar', canActivate: [guestGuard], loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: 'restablecer', loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'dashboard/perfil', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/perfil.component').then((m) => m.PerfilComponent) },
  { path: 'dashboard/seguridad', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/seguridad.component').then((m) => m.SeguridadComponent) },
  {
    path: 'dashboard/cartera',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['CLIENTE'] },
    loadComponent: () => import('./features/dashboard/cartera.component').then((m) => m.CarteraComponent),
  },
  {
    path: 'dashboard/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN_SISTEMA'] },
    loadComponent: () => import('./features/dashboard/usuarios.component').then((m) => m.UsuariosComponent),
  },
  {
    path: 'dashboard/tarifas',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
    loadComponent: () => import('./features/dashboard/tarifas.component').then((m) => m.TarifasComponent),
  },
  { path: '**', redirectTo: '' },
];
