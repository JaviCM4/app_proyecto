import { Rol } from '../../core/models/auth.model';
import { rolPrincipal } from '../../shared/constants/roles';

export interface OpcionMenu {
  texto: string;
  ruta: string;
  icono: string;
  /** Roles que ven la opción. Vacío = todos los que tienen sesión. */
  roles: Rol[];
  /** Roles que NO la ven aunque tengan uno de `roles`. */
  excepto?: Rol[];
  /** Solo si el rol principal de la cuenta está en la lista (igual que data.rolesPrincipales en la ruta). */
  soloPrincipales?: Rol[];
}

export interface GrupoMenu {
  titulo: string;
  opciones: OpcionMenu[];
}

const SISTEMA: Rol[] = ['ADMIN_SISTEMA'];
const SUCURSAL: Rol[] = ['ADMIN_SUCURSAL'];
const VENTANILLA: Rol[] = ['CAJERO', 'ADMIN_SUCURSAL'];
const CLIENTE: Rol[] = ['CLIENTE'];

/**
 * Menú del panel: cada cuenta ve la suma de las opciones de todos sus roles.
 * - Todos: Inicio, Mi perfil y Seguridad.
 * - Cliente: Servicios (billetera, comprar boletos, solicitar alquiler) y Mis compras. Cualquier cuenta
 *   con el rol Cliente las ve, sea o no personal (cajero, administrador o piloto que también es cliente).
 * - Cajero: Vender boletos, Ventas, Reembolsos, Órdenes de alquiler y Solicitar alquiler (propio o de
 *   otra persona).
 * - Administrador de sucursal: Mi sucursal, Operación, Taller, Reportes y todo lo del cajero.
 * - Administrador del sistema: Administración y Reportes.
 * - Piloto: Mis viajes.
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
    titulo: 'Servicios',
    opciones: [
      // Cliente: su billetera y sus compras.
      { texto: 'Billetera digital', ruta: '/panel/cartera', icono: 'cartera', roles: CLIENTE },
      { texto: 'Comprar boletos', ruta: '/panel/comprar', icono: 'boleto', roles: CLIENTE },
      // Cliente: para sí. Cajero y administrador de sucursal: para sí o para otra persona (datos a mano).
      { texto: 'Solicitar alquiler', ruta: '/panel/solicitar-alquiler', icono: 'taller', roles: ['CLIENTE', 'CAJERO', 'ADMIN_SUCURSAL'] },
      // Personal de ventanilla.
      { texto: 'Vender boletos', ruta: '/panel/mostrador', icono: 'boleto', roles: VENTANILLA },
      { texto: 'Ventas', ruta: '/panel/ventas', icono: 'reporte', roles: VENTANILLA },
      // Devolución del efectivo de una compra cancelada (el admin del sistema solo consulta).
      { texto: 'Reembolsos', ruta: '/panel/reembolsos', icono: 'cartera', roles: ['CAJERO', 'ADMIN_SUCURSAL', 'ADMIN_SISTEMA'] },
      { texto: 'Órdenes de alquiler', ruta: '/panel/ordenes', icono: 'tarifa', roles: VENTANILLA },
    ],
  },
  {
    titulo: 'Mis compras',
    opciones: [
      { texto: 'Mis boletos', ruta: '/panel/mis-compras', icono: 'boleto', roles: CLIENTE },
      { texto: 'Mis alquileres', ruta: '/panel/mis-alquileres', icono: 'taller', roles: CLIENTE },
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
  if (opcion.excepto?.some((rol) => roles.includes(rol))) return false;
  if (opcion.soloPrincipales) {
    const principal = rolPrincipal(roles);
    if (principal === null || !opcion.soloPrincipales.includes(principal)) return false;
  }
  return opcion.roles.length === 0 || opcion.roles.some((rol) => roles.includes(rol));
}

/** Opciones visibles agrupadas (los grupos vacíos no se muestran). */
export function menuPara(roles: Rol[]): GrupoMenu[] {
  return MENU.map((g) => ({ ...g, opciones: g.opciones.filter((o) => puedeVer(o, roles)) })).filter((g) => g.opciones.length > 0);
}
