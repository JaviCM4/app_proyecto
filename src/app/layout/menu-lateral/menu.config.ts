import { Rol } from '../../core/models/auth.model';
import { rolPrincipal } from '../../shared/constants/roles';

export interface OpcionMenu {
  texto: string;
  ruta: string;
  icono: string;
  /** Roles que ven la opción. Vacío = todos los que tienen sesión. */
  roles: Rol[];
  /**
   * Solo para cuentas de cliente. Todas las cuentas del sistema tienen también el rol CLIENTE
   * (para poder comprar con cartera), así que esto evita que el personal vea las opciones de cliente.
   */
  soloCliente?: boolean;
}

export interface GrupoMenu {
  titulo: string;
  opciones: OpcionMenu[];
}

/**
 * Menú del panel según el rol. Para agregar una pantalla: crea la ruta en app.routes.ts
 * (con los mismos roles en data.roles) y su opción aquí.
 */
export const MENU: GrupoMenu[] = [
  {
    titulo: 'General',
    opciones: [{ texto: 'Inicio', ruta: '/panel', icono: 'inicio', roles: [] }],
  },
  {
    titulo: 'Administración',
    opciones: [
      { texto: 'Sucursales', ruta: '/panel/sucursales', icono: 'sucursal', roles: ['ADMIN_SISTEMA'] },
      { texto: 'Usuarios', ruta: '/panel/usuarios', icono: 'usuarios', roles: ['ADMIN_SISTEMA'] },
      { texto: 'Tarifas de depreciación', ruta: '/panel/tarifas', icono: 'tarifa', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
      { texto: 'Precio de alquiler', ruta: '/panel/precio-alquiler', icono: 'tarifa', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
    ],
  },
  {
    titulo: 'Operación',
    opciones: [
      { texto: 'Buses', ruta: '/panel/buses', icono: 'bus', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
      { texto: 'Choferes', ruta: '/panel/choferes', icono: 'perfil', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
      { texto: 'Personal', ruta: '/panel/personal', icono: 'usuarios', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
      { texto: 'Rutas', ruta: '/panel/rutas', icono: 'ruta', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
      { texto: 'Viajes', ruta: '/panel/viajes', icono: 'boleto', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
      { texto: 'Mis viajes', ruta: '/panel/mis-viajes', icono: 'boleto', roles: ['CHOFER'] },
      { texto: 'Alquileres', ruta: '/panel/alquileres', icono: 'taller', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL', 'CAJERO'] },
    ],
  },
  {
    titulo: 'Taller',
    opciones: [
      { texto: 'Servicios', ruta: '/panel/taller', icono: 'taller', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
      { texto: 'Categorías', ruta: '/panel/categorias', icono: 'taller', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] },
    ],
  },
  {
    titulo: 'Reportes',
    opciones: [{ texto: 'Reportes', ruta: '/panel/reportes', icono: 'reporte', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] }],
  },
  {
    titulo: 'Mis compras',
    // Todas las cuentas tienen el rol Cliente, así que todos ven su billetera.
    // Para ocultarla al personal, agrega soloCliente: true (aquí y en la ruta).
    opciones: [
      { texto: 'Billetera digital', ruta: '/panel/cartera', icono: 'cartera', roles: ['CLIENTE'] },
      { texto: 'Comprar boletos', ruta: '/panel/comprar', icono: 'boleto', roles: ['CLIENTE'], soloCliente: true },
      { texto: 'Mis compras', ruta: '/panel/mis-compras', icono: 'boleto', roles: ['CLIENTE'], soloCliente: true },
      { texto: 'Solicitar alquiler', ruta: '/panel/solicitar-alquiler', icono: 'taller', roles: ['CLIENTE'], soloCliente: true },
      { texto: 'Mis alquileres', ruta: '/panel/mis-alquileres', icono: 'taller', roles: ['CLIENTE'], soloCliente: true },
    ],
  },
  {
    titulo: 'Ventanilla',
    opciones: [
      { texto: 'Vender boletos', ruta: '/panel/mostrador', icono: 'boleto', roles: ['CAJERO', 'ADMIN_SUCURSAL'] },
      { texto: 'Solicitar alquiler', ruta: '/panel/solicitar-alquiler', icono: 'taller', roles: ['CAJERO'] },
      { texto: 'Ventas', ruta: '/panel/ventas', icono: 'reporte', roles: ['CAJERO', 'ADMIN_SUCURSAL', 'ADMIN_SISTEMA'] },
      { texto: 'Órdenes de alquiler', ruta: '/panel/ordenes', icono: 'tarifa', roles: ['CAJERO', 'ADMIN_SUCURSAL', 'ADMIN_SISTEMA'] },
    ],
  },
  {
    titulo: 'Mi cuenta',
    opciones: [
      { texto: 'Mi perfil', ruta: '/panel/perfil', icono: 'perfil', roles: [] },
      { texto: 'Seguridad', ruta: '/panel/seguridad', icono: 'candado', roles: [] },
    ],
  },
];

/** ¿El usuario con estos roles puede ver la opción? */
export function puedeVer(opcion: OpcionMenu, roles: Rol[]): boolean {
  if (opcion.soloCliente && rolPrincipal(roles) !== 'CLIENTE') return false;
  return opcion.roles.length === 0 || opcion.roles.some((r) => roles.includes(r));
}

/** Opciones visibles agrupadas (los grupos vacíos no se muestran). */
export function menuPara(roles: Rol[]): GrupoMenu[] {
  return MENU.map((g) => ({ ...g, opciones: g.opciones.filter((o) => puedeVer(o, roles)) })).filter((g) => g.opciones.length > 0);
}
