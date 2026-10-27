import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { invitadoGuard } from './core/guards/invitado.guard';
import { perfilCompletoGuard, perfilPendienteGuard } from './core/guards/perfil-completo.guard';
import { rolGuard } from './core/guards/rol.guard';

/**
 * Rutas de la aplicación.
 * - Layout público: inicio con viajes, login, registro y recuperación.
 * - Layout del panel (con sesión): menú lateral y las páginas según el rol (los mismos roles que en
 *   layout/menu-lateral/menu.config.ts). Todas las cuentas tienen el rol CLIENTE: las páginas de cliente
 *   (comprar, billetera, alquileres) son para todos.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/publico/layout-publico.component').then((m) => m.LayoutPublicoComponent),
    children: [
      { path: '', title: 'Viajes', loadComponent: () => import('./paginas/publico/inicio/inicio.component').then((m) => m.InicioComponent) },
      // Misma página de compra para invitados y clientes: sin sesión se deja elegir todo y al pagar se pide entrar.
      { path: 'comprar', title: 'Comprar boletos', canActivate: [perfilCompletoGuard], loadComponent: () => import('./paginas/compras/comprar/comprar.component').then((m) => m.ComprarComponent) },
      { path: 'login', title: 'Entrar', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/login/login.component').then((m) => m.LoginComponent) },
      { path: 'registro', title: 'Crear cuenta', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/registro/registro.component').then((m) => m.RegistroComponent) },
      { path: 'verificar', title: 'Verificar código', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/verificar-codigo/verificar-codigo.component').then((m) => m.VerificarCodigoComponent) },
      { path: 'recuperar', title: 'Recuperar contraseña', canActivate: [invitadoGuard], loadComponent: () => import('./paginas/auth/recuperar/recuperar.component').then((m) => m.RecuperarComponent) },
      // Enlace de los correos de activación y recuperación: FRONTEND_URL/restablecer?token=...
      { path: 'restablecer', title: 'Crear contraseña', loadComponent: () => import('./paginas/auth/restablecer/restablecer.component').then((m) => m.RestablecerComponent) },
      // Cuenta creada con Google sin DPI, teléfono ni dirección: los completa antes de entrar al panel.
      {
        path: 'completar-perfil',
        title: 'Completa tu cuenta',
        canActivate: [authGuard, perfilPendienteGuard],
        loadComponent: () => import('./paginas/auth/completar-perfil/completar-perfil.component').then((m) => m.CompletarPerfilComponent),
      },
      // Regreso del inicio con Google (Identity redirige a OAUTH_FRONTEND_URL/oauth/google/callback?ticket=...).
      { path: 'oauth/google/callback', title: 'Entrando con Google', loadComponent: () => import('./paginas/auth/google-callback/google-callback.component').then((m) => m.GoogleCallbackComponent) },
    ],
  },
  {
    path: 'panel',
    canActivate: [authGuard, perfilCompletoGuard],
    loadComponent: () => import('./layout/privado/layout-privado.component').then((m) => m.LayoutPrivadoComponent),
    children: [
      { path: '', title: 'Inicio', loadComponent: () => import('./paginas/panel/inicio/panel-inicio.component').then((m) => m.PanelInicioComponent) },
      {
        // El cajero y el piloto también ven su sucursal: los datos, el equipo y sus accesos.
        path: 'mi-sucursal',
        title: 'Mi sucursal',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL', 'CAJERO', 'CHOFER'] },
        loadComponent: () => import('./paginas/sucursales/mi-sucursal/mi-sucursal.component').then((m) => m.MiSucursalComponent),
      },
      {
        path: 'billetera-sistema',
        title: 'Billetera del sistema',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SISTEMA'] },
        loadComponent: () =>
          import('./paginas/administracion/billetera-sistema/billetera-sistema.component').then((m) => m.BilleteraSistemaComponent),
      },
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
        data: { roles: ['ADMIN_SISTEMA'] },
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
        path: 'taller',
        title: 'Servicios de taller',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/taller/servicios/servicios.component').then((m) => m.ServiciosComponent),
      },
      {
        path: 'categorias',
        title: 'Categorías de gasto',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/taller/categorias/categorias.component').then((m) => m.CategoriasComponent),
      },
      {
        path: 'buses',
        title: 'Buses',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/flota/buses/buses.component').then((m) => m.BusesComponent),
      },
      {
        path: 'choferes',
        title: 'Choferes',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/flota/choferes/choferes.component').then((m) => m.ChoferesComponent),
      },
      {
        path: 'personal',
        title: 'Personal',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/flota/personal/personal.component').then((m) => m.PersonalComponent),
      },
      {
        path: 'rutas',
        title: 'Rutas',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/viajes/rutas/rutas.component').then((m) => m.RutasComponent),
      },
      {
        path: 'viajes',
        title: 'Viajes',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/viajes/viajes/viajes.component').then((m) => m.ViajesComponent),
      },
      {
        path: 'mis-viajes',
        title: 'Mis viajes',
        canActivate: [rolGuard],
        data: { roles: ['CHOFER'] },
        loadComponent: () => import('./paginas/chofer/mis-viajes/mis-viajes.component').then((m) => m.MisViajesChoferComponent),
      },
      {
        path: 'alquileres',
        title: 'Alquileres',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/viajes/alquileres/alquileres.component').then((m) => m.AlquileresComponent),
      },
      {
        // Desde "Mis compras": el alquiler es para quien lo pide y sus datos salen de su perfil.
        // Lo ve cualquier cuenta con rol Cliente, incluidos el cajero y el administrador.
        path: 'solicitar-alquiler',
        title: 'Solicitar alquiler',
        canActivate: [rolGuard],
        data: { roles: ['CLIENTE', 'CAJERO', 'ADMIN_SUCURSAL'], ventanilla: false },
        loadComponent: () =>
          import('./paginas/alquileres/solicitar-alquiler/solicitar-alquiler.component').then((m) => m.SolicitarAlquilerComponent),
      },
      {
        // Desde "Ventanilla": el mismo formulario, pero a nombre de quien llega al mostrador.
        path: 'ventanilla/alquiler',
        title: 'Alquiler en ventanilla',
        canActivate: [rolGuard],
        data: { roles: ['CAJERO', 'ADMIN_SUCURSAL'], ventanilla: true },
        loadComponent: () =>
          import('./paginas/alquileres/solicitar-alquiler/solicitar-alquiler.component').then((m) => m.SolicitarAlquilerComponent),
      },
      {
        path: 'mis-alquileres',
        title: 'Mis alquileres',
        canActivate: [rolGuard],
        data: { roles: ['CLIENTE'] },
        loadComponent: () =>
          import('./paginas/alquileres/mis-alquileres/mis-alquileres.component').then((m) => m.MisAlquileresComponent),
      },
      {
        path: 'precio-alquiler',
        title: 'Precio de alquiler',
        canActivate: [rolGuard],
        data: { roles: ['ADMIN_SISTEMA'] },
        loadComponent: () =>
          import('./paginas/alquileres/precio-alquiler/precio-alquiler.component').then((m) => m.PrecioAlquilerComponent),
      },
      {
        path: 'cartera',
        title: 'Billetera digital',
        canActivate: [rolGuard],
        data: { roles: ['CLIENTE'] },
        loadComponent: () => import('./paginas/cuenta/cartera/cartera.component').then((m) => m.CarteraComponent),
      },
      {
        path: 'comprar',
        title: 'Comprar boletos',
        canActivate: [rolGuard],
        data: { roles: ['CLIENTE'] },
        loadComponent: () => import('./paginas/compras/comprar/comprar.component').then((m) => m.ComprarComponent),
      },
      {
        path: 'mis-compras',
        title: 'Mis boletos',
        canActivate: [rolGuard],
        data: { roles: ['CLIENTE'] },
        loadComponent: () => import('./paginas/compras/mis-compras/mis-compras.component').then((m) => m.MisComprasComponent),
      },
      {
        path: 'mostrador',
        title: 'Ventanilla',
        canActivate: [rolGuard],
        data: { roles: ['CAJERO', 'ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/ventas/mostrador/mostrador.component').then((m) => m.MostradorComponent),
      },
      {
        path: 'ventas',
        title: 'Ventas',
        canActivate: [rolGuard],
        data: { roles: ['CAJERO', 'ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/ventas/ventas/ventas.component').then((m) => m.VentasComponent),
      },
      {
        // El administrador del sistema solo consulta: el efectivo lo entrega la sucursal que vendió.
        path: 'reembolsos',
        title: 'Reembolsos',
        canActivate: [rolGuard],
        data: { roles: ['CAJERO', 'ADMIN_SUCURSAL', 'ADMIN_SISTEMA'] },
        loadComponent: () => import('./paginas/ventas/reembolsos/reembolsos.component').then((m) => m.ReembolsosComponent),
      },
      {
        path: 'ordenes',
        title: 'Órdenes de alquiler',
        canActivate: [rolGuard],
        data: { roles: ['CAJERO', 'ADMIN_SUCURSAL'] },
        loadComponent: () => import('./paginas/ventas/ordenes/ordenes.component').then((m) => m.OrdenesComponent),
      },
      { path: 'perfil', title: 'Mi perfil', loadComponent: () => import('./paginas/cuenta/perfil/perfil.component').then((m) => m.PerfilComponent) },
      { path: 'seguridad', title: 'Seguridad', loadComponent: () => import('./paginas/cuenta/seguridad/seguridad.component').then((m) => m.SeguridadComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
