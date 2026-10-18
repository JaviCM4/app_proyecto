import { Rol } from '../../core/models/auth.model';

export interface OpcionMenu {
  texto: string;
  ruta: string;
  icono: string;
  /** Roles que ven la opción. Vacío = todos los que tienen sesión. */
  roles: Rol[];
  /** Roles que NO la ven aunque tengan uno de `roles` (p. ej. el cajero no solicita alquileres como cliente). */
  excepto?: Rol[];
}

export interface GrupoMenu {
  titulo: string;
  opciones: OpcionMenu[];
}

const SISTEMA: Rol[] = ['ADMIN_SISTEMA'];
const SUCURSAL: Rol[] = ['ADMIN_SUCURSAL'];
const VENTANILLA: Rol[] = ['CAJERO', 'ADMIN_SUCURSAL'];

/**
 * Menú del panel según los roles de la cuenta:
 * - Administrador del sistema: Administración y Reportes.
 * - Administrador de sucursal: Mi sucursal, Operación, Taller, Reportes y Ventanilla.
 * - Cajero: Ventanilla.
 * - Piloto: Mis viajes.
 * - Todas las cuentas tienen el rol Cliente: todos ven "Mis compras" (billetera, boletos y alquileres)
 *   y "Mi cuenta".
 * Para agregar una pantalla: crea la ruta en app.routes.ts (con los mismos roles en data.roles) y su opción aquí.
 */
export const MENU: GrupoMenu[] = [
  {
    titulo: 'General',
    opciones: [
      { texto: 'Inicio', ruta: '/panel', icono: 'inicio', roles: [] },
      { texto: 'Mi sucursal', ruta: '/panel/mi-sucursal', icono: 'sucursal', roles: SUCURSAL },
    ],
  },
  {
    titulo: 'Administración',
    opciones: [
      { texto: 'Sucursales', ruta: '/panel/sucursales', icono: 'sucursal', roles: SISTEMA },
      { texto: 'Usuarios', ruta: '/panel/usuarios', icono: 'usuarios', roles: SISTEMA },
      { texto: 'Billetera del sistema', ruta: '/panel/billetera-sistema', icono: 'banco', roles: SISTEMA },
      { texto: 'Tarifas de depreciación', ruta: '/panel/tarifas', icono: 'tarifa', roles: SISTEMA },
      { texto: 'Precio de alquiler', ruta: '/panel/precio-alquiler', icono: 'tarifa', roles: SISTEMA },
      { texto: 'Categorías de gasto', ruta: '/panel/categorias', icono: 'taller', roles: SISTEMA },
    ],
  },
  {
    titulo: 'Operación',
    opciones: [
      { texto: 'Buses', ruta: '/panel/buses', icono: 'bus', roles: SUCURSAL },
      { texto: 'Choferes', ruta: '/panel/choferes', icono: 'perfil', roles: SUCURSAL },
      { texto: 'Personal', ruta: '/panel/personal', icono: 'usuarios', roles: SUCURSAL },
      { texto: 'Rutas', ruta: '/panel/rutas', icono: 'ruta', roles: SUCURSAL },
      { texto: 'Viajes', ruta: '/panel/viajes', icono: 'boleto', roles: SUCURSAL },
      { texto: 'Alquileres', ruta: '/panel/alquileres', icono: 'taller', roles: SUCURSAL },
    ],
  },
  {
    titulo: 'Piloto',
    opciones: [{ texto: 'Mis viajes', ruta: '/panel/mis-viajes', icono: 'ruta', roles: ['CHOFER'] }],
  },
  {
    titulo: 'Taller',
    opciones: [
      { texto: 'Servicios', ruta: '/panel/taller', icono: 'taller', roles: SUCURSAL },
      { texto: 'Categorías', ruta: '/panel/categorias', icono: 'taller', roles: SUCURSAL },
    ],
  },
  {
    titulo: 'Reportes',
    opciones: [{ texto: 'Reportes', ruta: '/panel/reportes', icono: 'reporte', roles: ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL'] }],
  },
  {
    titulo: 'Ventanilla',
    opciones: [
      { texto: 'Vender boletos', ruta: '/panel/mostrador', icono: 'boleto', roles: VENTANILLA },
      // En el backend, un alquiler que solicita un cajero es siempre de mostrador.
      { texto: 'Solicitar alquiler', ruta: '/panel/solicitar-alquiler', icono: 'taller', roles: ['CAJERO'] },
      { texto: 'Ventas', ruta: '/panel/ventas', icono: 'reporte', roles: VENTANILLA },
      { texto: 'Órdenes de alquiler', ruta: '/panel/ordenes', icono: 'tarifa', roles: VENTANILLA },
    ],
  },
  {
    titulo: 'Mis compras',
    opciones: [
      { texto: 'Billetera digital', ruta: '/panel/cartera', icono: 'cartera', roles: ['CLIENTE'] },
      { texto: 'Comprar boletos', ruta: '/panel/comprar', icono: 'boleto', roles: ['CLIENTE'] },
      { texto: 'Mis compras', ruta: '/panel/mis-compras', icono: 'boleto', roles: ['CLIENTE'] },
      { texto: 'Solicitar alquiler', ruta: '/panel/solicitar-alquiler', icono: 'taller', roles: ['CLIENTE'], excepto: ['CAJERO'] },
      { texto: 'Mis alquileres', ruta: '/panel/mis-alquileres', icono: 'taller', roles: ['CLIENTE'] },
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
  if (opcion.excepto?.some((r) => roles.includes(r))) return false;
  return opcion.roles.length === 0 || opcion.roles.some((r) => roles.includes(r));
}

/** Opciones visibles agrupadas (los grupos vacíos no se muestran). */
export function menuPara(roles: Rol[]): GrupoMenu[] {
  return MENU.map((g) => ({ ...g, opciones: g.opciones.filter((o) => puedeVer(o, roles)) })).filter((g) => g.opciones.length > 0);
}
