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
    opciones: [{ texto: 'Billetera digital', ruta: '/panel/cartera', icono: 'cartera', roles: ['CLIENTE'] }],
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
