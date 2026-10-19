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
 * Rol principal que ve las pantallas de cliente: el cliente y el administrador de sucursal (que también
 * es cliente: compra, recarga y alquila para sí). El resto del personal no las ve.
 */
const VEN_CLIENTE: Rol[] = ['CLIENTE', 'ADMIN_SUCURSAL'];

/**
 * Menú del panel según los roles de la cuenta:
 * - Administrador del sistema: Administración y Reportes.
 * - Administrador de sucursal: Mi sucursal, Operación, Taller, Reportes, Servicios (los de cajero y los
 *   de cliente) y Mis compras: también atiende ventanilla y compra o alquila para sí.
 * - Cajero: Servicios de ventanilla y Solicitar alquiler.
 * - Piloto: Mis viajes.
 * - "Servicios" junta la tienda: comprar/vender boletos y alquileres. "Mis compras" es el historial.
 * Todas las cuentas tienen el rol Cliente, así que las opciones de cliente llevan
 * `soloPrincipales: VEN_CLIENTE` para que el resto del personal no las vea.
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
      { texto: 'Billetera digital', ruta: '/panel/cartera', icono: 'cartera', roles: CLIENTE, soloPrincipales: VEN_CLIENTE },
      { texto: 'Comprar boletos', ruta: '/panel/comprar', icono: 'boleto', roles: CLIENTE, soloPrincipales: VEN_CLIENTE },
      // Cajero y administrador de sucursal lo piden para sí o para otra persona (datos a mano).
      { texto: 'Solicitar alquiler', ruta: '/panel/solicitar-alquiler', icono: 'taller', roles: ['CLIENTE', 'CAJERO', 'ADMIN_SUCURSAL'], soloPrincipales: ['CLIENTE', 'CAJERO', 'ADMIN_SUCURSAL'] },
      // Personal de ventanilla.
      { texto: 'Vender boletos', ruta: '/panel/mostrador', icono: 'boleto', roles: VENTANILLA },
      { texto: 'Ventas', ruta: '/panel/ventas', icono: 'reporte', roles: VENTANILLA },
      { texto: 'Órdenes de alquiler', ruta: '/panel/ordenes', icono: 'tarifa', roles: VENTANILLA },
    ],
  },
  {
    titulo: 'Mis compras',
    opciones: [
      { texto: 'Mis boletos', ruta: '/panel/mis-compras', icono: 'boleto', roles: CLIENTE, soloPrincipales: VEN_CLIENTE },
      { texto: 'Mis alquileres', ruta: '/panel/mis-alquileres', icono: 'taller', roles: CLIENTE, soloPrincipales: VEN_CLIENTE },
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
